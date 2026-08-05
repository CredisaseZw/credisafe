from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    """Custom user model for staff/admin users"""
    phone_number = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=50, choices=[
        ('admin', 'Admin'),
        ('agent', 'Agent'),
        ('support', 'Support')
    ], default='agent')
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups', 
        blank=True,
        verbose_name='groups',
        help_text='The groups this user belongs to.'
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions', 
        blank=True,
        verbose_name='user permissions',
        help_text='Specific permissions for this user.'
    )
    
    class Meta:
        db_table = 'custom_user'  # Use custom table name to avoid conflicts
        indexes = [
            models.Index(fields=['phone_number']),
        ]
    
    def __str__(self):
        return f"{self.username} - {self.phone_number}"


class Person(models.Model):
    """Model for every person who interacts with the chatbot"""
    phone_number = models.CharField(max_length=15, unique=True,null=True, db_index=True)
    national_id = models.CharField(max_length=20, unique=True, db_index=True, null=True, blank=True)
    full_name = models.CharField(max_length=200, null=True, blank=True)
    uploader = models.ForeignKey(
        'Person',
        on_delete=models.CASCADE,
        related_name='uploaded_persons',
        null=True,
        blank=True,
    )
    
    # User mode and status tracking
    USER_MODES = [
        ('signup', 'Signup Mode'),
        ('borrower_signup', 'Borrower Signup Mode'),
        ('login', 'Login Mode'),
        ('edit_profile', 'Edit Profile Mode'),
        ('edit_borrower', 'Edit Borrower Mode'),
        ('credit_check', 'Credit Check Mode'),
        ('offer_service', 'Offer Service Mode'),
        ('lend_money', 'Lend Money Mode'),
        ('track_lended', 'Track Lended Mode'),
        ('settle_debt', 'Settle Debt Mode'),
        ('welcome', 'Welcome Mode'),
        ('verification_hold', 'Verification Hold'),
        ('add_subject', 'Add Subject'),
        ('borrower_confirmation', 'Borrower Confirmation'),
        ('suspension', 'Suspended'),
        ('addition_aborted', 'Addition Aborted'),
        ('accept_credit', 'Accept Credit'),
        ('receipting', 'Receipting'),
        ('accounting', 'Accounting'),
        
    ]
    
    USER_STATUSES = [
        ('national_id', 'Awaiting National ID'),
        ('otp_confirmation', 'Awaiting OTP Confirmation'),
        ('otp_setup', 'Awaiting OTP Setup'),
        ('full_name', 'Awaiting Full Name'),
        ('add_address', 'Adding Address'),
        ('edit_address', 'Editing Address'),
        ('edit_phone_number', 'Editing Phone Number'),
        ('edit_national_id', 'Editing National ID'),
        ('edit_full_name', 'Editing Full Name'),
        ('phone_number', 'Awaiting Phone Number'),
        ('phone_verification', 'Awaiting Phone Verification'),
        ('request_borrower_info', 'Requesting Borrower Payment Information'),
        ('borrower_id', 'Awaiting Borrower National ID'),
        ('borrower_phone', 'Awaiting Borrower Phone Number'),
        ('give_credit', 'Awaiting Credit Details'),
        ('borrower_full_name', 'Awaiting Borrower Full Name'),
        ('borrower_address', 'Awaiting Borrower Address'),
        ('credit_review', 'Viewing Credit History'),
        ('lend_amount', 'Entering Lend Amount'),
        ('settlement_confirmation', 'Confirming Settlement'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('welcome', 'Welcome State'),
        ('hold', 'Hold Access'),
        ('verify_details', 'Verifying Details'),
        ('verify_borrower_details', 'Verifying Borrower'),
        ('enter_credit_currency', 'Enter Currency'),
        ('enter_credit_amount', 'Enter Credit Amount'),
        ('enter_credit_type', 'Enter Credit Type'),
        ('enter_end_date', 'Enter End Date'),
        ('confirm_credit_details', 'Confirm Credit'),
        ('accept_credit', 'Accept Credit'),
        ('enter_receipt_amount', 'Enter Receipt Amount'),
        ('enter_receipt_currency', 'Enter Receipt Currency'),
        ('receipting', 'Receipting'),
        ('receipted', 'Receipted'),
        ('receipt_confirmation', 'Receipt Confirmation'),
        ('receipt_confirmed', 'Receipt Confirmed'),
        ('receipt_date', 'Receipt Date'),
        ('offer_lending', 'Offer Lending'),
        
    ]
    
    VERIFICATION_STATUSES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('hold', 'Verification Hold'),
        ('manual_review', 'Manual Review Required'),
    ]
    
    user_mode = models.CharField(max_length=50, choices=USER_MODES, default='welcome')
    user_status = models.CharField(max_length=50, choices=USER_STATUSES, default='welcome')
    address = models.CharField(max_length=200, null=True, blank=True)
    # Session tracking
    session_data = models.JSONField(default=dict, blank=True)
    last_interaction = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    mentioned_name = models.CharField(max_length=100, null=True, blank=True)
    mentioned_phone_number = models.CharField(max_length=15, null=True, blank=True)
    old_phone_number = models.CharField(max_length=15, null=True, blank=True)
    oldest_creditor = models.CharField(max_length=100, null=True, blank=True)
    amount_owed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    otp_code = models.CharField(max_length=6, null=True, blank=True)  # OTP code
    # For credit history
    credit_score = models.IntegerField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    #verification fields
    name_match_score = models.FloatField(null=True, blank=True)
    phone_match_score = models.FloatField(null=True, blank=True)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUSES, default='pending')

    
    class Meta:
        indexes = [
            models.Index(fields=['phone_number', 'user_mode']),
            models.Index(fields=['national_id']),
        ]
    
    def __str__(self):
        return f"{self.full_name or 'Unknown'} - {self.phone_number}"
    
    def update_mode(self, mode, status=None):
        """Update user mode and optionally status"""
        self.user_mode = mode
        if status:
            self.user_status = status
        self.save(update_fields=['user_mode', 'user_status'])
    
    def get_session_key(self, key, default=None):
        """Get session data by key"""
        return self.session_data.get(key, default)
    
    def set_session_data(self, key, value):
        """Set session data"""
        self.session_data[key] = value
        self.save(update_fields=['session_data'])