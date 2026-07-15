import re

def is_valid_zimbabwe_phone(phone: str) -> bool:
    """
    Validates Zimbabwean mobile phone numbers.

    Accepted formats:
    - 0772123456
    - 0712345678
    - 0731234567
    - 0783123456
    - +263772123456
    - 263772123456
    """
    pattern = r"^(?:\+263|263|0)(?:71|73|77|78)\d{7}$"
    return bool(re.fullmatch(pattern, phone))

def validate_name(name: str) -> bool:
    if len(name.split()) < 2 or len(name) <5:
        return False
    return True

def validate_address(address: str) -> bool:
    if len(address.split(",")) < 4 or len(address) < 5:
        return False
    return True