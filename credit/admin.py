from django.contrib import admin
from .models import CreditHistory, CreditCheck, LendingContract, CreditCheckAudit, Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "lending_contract",
        "amount",
        "currency",
        "receipt_date",
        "confirmed",
        "confirmed_at",
        "created_at",
    )

    list_filter = (
        "confirmed",
        "currency",
        "receipt_date",
        "created_at",
    )

    search_fields = (
        "lending_contract__id",
        "lending_contract__lender__full_name",
        "lending_contract__borrower__full_name",
        "lending_contract__lender__phone_number",
        "lending_contract__borrower__phone_number",
    )

    readonly_fields = (
        "created_at",
        "confirmed_at",
    )

    autocomplete_fields = ("lending_contract",)

    ordering = ("-created_at",)

    list_per_page = 25

    fieldsets = (
        ("Receipt Details", {
            "fields": (
                "lending_contract",
                "amount",
                "currency",
                "receipt_date",
            )
        }),
        ("Confirmation", {
            "fields": (
                "confirmed",
                "confirmed_at",
            )
        }),
        ("Metadata", {
            "fields": (
                "created_at",
            )
        }),
    )
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