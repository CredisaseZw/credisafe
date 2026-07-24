from django.db import models
from django.utils import timezone
from users.models import Person

class CreditHistory(models.Model):
    """Credit history for a person"""
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='credit_histories')
    credit_score = models.IntegerField()
    total_borrowed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_repaid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_claims = models.IntegerField(default=0)
    total_courts = models.IntegerField(default=0)
    default_risk = models.CharField(max_length=50, choices=[
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
    ])
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Credit for {self.person.full_name} - Score: {self.credit_score}"

class CreditCheck(models.Model):
    """Record of who checked whose credit and when"""
    STATUS_CHOICES = [
        ('pending_otp', 'Pending OTP Verification'),
        ('otp_sent', 'OTP Sent'),
        ('verified', 'Verified'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('expired', 'Expired'),
    ]
    
    CHECK_TYPE_CHOICES = [
        ('self_check', 'Self Check'),
        ('third_party', 'Third Party Check'),
    ]
    
    # Who is checking
    checker = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='checks_made')
    # Who is being checked
    subject = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='checks_received')
    
    check_type = models.CharField(max_length=20, choices=CHECK_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_otp')
    
    # OTP related
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_sent_at = models.DateTimeField(null=True, blank=True)
    otp_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Check details
    credit_history_snapshot = models.JSONField(null=True, blank=True)
    checked_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['checker', 'status']),
            models.Index(fields=['subject', 'created_at']),
            models.Index(fields=['otp_code', 'status']),
        ]
    
    def __str__(self):
        return f"{self.checker.phone_number} checked {self.subject.phone_number} - {self.status}"
    
    def is_expired(self):
        """Check if OTP has expired (10 minutes expiry)"""
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

class LendingContract(models.Model):
    """Track lending agreements"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('settled', 'Settled'),
        ('defaulted', 'Defaulted'),
        ('disputed', 'Disputed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]
    CREDIT_TYPES =[
        ("cash", "Cash"),
        ("goods", "Goods"),
        ("service", "Service"),
        ("loan", "Loan"),
        ("mukando", "Mukando")
    ]
    
    credit_type = models.CharField(max_length=20, choices=CREDIT_TYPES, null=True, blank=True)
    lender = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='loans_given')
    borrower = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='loans_taken')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5,choices=[
        ('rand', 'ZAR'),
        ('usd', 'USD'),
        ('zwl', 'ZWL'),
    ],default='usd')
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    due_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    # Tracking
    settled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) 
    
    class Meta:
        indexes = [
            models.Index(fields=['lender', 'status']),
            models.Index(fields=['borrower', 'status']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"Lender: {self.lender.full_name} - Borrower: {self.borrower.full_name} - Amount: {self.amount}"
    
    def settle(self):
        """Mark lending as settled"""
        self.status = 'settled'
        self.settled_at = timezone.now()
        self.save()

class CreditCheckAudit(models.Model):
    """Audit log for all credit checks"""
    credit_check = models.ForeignKey(CreditCheck, on_delete=models.CASCADE, related_name='audits')
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    performed_by_phone = models.CharField(max_length=15)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['credit_check', 'created_at']),
        ]