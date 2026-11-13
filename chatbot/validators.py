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
    if len(address.split(",")) < 3 or len(address) < 4:
        return False
    return True




def has_available_credit_check(checker):
    from decimal import Decimal
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Sum
    from django.db.models.functions import Coalesce
    from payments.models import Payment
    from credit.models import ServiceFee
    from credit.models import CreditCheck
    """
    Check whether a person has unused credit checks.

    $1 = 4 credit checks.
    Each payment is valid for one month from its payment date.
    Unused checks expire after one month.
    """
    
    # Get the credit check fee
    service_fee = ServiceFee.objects.filter(
        service_type='credit_check'
    ).order_by('-created_at').first()

    fee = service_fee.amount if service_fee else Decimal('1.00')

    if fee <= 0:
        return False

    # Get payments made within the last month
    one_month_ago = timezone.now() - timedelta(days=30)

    payments = Payment.objects.filter(
        payer=checker,
        status='COMPLETED',
        currency='USD',
        metadata__service='credit_check',
        created_at__gte=one_month_ago
    )

    total_paid = payments.aggregate(
        total=Coalesce(Sum('amount'), Decimal('0.00'))
    )['total']

    # Calculate purchased checks
    purchased_checks = int((total_paid / fee) * 4)

    # Count completed credit checks within the same month
    used_checks = CreditCheck.objects.filter(
        checker=checker,
        status='completed',
        created_at__gte=one_month_ago
    ).count()

    available_checks = purchased_checks - used_checks

    return available_checks > 0