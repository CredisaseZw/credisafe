from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, Count, Q, F, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
import random
import logging

from users.models import Person, Company, User
from credit.models import LendingContract, CreditHistory, CreditCheck, Receipt
from chatbot.models import WhatsAppMessage, ConversationSession
from .serializers import (
    UserSerializer, UserCreateSerializer,
    PersonSerializer, PersonDetailSerializer,
    CompanySerializer, CompanyDetailSerializer,
    LendingContractSerializer, LendingContractCreateSerializer,
    LendingContractUpdateSerializer,
    CreditHistorySerializer, CreditCheckSerializer,
    CreditCheckCreateSerializer,
    ReceiptSerializer, ReceiptCreateSerializer,
    WhatsAppMessageSerializer, WhatsAppMessageCreateSerializer,
    ConversationSessionSerializer,
    DashboardStatsSerializer, EnquiriesSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()

# ============ Custom Token Serializer ============
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with user data"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['phone_number'] = user.phone_number
        token['role'] = user.role
        token['is_client_user'] = user.is_client_user
        token['company_id'] = user.company_id if user.company else None
        token['is_superuser'] = user.is_superuser
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        
        # Check if user is client user and return company info
        if self.user.is_client_user and self.user.company:
            data['company'] = CompanySerializer(self.user.company).data
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view"""
    serializer_class = CustomTokenObtainPairSerializer

# ============ Person OTP Authentication ============
@api_view(['POST'])
@permission_classes([AllowAny])
def person_send_otp(request):
    """Send OTP to a person's phone number"""
    phone_number = request.data.get('phone_number')
    
    if not phone_number:
        return Response(
            {'error': 'Phone number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        person = Person.objects.get(phone_number=phone_number)
    except Person.DoesNotExist:
        return Response(
            {'error': 'Person not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate a 6-digit OTP
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Save OTP to person
    person.otp_code = otp_code
    person.last_interaction = timezone.now()
    person.save(update_fields=['otp_code', 'last_interaction'])
    
    # In production, send via SMS/WhatsApp
    logger.info(f"OTP for {phone_number}: {otp_code}")
    
    # Send SMS via Africa's Talking or WhatsApp
    try:
        # You can implement SMS sending here
        # send_sms(phone_number, f"Your CrediSafe OTP is: {otp_code}")
        pass
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
    
    return Response({
        'success': True,
        'message': 'OTP sent successfully',
        'otp': otp_code  # Only for development
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def person_otp_login(request):
    """Login a person using phone number and OTP"""
    phone_number = request.data.get('phone_number')
    otp_code = request.data.get('otp_code')
    
    if not phone_number or not otp_code:
        return Response(
            {'error': 'Phone number and OTP code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        person = Person.objects.get(phone_number=phone_number)
    except Person.DoesNotExist:
        return Response(
            {'error': 'Person not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Verify OTP
    if person.otp_code != otp_code:
        return Response(
            {'error': 'Invalid OTP code'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if OTP is expired (10 minutes)
    if person.last_interaction:
        if (timezone.now() - person.last_interaction).seconds > 600:
            return Response(
                {'error': 'OTP has expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    # Clear OTP after successful login
    person.otp_code = None
    person.save(update_fields=['otp_code'])
    
    # Generate a JWT token for the person
    # You need to create a custom token for persons
    # For now, we'll return a success response
    
    return Response({
        'success': True,
        'person': PersonSerializer(person).data,
        'message': 'Login successful',
        'access': 'person_access_token_here',  # You should implement proper token generation
        'refresh': 'person_refresh_token_here'
    })

# ============ User Authentication Views ============
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user"""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'User created successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get the current authenticated user"""
    serializer = UserSerializer(request.user)
    data = serializer.data
    
    # Add additional info for client users
    if request.user.is_client_user and request.user.company:
        data['company'] = CompanySerializer(request.user.company).data
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    new_password2 = request.data.get('new_password2')
    
    if not old_password or not new_password or not new_password2:
        return Response(
            {'error': 'All password fields are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != new_password2:
        return Response(
            {'error': 'New passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()
    
    return Response({'message': 'Password changed successfully'})

# ============ User Management Views (Admin only) ============
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (Admin only)"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superusers can list users'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    users = User.objects.all().order_by('-date_joined')
    
    # Filter by role
    role = request.query_params.get('role')
    if role:
        users = users.filter(role=role)
    
    # Filter by is_client_user
    is_client = request.query_params.get('is_client_user')
    if is_client and is_client.lower() == 'true':
        users = users.filter(is_client_user=True)
    
    # Filter by company
    company_id = request.query_params.get('company')
    if company_id:
        users = users.filter(company_id=company_id)
    
    # Filter by is_active
    is_active = request.query_params.get('is_active')
    if is_active and is_active.lower() == 'true':
        users = users.filter(is_active=True)
    
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_user(request, user_id):
    """Manage a specific user (Admin only)"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superusers can manage users'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    
    elif request.method == 'PUT':
        # Handle company update
        company_id = request.data.get('company_id')
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                user.company = company
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Company not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Update other fields
        for field in ['username', 'phone_number', 'email', 'role', 'first_name', 'last_name', 'is_active']:
            if field in request.data:
                setattr(user, field, request.data[field])
        
        user.save()
        return Response(UserSerializer(user).data)
    
    elif request.method == 'DELETE':
        user.delete()
        return Response({'message': 'User deleted successfully'})

# ============ Company Views ============
class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Companies"""
    queryset = Company.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer
    
    # In CompanyViewSet, update get_queryset method:
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Search filter - single search box for multiple fields
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(registration_number__icontains=search) |
                Q(phone__icontains=search)
            )
        
        # Filter by name (legacy)
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__icontains=name)
        
        # Filter by registration number (legacy)
        reg_no = self.request.query_params.get('registration_number')
        if reg_no:
            queryset = queryset.filter(registration_number__icontains=reg_no)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active and is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get all users for a company"""
        company = self.get_object()
        users = User.objects.filter(company=company)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def contracts(self, request, pk=None):
        """Get all contracts for a company"""
        company = self.get_object()
        contracts = LendingContract.objects.filter(company=company)
        serializer = LendingContractSerializer(contracts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def persons(self, request, pk=None):
        """Get all persons for a company"""
        company = self.get_object()
        persons = Person.objects.filter(company=company)
        serializer = PersonSerializer(persons, many=True)
        return Response(serializer.data)

# ============ Person Views ============
class PersonViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Persons"""
    queryset = Person.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PersonDetailSerializer
        return PersonSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a client user, only show persons from their company
        if user.is_client_user and user.company:
            queryset = queryset.filter(company=user.company)
        
        # Search filter - single search box for multiple fields
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(national_id__icontains=search) |
                Q(phone_number__icontains=search)
            )
        
        # Filter by phone number (legacy)
        phone = self.request.query_params.get('phone')
        if phone:
            queryset = queryset.filter(phone_number__icontains=phone)
        
        # Filter by full name (legacy)
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(full_name__icontains=name)
        
        # Filter by national_id (legacy)
        national_id = self.request.query_params.get('national_id')
        if national_id:
            queryset = queryset.filter(national_id__icontains=national_id)
        
        # Filter by verification status
        verification = self.request.query_params.get('verification_status')
        if verification:
            queryset = queryset.filter(verification_status=verification)
        
        # Filter by company
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter by is_verified
        is_verified = self.request.query_params.get('is_verified')
        if is_verified and is_verified.lower() == 'true':
            queryset = queryset.filter(is_verified=True)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a person (Admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can verify persons'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        person = self.get_object()
        person.is_verified = True
        person.verification_status = 'verified'
        person.save()
        
        return Response(PersonSerializer(person).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a person (Admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can reject persons'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        person = self.get_object()
        person.verification_status = 'rejected'
        person.is_verified = False
        person.save()
        
        return Response(PersonSerializer(person).data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a person (Admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can activate persons'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        person = self.get_object()
        person.is_active = True
        person.save()
        
        return Response(PersonSerializer(person).data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a person (Admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can deactivate persons'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        person = self.get_object()
        person.is_active = False
        person.save()
        
        return Response(PersonSerializer(person).data)
    
    @action(detail=True, methods=['get'])
    def credit_history(self, request, pk=None):
        """Get credit history for a person"""
        person = self.get_object()
        try:
            credit_history = CreditHistory.objects.get(person=person)
            serializer = CreditHistorySerializer(credit_history)
            return Response(serializer.data)
        except CreditHistory.DoesNotExist:
            return Response(
                {'error': 'Credit history not found for this person'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def contracts(self, request, pk=None):
        """Get all lending contracts for a person"""
        person = self.get_object()
        contracts = LendingContract.objects.filter(
            Q(lender=person) | Q(borrower=person)
        ).order_by('-created_at')
        serializer = LendingContractSerializer(contracts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def loans_given(self, request, pk=None):
        """Get loans given by a person"""
        person = self.get_object()
        contracts = LendingContract.objects.filter(
            lender=person
        ).order_by('-created_at')
        serializer = LendingContractSerializer(contracts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def loans_taken(self, request, pk=None):
        """Get loans taken by a person"""
        person = self.get_object()
        contracts = LendingContract.objects.filter(
            borrower=person
        ).order_by('-created_at')
        serializer = LendingContractSerializer(contracts, many=True)
        return Response(serializer.data)

# ============ Lending Contract Views ============
class LendingContractViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Lending Contracts"""
    queryset = LendingContract.objects.all().order_by('-lodge_date', '-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LendingContractCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LendingContractUpdateSerializer
        return LendingContractSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a client user, only show contracts from their company
        if user.is_client_user and user.company:
            queryset = queryset.filter(company=user.company)
        # If user is not superuser or admin, show contracts they're involved in
        elif not user.is_superuser and user.role != 'admin':
            queryset = queryset.filter(
                Q(lender__phone_number=user.phone_number) | 
                Q(borrower__phone_number=user.phone_number)
            )
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by lender
        lender_id = self.request.query_params.get('lender')
        if lender_id:
            queryset = queryset.filter(lender_id=lender_id)
        
        # Filter by borrower
        borrower_id = self.request.query_params.get('borrower')
        if borrower_id:
            queryset = queryset.filter(borrower_id=borrower_id)
        
        # Filter by in_arrears
        in_arrears = self.request.query_params.get('in_arrears')
        if in_arrears and in_arrears.lower() == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                status='active',
                due_date__lt=today
            )
        
        # Filter by company
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Search by agreement number (id) or debtor name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search) |
                Q(lender__full_name__icontains=search) |
                Q(borrower__full_name__icontains=search) |
                Q(lender__phone_number__icontains=search) |
                Q(borrower__phone_number__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Set company when creating a contract"""
        user = self.request.user
        company = None
        
        # If user is a client user, automatically set their company
        if user.is_client_user and user.company:
            company = user.company
        
        serializer.save(company=company)
    
    @action(detail=True, methods=['post'])
    def settle(self, request, pk=None):
        """Settle a lending contract"""
        contract = self.get_object()
        if contract.status == 'settled':
            return Response(
                {'error': 'Contract already settled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        contract.status = 'settled'
        contract.settled_at = timezone.now()
        contract.save()
        
        return Response(LendingContractSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def add_receipt(self, request, pk=None):
        """Add a receipt to a contract"""
        contract = self.get_object()
        serializer = ReceiptCreateSerializer(data=request.data)
        if serializer.is_valid():
            receipt = serializer.save(lending_contract=contract)
            return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def receipts(self, request, pk=None):
        """Get all receipts for a contract"""
        contract = self.get_object()
        receipts = contract.receipts.all().order_by('-created_at')
        serializer = ReceiptSerializer(receipts, many=True)
        return Response(serializer.data)

# ============ Credit Check Views ============
class CreditCheckViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Credit Checks"""
    queryset = CreditCheck.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreditCheckCreateSerializer
        return CreditCheckSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by checker
        checker_id = self.request.query_params.get('checker')
        if checker_id:
            queryset = queryset.filter(checker_id=checker_id)
        
        # Filter by subject
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def verify_otp(self, request, pk=None):
        """Verify OTP for a credit check"""
        credit_check = self.get_object()
        otp_code = request.data.get('otp_code')
        
        if not otp_code:
            return Response(
                {'error': 'OTP code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if credit_check.status != 'pending_otp':
            return Response(
                {'error': 'Credit check is not in pending OTP state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if credit_check.otp_code != otp_code:
            return Response(
                {'error': 'Invalid OTP code'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if credit_check.is_expired():
            return Response(
                {'error': 'OTP has expired'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        credit_check.status = 'verified'
        credit_check.otp_verified_at = timezone.now()
        credit_check.save()
        
        return Response(CreditCheckSerializer(credit_check).data)

# ============ Receipt Views ============
class ReceiptViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Receipts"""
    queryset = Receipt.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReceiptCreateSerializer
        return ReceiptSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # If user is a client user, only show receipts from their company
        if user.is_client_user and user.company:
            queryset = queryset.filter(
                lending_contract__company=user.company
            )
        
        # Filter by contract
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(lending_contract_id=contract_id)
        
        # Filter by confirmed
        confirmed = self.request.query_params.get('confirmed')
        if confirmed and confirmed.lower() == 'true':
            queryset = queryset.filter(confirmed=True)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a receipt"""
        receipt = self.get_object()
        if receipt.confirmed:
            return Response(
                {'error': 'Receipt already confirmed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        receipt.confirmed = True
        receipt.confirmed_at = timezone.now()
        receipt.save()
        
        return Response(ReceiptSerializer(receipt).data)

# ============ WhatsApp Message Views ============
class WhatsAppMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing WhatsApp messages"""
    queryset = WhatsAppMessage.objects.all().order_by('-timestamp')
    serializer_class = WhatsAppMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by person
        person_id = self.request.query_params.get('person')
        if person_id:
            queryset = queryset.filter(person_id=person_id)
        
        # Filter by direction
        direction = self.request.query_params.get('direction')
        if direction:
            queryset = queryset.filter(direction=direction)
        
        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        return queryset

# ============ Conversation Session Views ============
class ConversationSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing conversation sessions"""
    queryset = ConversationSession.objects.all().order_by('-started_at')
    serializer_class = ConversationSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by person
        person_id = self.request.query_params.get('person')
        if person_id:
            queryset = queryset.filter(person_id=person_id)
        
        # Filter by active
        is_active = self.request.query_params.get('is_active')
        if is_active and is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset

# ============ Dashboard Views ============
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    user = request.user
    company = None
    
    # If user is a client user, filter by their company
    if user.is_client_user and user.company:
        company = user.company
    
    # Base querysets
    if company:
        contracts = LendingContract.objects.filter(company=company)
        persons = Person.objects.filter(company=company)
    else:
        contracts = LendingContract.objects.all()
        persons = Person.objects.all()
    
    # Active contracts
    active_contracts = contracts.filter(status='active')
    total_active = active_contracts.count()
    
    # Active accounts in arrears
    today = timezone.now().date()
    in_arrears = active_contracts.filter(
        due_date__lt=today
    )
    arrears_count = in_arrears.count()
    arrears_percentage = (arrears_count / total_active * 100) if total_active > 0 else 0
    
    # Active credit value
    active_credit_value = active_contracts.aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    # Arrears value
    arrears_value = in_arrears.aggregate(
        total=Sum('amount')
    )['total'] or 0
    arrears_value_percentage = (arrears_value / active_credit_value * 100) if active_credit_value > 0 else 0
    
    # Total lenders and borrowers
    total_lenders = persons.filter(loans_given__isnull=False).distinct().count()
    total_borrowers = persons.filter(loans_taken__isnull=False).distinct().count()
    
    # Receipts today
    receipts_today = Receipt.objects.filter(
        created_at__date=today
    ).count()
    
    # Weekly trend (last 7 days)
    weekly_trend = []
    for i in range(7):
        date = today - timedelta(days=i)
        count = contracts.filter(created_at__date=date).count()
        weekly_trend.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    # Monthly trend (last 12 months)
    monthly_trend = []
    for i in range(12):
        date = today - timedelta(days=30 * i)
        count = contracts.filter(
            created_at__year=date.year,
            created_at__month=date.month
        ).count()
        monthly_trend.append({
            'month': date.strftime('%Y-%m'),
            'count': count
        })
    
    data = {
        'total_active_contracts': total_active,
        'active_accounts_in_arrears': arrears_count,
        'arrears_percentage': round(arrears_percentage, 2),
        'active_credit_value': active_credit_value,
        'arrears_value': arrears_value,
        'arrears_value_percentage': round(arrears_value_percentage, 2),
        'total_lenders': total_lenders,
        'total_borrowers': total_borrowers,
        'total_receipts_today': receipts_today,
        'company': company.name if company else None,
        'weekly_trend': weekly_trend,
        'monthly_trend': monthly_trend,
    }
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enquiries(request):
    """Get enquiry data for dashboard"""
    user = request.user
    
    # If user is a client user, filter by their company
    if user.is_client_user and user.company:
        # Individual enquiries (persons not associated with any company)
        individual_count = Person.objects.filter(
            Q(company__isnull=True) & Q(is_verified=True)
        ).count()
        
        # Company enquiries
        company_count = Company.objects.filter(is_active=True).count()
        
        # Assetsafe enquiries - You'll need to implement this based on your logic
        # For now, count persons with credit score above a threshold
        assetsafe_count = Person.objects.filter(
            credit_score__gte=700,
            is_verified=True
        ).count()
    else:
        # Admin view - all data
        individual_count = Person.objects.filter(
            Q(company__isnull=True) & Q(is_verified=True)
        ).count()
        
        company_count = Company.objects.filter(is_active=True).count()
        assetsafe_count = Person.objects.filter(
            credit_score__gte=700,
            is_verified=True
        ).count()
    
    return Response({
        'individual': individual_count,
        'companies': company_count,
        'assetsafe': assetsafe_count,
        'total': individual_count + company_count + assetsafe_count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_contracts(request):
    """Search contracts by agreement number or debtor name"""
    query = request.query_params.get('q', '')
    if not query:
        return Response(
            {'error': 'Search query is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = request.user
    queryset = LendingContract.objects.all()
    
    # Filter by user's company if client user
    if user.is_client_user and user.company:
        queryset = queryset.filter(company=user.company)
    
    # Search
    contracts = queryset.filter(
        Q(id__icontains=query) |
        Q(lender__full_name__icontains=query) |
        Q(borrower__full_name__icontains=query) |
        Q(lender__phone_number__icontains=query) |
        Q(borrower__phone_number__icontains=query)
    ).order_by('-created_at')
    
    serializer = LendingContractSerializer(contracts, many=True)
    return Response(serializer.data)

# ============ Admin Dashboard Views ============
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Get admin dashboard statistics"""
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only superusers can access admin stats'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Total users by role
    users_by_role = User.objects.values('role').annotate(
        count=Count('id')
    )
    
    # Total persons by verification status
    persons_by_verification = Person.objects.values('verification_status').annotate(
        count=Count('id')
    )
    
    # Total contracts by status
    contracts_by_status = LendingContract.objects.values('status').annotate(
        count=Count('id')
    )
    
    # Total companies
    total_companies = Company.objects.count()
    active_companies = Company.objects.filter(is_active=True).count()
    
    return Response({
        'users_by_role': users_by_role,
        'persons_by_verification': persons_by_verification,
        'contracts_by_status': contracts_by_status,
        'total_companies': total_companies,
        'active_companies': active_companies,
        'total_users': User.objects.count(),
        'total_persons': Person.objects.count(),
        'total_contracts': LendingContract.objects.count(),
    })