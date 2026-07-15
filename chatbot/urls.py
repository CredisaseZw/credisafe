from django.urls import path
from . import views

urlpatterns = [
    path('webhook/', views.whatsapp_webhook, name='whatsapp_webhook'),
    path('health/', views.health_check, name='health_check'),
    path('user/verify/<int:person_id>/', views.verify_person, name='verify_user'),
]