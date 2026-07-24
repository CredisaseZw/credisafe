# services/identity_service.py

import requests
from difflib import SequenceMatcher
from django.conf import settings
import re


API_URL = "https://secure-fincheckzim.com/lookup-person/"

def fetch_individual(national_id: str) -> dict | None:
    try:
        # choose credentials (you can make this env-based later)
        username = settings.API_USERNAME
        token = settings.API_TOKEN

        headers = {
            "Username": username,
            "Token": token
        }

        res = requests.get(
            API_URL,
            params={"national_id": national_id},
            headers=headers,
            timeout=5
        )

        if res.status_code != 200:
            return None

        data = res.json()

        if not data.get("found"):
            return None

        return data

    except Exception:
        return None

def normalize_phone(p):
    return re.sub(r'[\s\-\+]', '', p or '')

def phone_match_score(input_phone: str, api_phone: str) -> float:
    """
    Returns similarity score for phone match (0 - 1)
    """
    input_phone = normalize_phone(input_phone)
    api_phone = normalize_phone(api_phone)

    if not input_phone or not api_phone:
        return 0.0

    # strong match
    if input_phone == api_phone:
        return 1.0

    # partial match (last 9 digits tolerance for +263/local formats)
    if input_phone[-9:] == api_phone[-9:]:
        return 0.9

    return 0.0


def similarity(a, b):
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

def compute_credit_score(data: dict) -> int:
    """
    Higher score = higher risk.
    """
    score = 0  # Default: Low Risk

    claims = data.get("claims", [])
    court_cases = data.get("court_records", [])

    # Increase score based on claims and court records
    score += len(claims) * 5
    score += len(court_cases) * 20

    total_debt = sum(float(c.get("amount", 0) or 0) for c in claims)

    if total_debt > 10000:
        score += 100
    elif total_debt > 5000:
        score += 50

    # Cap the maximum score
    return min(850, score)


def get_highest_creditor(claims: list) -> str | None:
    """
    Returns creditor with highest financial exposure
    """
    if not claims:
        return None

    top = max(claims, key=lambda x: float(x.get("amount") or 0))

    return {
        "creditor_name": top.get("company_creditor_fins__registration_name"),
        "amount": top.get("amount"),
        "currency": top.get("currency_type")
    }