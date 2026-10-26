import re
import logging
from difflib import SequenceMatcher

import requests
import pytesseract
from PIL import Image
from io import BytesIO

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Zimbabwean national ID: 63-1234567-A-42 (2 digits - 7 digits - letter - 2 digits)
# Older format: 63-1234567-A-00
ZW_ID_PATTERN = re.compile(
    r"\b(\d{2})\s*[-–]?\s*(\d{6,7})\s*[-–]?\s*([A-Z])\s*[-–]?\s*(\d{2})\b",
    re.IGNORECASE,
)

# OCR commonly confuses these — used for fuzzy comparison
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
    return [m.group(0) for m in ZW_ID_PATTERN.finditer(text or "")]


def similarity(a: str, b: str) -> float:
    """0..1 similarity, tolerant of the OCR confusions above."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    # Cheap normalization: treat common OCR confusions as equal
    def _norm(s):
        return "".join(OCR_CONFUSIONS.get(c, c) for c in s)
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def download_image(url: str, headers: dict | None = None) -> bytes:
    resp = requests.get(url, timeout=30, headers=headers or {})
    resp.raise_for_status()
    return resp.content


def ocr_image_bytes(image_bytes: bytes) -> str:
    """Run Tesseract with settings tuned for ID cards."""
    img = Image.open(BytesIO(image_bytes))
    # Upscale small images — Tesseract does much better on >=300 DPI-ish
    if max(img.size) < 1200:
        scale = 1200 / max(img.size)
        img = img.resize((int(img.width * scale), int(img.height * scale)))
    img = img.convert("L")  # grayscale helps
    config = "--oem 3 --psm 6"  # assume uniform block of text
    return pytesseract.image_to_string(img, config=config)


def verify_id_from_image(person, image_url: str, *, threshold: float = 0.85):
    """
    Attempt to auto-verify a person's national_id against an uploaded ID image.

    Returns a dict:
        {
            "auto_verified": bool,
            "needs_manual_review": bool,
            "score": float | None,
            "reason": str,
        }
    """
    person.id_verification_attempted_at = timezone.now()
    person.id_verification_method = 'ocr'

    if not person.national_id:
        person.needs_manual_review = True
        person.save(update_fields=[
            'id_verification_attempted_at', 'id_verification_method',
            'needs_manual_review',
        ])
        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": "No national ID on file — cannot auto-verify.",
        }

    try:
        headers = {}
        if getattr(settings, "WHAPI_TOKEN", None):
            headers["Authorization"] = f"Bearer {settings.WHAPI_TOKEN}"
        image_bytes = download_image(image_url, headers=headers)
    except Exception as e:
        logger.exception("Failed to download ID image for %s", person.phone_number)
        person.needs_manual_review = True
        person.save(update_fields=[
            'id_verification_attempted_at', 'id_verification_method',
            'needs_manual_review',
        ])
        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": f"Image download failed: {e}",
        }

    try:
        raw_text = ocr_image_bytes(image_bytes)
    except Exception as e:
        logger.exception("OCR failed for %s", person.phone_number)
        person.id_verification_raw_text = ""
        person.needs_manual_review = True
        person.save(update_fields=[
            'id_verification_attempted_at', 'id_verification_method',
            'id_verification_raw_text', 'needs_manual_review',
        ])
        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": None,
            "reason": f"OCR failed: {e}",
        }

    person.id_verification_raw_text = raw_text[:5000]

    candidates = extract_ids_from_text(raw_text)
    target = normalize_id(person.national_id)

    if not candidates:
        person.needs_manual_review = True
        person.save(update_fields=[
            'id_verification_attempted_at', 'id_verification_method',
            'id_verification_raw_text', 'needs_manual_review',
        ])
        return {
            "auto_verified": False,
            "needs_manual_review": True,
            "score": 0.0,
            "reason": "No ID number detected in image.",
        }

    best_score = 0.0
    best_candidate = None
    for cand in candidates:
        s = similarity(normalize_id(cand), target)
        if s > best_score:
            best_score = s
            best_candidate = cand

    person.id_verification_score = round(best_score, 3)

    if best_score >= threshold:
        person.is_auto_verified = True
        person.needs_manual_review = False
        person.is_verified = True  # if you want OCR success to count as verified
        person.verification_status = 'verified'
        person.save(update_fields=[
            'id_verification_attempted_at', 'id_verification_method',
            'id_verification_raw_text', 'id_verification_score',
            'is_auto_verified', 'needs_manual_review',
            'is_verified', 'verification_status',
        ])
        return {
            "auto_verified": True,
            "needs_manual_review": False,
            "score": best_score,
            "reason": f"Matched '{best_candidate}' to '{person.national_id}'.",
        }

    # Low-confidence match → human review
    person.is_auto_verified = False
    person.needs_manual_review = True
    person.verification_status = 'manual_review'
    person.save(update_fields=[
        'id_verification_attempted_at', 'id_verification_method',
        'id_verification_raw_text', 'id_verification_score',
        'is_auto_verified', 'needs_manual_review', 'verification_status',
    ])
    return {
        "auto_verified": False,
        "needs_manual_review": True,
        "score": best_score,
        "reason": f"Best candidate '{best_candidate}' scored {best_score:.2f} < {threshold}.",
    }