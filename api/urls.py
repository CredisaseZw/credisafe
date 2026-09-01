from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'persons', views.PersonViewSet, basename='person')
router.register(r'contracts', views.LendingContractViewSet, basename='contract')
router.register(r'credit-checks', views.CreditCheckViewSet, basename='credit-check')
router.register(r'receipts', views.ReceiptViewSet, basename='receipt')
router.register(r'messages', views.WhatsAppMessageViewSet, basename='message')
router.register(r'sessions', views.ConversationSessionViewSet, basename='session')
router.register(r'companies', views.CompanyViewSet, basename='company')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', views.TokenObtainPairView.as_view(), name='token_refresh'),
    path('auth/me/', views.current_user, name='current_user'),
    path('auth/change-password/', views.change_password, name='change_password'),
    
    # Person OTP Login
    path('auth/person/send-otp/', views.person_send_otp, name='person_send_otp'),
    path('auth/person/login/', views.person_otp_login, name='person_otp_login'),
    
    # User Management (Admin only)
    path('users/', views.list_users, name='list_users'),
    path('users/<int:user_id>/', views.manage_user, name='manage_user'),
    
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('dashboard/enquiries/', views.enquiries, name='enquiries'),
    path('dashboard/admin-stats/', views.admin_stats, name='admin_stats'),
    
    # Search
    path('search/contracts/', views.search_contracts, name='search_contracts'),
    
    # Include router URLs
    path('', include(router.urls)),
]