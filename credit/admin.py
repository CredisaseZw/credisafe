from django.contrib import admin
from .models import CreditHistory, CreditCheck, LendingContract, CreditCheckAudit

@admin.register(CreditHistory)
class CreditHistoryAdmin(admin.ModelAdmin):
    list_display = ['person', 'credit_score', 'outstanding_balance', 'default_risk']
    list_filter = ['default_risk']
    search_fields = ['person__phone_number', 'person__national_id']

@admin.register(CreditCheck)
class CreditCheckAdmin(admin.ModelAdmin):
    list_display = ['checker', 'subject', 'check_type', 'status', 'created_at']
    list_filter = ['check_type', 'status']
    search_fields = ['checker__phone_number', 'subject__phone_number']
    readonly_fields = ['created_at', 'otp_sent_at', 'otp_verified_at']

@admin.register(LendingContract)
class LendingContractAdmin(admin.ModelAdmin):
    list_display = ['id', 'lender', 'borrower', 'amount', 'status', 'due_date']
    list_filter = ['status']
    search_fields = ['lender__phone_number', 'borrower__phone_number']

@admin.register(CreditCheckAudit)
class CreditCheckAuditAdmin(admin.ModelAdmin):
    list_display = ['credit_check', 'action', 'performed_by_phone', 'created_at']
    list_filter = ['action']
    search_fields = ['performed_by_phone']