# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("webhook/", views.finivex_webhook, name="finivex-webhook"),
]