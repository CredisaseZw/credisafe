from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from users.models import Person, Company
from credit.models import LendingContract, CreditHistory, CreditCheck, Receipt
from chatbot.models import WhatsAppMessage, ConversationSession
from django.db.models import Count, Sum
from django.utils import timezone

User = get_user_model()

# ============ Company Serializers ============
class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""
    user_count = serializers.SerializerMethodField()
    contract_count = serializers.SerializerMethodField()
    total_credit_value = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'registration_number', 'address',
            'phone', 'email', 'is_active', 'user_count',
            'contract_count', 'total_credit_value',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user_count(self, obj):
        return User.objects.filter(company=obj).count()
    
    def get_contract_count(self, obj):
        return LendingContract.objects.filter(company=obj).count()
    
    def get_total_credit_value(self, obj):
        result = LendingContract.objects.filter(
            company=obj,
            status='active'
        ).aggregate(total=Sum('amount'))
        return result['total'] or 0

class CompanyDetailSerializer(serializers.ModelSerializer):
    """Detailed Company serializer with all relationships"""
    users = serializers.SerializerMethodField()
    contracts = serializers.SerializerMethodField()
    persons = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'registration_number', 'address',
            'phone', 'email', 'is_active', 'users',
            'contracts', 'persons', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_users(self, obj):
        users = User.objects.filter(company=obj)
        return UserSerializer(users, many=True).data
    
    def get_contracts(self, obj):
        contracts = LendingContract.objects.filter(company=obj)
        return LendingContractSerializer(contracts, many=True).data
    
    def get_persons(self, obj):
        persons = Person.objects.filter(company=obj)
        return PersonSerializer(persons, many=True).data

# ============ User Serializers ============
class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    company = CompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source='company',
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'phone_number', 'role', 'email',
            'first_name', 'last_name', 'full_name',
            'is_client_user', 'company', 'company_id',
            'is_superuser', 'is_staff', 'is_active',
            'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_superuser', 'is_staff']
    
    def get_full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username

class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2', 'phone_number',
            'email', 'role', 'first_name', 'last_name',
            'is_client_user', 'company_id'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        company = validated_data.pop('company_id', None)
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        if company:
            user.company = company
        user.set_password(password)
        user.save()
        return user

# ============ Person Serializers ============
class PersonSerializer(serializers.ModelSerializer):
    """Base Person serializer"""
    company = CompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source='company',
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    
    class Meta:
        model = Person
        fields = [
            'id', 'phone_number', 'national_id', 'full_name',
            'address', 'credit_score', 'is_verified', 
            'verification_status', 'verification_status_display',
            'company', 'company_id', 'user_mode', 'user_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PersonDetailSerializer(serializers.ModelSerializer):
    """Detailed Person serializer"""
    company = CompanySerializer(read_only=True)
    uploaded_persons = PersonSerializer(many=True, read_only=True)
    loans_given = serializers.SerializerMethodField()
    loans_taken = serializers.SerializerMethodField()
    credit_history = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()
    
    class Meta:
        model = Person
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_loans_given(self, obj):
        contracts = LendingContract.objects.filter(lender=obj)
        return LendingContractSerializer(contracts, many=True).data
    
    def get_loans_taken(self, obj):
        contracts = LendingContract.objects.filter(borrower=obj)
        return LendingContractSerializer(contracts, many=True).data
    
    def get_credit_history(self, obj):
        try:
            history = CreditHistory.objects.get(person=obj)
            return CreditHistorySerializer(history).data
        except CreditHistory.DoesNotExist:
            return None
    
    def get_messages(self, obj):
        messages = WhatsAppMessage.objects.filter(person=obj)[:10]
        return WhatsAppMessageSerializer(messages, many=True).data

# ============ Lending Contract Serializers ============
class LendingContractSerializer(serializers.ModelSerializer):
    """Base Lending Contract serializer"""
    lender_name = serializers.CharField(source='lender.full_name', read_only=True)
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)
    lender_phone = serializers.CharField(source='lender.phone_number', read_only=True)
    borrower_phone = serializers.CharField(source='borrower.phone_number', read_only=True)
    lender_national_id = serializers.CharField(source='lender.national_id', read_only=True)
    borrower_national_id = serializers.CharField(source='borrower.national_id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    credit_type_display = serializers.CharField(source='get_credit_type_display', read_only=True)
    currency_display = serializers.CharField(source='get_currency_display', read_only=True)
    
    # Computed fields
    balance_outstanding = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = LendingContract
        fields = [
            'id', 'credit_type', 'credit_type_display',
            'lender', 'borrower',
            'lender_name', 'borrower_name',
            'lender_phone', 'borrower_phone',
            'lender_national_id', 'borrower_national_id',
            'amount', 'currency', 'currency_display',
            'interest_rate', 'due_date',
            'status', 'status_display',
            'lodge_date', 'instalment_amount',
            'start_date',
            'balance_outstanding', 'is_overdue', 'days_overdue',
            'created_at', 'updated_at', 'settled_at',
            'company', 'company_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'settled_at']
    
    def get_balance_outstanding(self, obj):
        """Calculate outstanding balance"""
        # Get total paid from receipts
        total_paid = obj.receipts.filter(confirmed=True).aggregate(
            total=Sum('amount')
        )['total'] or 0
        return obj.amount - total_paid
    
    def get_is_overdue(self, obj):
        """Check if contract is overdue"""
        if obj.status != 'active':
            return False
        if not obj.due_date:
            return False
        return obj.due_date < timezone.now().date()
    
    def get_days_overdue(self, obj):
        """Calculate days overdue"""
        if not self.get_is_overdue(obj):
            return 0
        today = timezone.now().date()
        return (today - obj.due_date).days

class LendingContractCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Lending Contracts"""
    instalments = serializers.JSONField(write_only=True, required=False, default=list)
    
    class Meta:
        model = LendingContract
        fields = [
            'credit_type', 'lender', 'borrower',
            'amount', 'currency', 'interest_rate', 'due_date',
            'lodge_date', 'instalment_amount', 'start_date',
            'instalments'
        ]
    
    def create(self, validated_data):
        instalments = validated_data.pop('instalments', [])
        contract = LendingContract.objects.create(**validated_data)
        
        # Process instalments if provided
        # You can store instalments in a related model if needed
        if instalments and len(instalments) > 0 and instalments[0].get('amount'):
            # Set instalment amount from first instalment
            contract.instalment_amount = instalments[0].get('amount')
            contract.save()
        
        return contract

class LendingContractUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Lending Contracts"""
    class Meta:
        model = LendingContract
        fields = [
            'status', 'due_date', 'interest_rate',
            'instalment_amount', 
        ]

# ============ Credit History Serializers ============
class CreditHistorySerializer(serializers.ModelSerializer):
    """Serializer for Credit History"""
    person_name = serializers.CharField(source='person.full_name', read_only=True)
    person_phone = serializers.CharField(source='person.phone_number', read_only=True)
    default_risk_display = serializers.CharField(
        source='get_default_risk_display',
        read_only=True
    )
    
    class Meta:
        model = CreditHistory
        fields = [
            'id', 'person', 'person_name', 'person_phone',
            'credit_score', 'total_borrowed', 'total_repaid',
            'outstanding_balance', 'total_claims', 'total_courts',
            'default_risk', 'default_risk_display',
            'last_updated'
        ]
        read_only_fields = ['id', 'last_updated']

# ============ Credit Check Serializers ============
class CreditCheckSerializer(serializers.ModelSerializer):
    """Serializer for Credit Checks"""
    checker_name = serializers.CharField(source='checker.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.full_name', read_only=True)
    checker_phone = serializers.CharField(source='checker.phone_number', read_only=True)
    subject_phone = serializers.CharField(source='subject.phone_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    check_type_display = serializers.CharField(source='get_check_type_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = CreditCheck
        fields = [
            'id', 'checker', 'subject',
            'checker_name', 'subject_name',
            'checker_phone', 'subject_phone',
            'check_type', 'check_type_display',
            'status', 'status_display',
            'otp_code', 'otp_sent_at',
            'otp_verified_at', 'credit_history_snapshot',
            'checked_at', 'expires_at',
            'is_expired', 'time_remaining',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_time_remaining(self, obj):
        if obj.expires_at:
            now = timezone.now()
            if now > obj.expires_at:
                return "Expired"
            remaining = obj.expires_at - now
            minutes = int(remaining.total_seconds() // 60)
            seconds = int(remaining.total_seconds() % 60)
            return f"{minutes}m {seconds}s"
        return None

class CreditCheckCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Credit Checks"""
    class Meta:
        model = CreditCheck
        fields = ['checker', 'subject', 'check_type']

# ============ Receipt Serializers ============
class ReceiptSerializer(serializers.ModelSerializer):
    """Serializer for Receipts"""
    contract_id = serializers.IntegerField(source='lending_contract.id', read_only=True)
    contract_amount = serializers.DecimalField(
        source='lending_contract.amount',
        read_only=True,
        max_digits=12,
        decimal_places=2
    )
    currency_display = serializers.CharField(
        source='get_currency_display',
        read_only=True
    )
    remaining_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'lending_contract', 'contract_id',
            'amount', 'currency', 'currency_display',
            'receipt_date', 'confirmed', 'confirmed_at',
            'contract_amount', 'remaining_balance',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'confirmed_at']
    
    def get_remaining_balance(self, obj):
        total_paid = obj.lending_contract.receipts.filter(
            confirmed=True
        ).aggregate(total=Sum('amount'))['total'] or 0
        return obj.lending_contract.amount - total_paid

class ReceiptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Receipts"""
    class Meta:
        model = Receipt
        fields = ['lending_contract', 'amount', 'currency', 'receipt_date']

# ============ WhatsApp Message Serializers ============
class WhatsAppMessageSerializer(serializers.ModelSerializer):
    """Serializer for WhatsApp Messages"""
    person_phone = serializers.CharField(source='person.phone_number', read_only=True)
    person_name = serializers.CharField(source='person.full_name', read_only=True)
    direction_display = serializers.CharField(
        source='get_direction_display',
        read_only=True
    )
    
    class Meta:
        model = WhatsAppMessage
        fields = [
            'id', 'person', 'person_phone', 'person_name',
            'direction', 'direction_display',
            'message_type', 'content',
            'whatsapp_message_id', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

class WhatsAppMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating WhatsApp Messages"""
    class Meta:
        model = WhatsAppMessage
        fields = ['person', 'direction', 'message_type', 'content', 'whatsapp_message_id']

# ============ Conversation Session Serializers ============
class ConversationSessionSerializer(serializers.ModelSerializer):
    """Serializer for Conversation Sessions"""
    person_name = serializers.CharField(source='person.full_name', read_only=True)
    person_phone = serializers.CharField(source='person.phone_number', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = ConversationSession
        fields = [
            'id', 'person', 'person_name', 'person_phone',
            'is_active', 'started_at', 'ended_at',
            'duration', 'context_data'
        ]
        read_only_fields = ['id', 'started_at', 'ended_at']
    
    def get_duration(self, obj):
        if obj.ended_at:
            duration = obj.ended_at - obj.started_at
            minutes = int(duration.total_seconds() // 60)
            return f"{minutes} minutes"
        return "Active"

# ============ Dashboard Serializers ============
class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for Dashboard Statistics"""
    total_active_contracts = serializers.IntegerField()
    active_accounts_in_arrears = serializers.IntegerField()
    arrears_percentage = serializers.FloatField()
    active_credit_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    arrears_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    arrears_value_percentage = serializers.FloatField()
    total_lenders = serializers.IntegerField()
    total_borrowers = serializers.IntegerField()
    total_receipts_today = serializers.IntegerField()
    company = serializers.CharField(required=False, allow_null=True)
    weekly_trend = serializers.JSONField(required=False)
    monthly_trend = serializers.JSONField(required=False)

class EnquiriesSerializer(serializers.Serializer):
    """Serializer for Enquiries"""
    individual = serializers.IntegerField()
    companies = serializers.IntegerField()
    assetsafe = serializers.IntegerField()
    total = serializers.IntegerField()