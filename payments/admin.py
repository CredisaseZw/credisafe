# payments/admin.py
from django.contrib import admin, messages
from django.utils.html import format_html

from .models import Payment, Invoice, Credit, CreditAllocation
from .services import PaymentService


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "amount", "currency", "status",
        "payment_method", "payer_phone", "invoice_link",
        "created_at", "processed_at",
    )
    list_filter = (
        "status", "currency", "payment_method",
        "created_at", "processed_at",
    )
    search_fields = (
        "reference", "provider_ref", "payer_phone",
        "payer__full_name", "invoice__reference",
    )
    date_hierarchy = "created_at"
    readonly_fields = (
        "reference", "provider_ref", "redirect_url", "payment_link",
        "processed_at", "last_polled_at", "poll_count",
        "created_at", "updated_at",
    )
    raw_id_fields = ("payer", "invoice")
    list_per_page = 50

    actions = ["refresh_status", "reconcile"]

    @admin.display(description="Invoice")
    def invoice_link(self, obj):
        if not obj.invoice_id:
            return "—"
        return format_html(
            '<a href="/admin/payments/invoice/{}/change/">{}</a>',
            obj.invoice_id, obj.invoice.reference,
        )

    @admin.action(description="Refresh status from Finivex")
    def refresh_status(self, request, queryset):
        for p in queryset:
            try:
                PaymentService.refresh_status(p)
            except Exception as exc:
                self.message_user(
                    request, f"{p.reference}: {exc}", level=messages.ERROR
                )
        self.message_user(request, f"Refreshed {queryset.count()} payment(s).")

    @admin.action(description="Reconcile completed payments (invoice / credit)")
    def reconcile(self, request, queryset):
        done = 0
        for p in queryset.filter(status="COMPLETED"):
            try:
                PaymentService.reconcile_payment(p)
                done += 1
            except Exception as exc:
                self.message_user(
                    request, f"{p.reference}: {exc}", level=messages.ERROR
                )
        self.message_user(request, f"Reconciled {done} payment(s).")


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "amount", "amount_paid", "amount_due",
        "currency", "status", "payer_display",
        "due_date", "created_at",
    )
    list_filter = ("status", "currency", "created_at", "due_date")
    search_fields = (
        "reference", "description", "payer_phone",
        "payer_person__full_name", "payer_company__name",
    )
    date_hierarchy = "created_at"
    readonly_fields = (
        "reference", "amount_paid", "amount_credited", "amount_due",
        "created_at", "updated_at",
    )
    raw_id_fields = ("payer_person", "payer_company")
    list_per_page = 50

    @admin.display(description="Payer")
    def payer_display(self, obj):
        if obj.payer_person_id:
            return obj.payer_person.full_name or obj.payer_person.phone_number
        if obj.payer_company_id:
            return obj.payer_company.name
        return obj.payer_phone or "—"

    actions = ["recalculate"]

    @admin.action(description="Recalculate totals")
    def recalculate(self, request, queryset):
        for inv in queryset:
            inv.recalculate()
        self.message_user(request, f"Recalculated {queryset.count()} invoice(s).")


# ---------------------------------------------------------------------------
# Credit
# ---------------------------------------------------------------------------
@admin.register(Credit)
class CreditAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "amount", "remaining", "currency",
        "source", "owner_display", "is_active", "created_at",
    )
    list_filter = ("source", "currency", "is_active", "created_at")
    search_fields = (
        "reference", "phone",
        "person__full_name", "company__name",
        "source_payment__reference", "source_invoice__reference",
    )
    date_hierarchy = "created_at"
    readonly_fields = ("reference", "created_at", "updated_at")
    raw_id_fields = ("person", "company", "source_payment", "source_invoice")
    list_per_page = 50

    @admin.display(description="Owner")
    def owner_display(self, obj):
        if obj.person_id:
            return obj.person.full_name or obj.person.phone_number
        if obj.company_id:
            return obj.company.name
        return obj.phone or "—"


# ---------------------------------------------------------------------------
# CreditAllocation (audit trail)
# ---------------------------------------------------------------------------
@admin.register(CreditAllocation)
class CreditAllocationAdmin(admin.ModelAdmin):
    list_display = ("credit", "invoice", "amount", "created_at", "created_by")
    list_filter = ("created_at",)
    search_fields = ("credit__reference", "invoice__reference")
    date_hierarchy = "created_at"
    raw_id_fields = ("credit", "invoice", "created_by")
    list_per_page = 50