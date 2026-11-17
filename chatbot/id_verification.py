
import re
import logging
from difflib import SequenceMatcher
from io import BytesIO

import requests
import pytesseract
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

from PIL import Image

from django.utils import timezone
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


# Zimbabwean national ID:
# 63-1234567-A-42
# Older format: 63-1234567-A-00

ZW_ID_PATTERN = re.compile(
    r"\b(\d{2})\s*[-–]?\s*(\d{6,7})\s*[-–]?\s*([A-Z])\s*[-–]?\s*(\d{2})\b",
    re.IGNORECASE,
)


# Common OCR character confusions

OCR_CONFUSIONS = {
    'O': '0', '0': 'O',
    'I': '1', '1': 'I',
    'l': '1',
    'S': '5', '5': 'S',
    'B': '8', '8': 'B',
    'Z': '2', '2': 'Z',
    'G': '6', '6': 'G',
}


def normalize_id(raw: str) -> str:
    """Strip whitespace/dashes and uppercase for canonical comparison."""

    if not raw:
        return ""

    return re.sub(r"[\s\-–]", "", raw).upper()


def extract_ids_from_text(text: str) -> list[str]:
    """Find all candidate Zimbabwean ID numbers in OCR text."""

    return [
        m.group(0)
        for m in ZW_ID_PATTERN.finditer(text or "")
    ]


def similarity(a: str, b: str) -> float:
    """0..1 similarity, tolerant of common OCR confusions."""

    if not a or not b:
        return 0.0

    if a == b:
        return 1.0

    def _norm(s):
        return "".join(
            OCR_CONFUSIONS.get(c, c)
            for c in s
        )

    return SequenceMatcher(
        None,
        _norm(a),
        _norm(b)
    ).ratio()


def download_image(url: str, headers: dict | None = None) -> bytes:
    """Retained for compatibility with any existing callers."""

    resp = requests.get(
        url,
        timeout=30,
        headers=headers or {},
    )

    resp.raise_for_status()

    return resp.content


def get_latest_whatsapp_image(phone_number: str):
    """
    Find the most recently modified WhatsApp image
    belonging to the supplied phone number.

    Expected filenames:

        whatsapp_images/263772219151_MEDIA_ID.jpg

    Returns:
        {
            "filename": str,
            "image_bytes": bytes
        }

        or None if no image exists.
    """

    folder = "whatsapp_images"
    prefix = f"{phone_number}_"

    try:
        directories, files = default_storage.listdir(folder)

        matching_files = [
            f"{folder}/{filename}"
            for filename in files
            if filename.startswith(prefix)
            and filename.lower().endswith(
                (".jpg", ".jpeg", ".png")
            )
        ]

        if not matching_files:
            return None

        latest_file = max(
            matching_files,
            key=lambda filename: default_storage.get_modified_time(
                filename
            ),
        )

        with default_storage.open(latest_file, "rb") as image:
            image_bytes = image.read()

        logger.info(
            "Using latest WhatsApp ID image: %s",
            latest_file,
        )

        return {
            "filename": latest_file,
            "image_bytes": image_bytes,
        }

    except Exception:
        logger.exception(
            "Failed to retrieve WhatsApp image for %s",
            phone_number,
        )

        raise


def ocr_image_bytes(image_bytes: bytes) -> str:
    """Run Tesseract with settings tuned for ID cards."""

    img = Image.open(BytesIO(image_bytes))

    # Upscale small images
    if max(img.size) < 1200:
        scale = 1200 / max(img.size)

        img = img.resize((
            int(img.width * scale),
            int(img.height * scale),
        ))

    img = img.convert("L")

    config = "--oem 3 --psm 6"

    return pytesseract.image_to_string(
        img,
        config=config,
    )


def verify_id_from_image(
    person,
    *,
    threshold: float = 0.85,
):
    """
    Automatically verify a person's Zimbabwean national ID
    against their latest downloaded WhatsApp ID image.

    Accepts:
        person: Django Person object

    Returns:
        {
            "auto_verified": bool,
            "needs_manual_review": bool,
            "score": float | None,
            "reason": str,
        }
    """

    person.id_verification_attempted_at = timezone.now()
    person.id_verification_method = 'ocr'

    # --------------------------------------------------
    # STEP 1: Check registered national ID
    # --------------------------------------------------

    if not person.national_id:

        person.needs_manual_review = True

        person.save(update_fields=[
            'id_verification_attempted_at',
            'id_verification_method',
            'needs_manual_review',
        ])

        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": "No national ID on file — cannot auto-verify.",
        }

    # --------------------------------------------------
    # STEP 2: Retrieve latest downloaded WhatsApp image
    # --------------------------------------------------

    try:

        latest_image = get_latest_whatsapp_image(
            person.phone_number
        )

        if not latest_image:
            raise FileNotFoundError(
                f"No downloaded ID image found for "
                f"{person.phone_number}"
            )

        image_bytes = latest_image["image_bytes"]

        logger.info(
            "ID verification using image %s for %s",
            latest_image["filename"],
            person.phone_number,
        )

    except Exception as e:

        logger.exception(
            "Failed to retrieve ID image for %s",
            person.phone_number,
        )

        person.needs_manual_review = True

        person.save(update_fields=[
            'id_verification_attempted_at',
            'id_verification_method',
            'needs_manual_review',
        ])

        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": f"Image download failed: {e}",
        }

    # --------------------------------------------------
    # STEP 3: Run OCR
    # --------------------------------------------------

    try:

        raw_text = ocr_image_bytes(image_bytes)

    except Exception as e:

        logger.exception(
            "OCR failed for %s",
            person.phone_number,
        )

        person.id_verification_raw_text = ""
        person.needs_manual_review = True

        person.save(update_fields=[
            'id_verification_attempted_at',
            'id_verification_method',
            'id_verification_raw_text',
            'needs_manual_review',
        ])

        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": f"OCR failed: {e}",
        }

    # Store extracted text
    person.id_verification_raw_text = raw_text[:5000]

    logger.info(
        "OCR text extracted for %s:\n%s",
        person.phone_number,
        raw_text,
    )

    # --------------------------------------------------
    # STEP 4: Extract candidate ID numbers
    # --------------------------------------------------

    candidates = extract_ids_from_text(raw_text)

    target = normalize_id(person.national_id)

    if not candidates:

        person.needs_manual_review = True

        person.save(update_fields=[
            'id_verification_attempted_at',
            'id_verification_method',
            'id_verification_raw_text',
            'needs_manual_review',
        ])

        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": 0.0,
            "reason": "No ID number detected in image.",
        }

    logger.info(
        "Detected ID candidates for %s: %s",
        person.phone_number,
        candidates,
    )

    # --------------------------------------------------
    # STEP 5: Compare detected IDs against database ID
    # --------------------------------------------------

    best_score = 0.0
    best_candidate = None

    for cand in candidates:

        s = similarity(
            normalize_id(cand),
            target,
        )

        logger.info(
            "ID comparison: candidate=%s target=%s score=%.3f",
            cand,
            target,
            s,
        )

        if s > best_score:
            best_score = s
            best_candidate = cand

    person.id_verification_score = round(
        best_score,
        3,
    )

    # --------------------------------------------------
    # STEP 6: Automatic verification
    # --------------------------------------------------

    if best_score >= threshold:

        person.is_auto_verified = True
        person.needs_manual_review = True
        person.is_verified = True
        person.verification_status = 'verified'

        person.save(update_fields=[
            'id_verification_attempted_at',
            'id_verification_method',
            'id_verification_raw_text',
            'id_verification_score',
            'is_auto_verified',
            'needs_manual_review',
            'is_verified',
            'verification_status',
        ])

        return {
            "auto_verified": True,
            "needs_manual_review": False,
            "score": best_score,
            "reason": (
                f"Matched '{best_candidate}' "
                f"to '{person.national_id}'."
            ),
        }

    # --------------------------------------------------
    # STEP 7: Low confidence - manual review
    # --------------------------------------------------

    person.is_auto_verified = False
    person.needs_manual_review = True
    person.verification_status = 'manual_review'

    person.save(update_fields=[
        'id_verification_attempted_at',
        'id_verification_method',
        'id_verification_raw_text',
        'id_verification_score',
        'is_auto_verified',
        'needs_manual_review',
        'verification_status',
    ])

    return {
        "auto_verified": False,
        "needs_manual_review": True,
        "score": best_score,
        "reason": (
            f"Best candidate '{best_candidate}' "
            f"scored {best_score:.2f} < {threshold}."
        ),
    }
