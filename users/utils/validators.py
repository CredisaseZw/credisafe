import re

def normalize_national_id(id_text: str) -> str:
    return re.sub(r'[\s-]+', '', id_text).upper()


def is_valid_zim_national_id(normalized_id: str) -> bool:
    # 8 or 9 digits + 1 letter + 2 digits
    return re.match(r'^\d{8,9}[A-Z]\d{2}$', normalized_id) is not None
