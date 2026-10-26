# payments/models.py
import uuid
from django.db import models
from django.utils import timezone
from decimal import Decimal


def generate_invoice_reference():
    return f"INV-{uuid.uuid4().hex[:16].upper()}"


def generate_credit_reference():
    return f"CR-{uuid.uuid4().hex[:16].upper()}"

class Payment(models.Model):
    """
    A single payment intent. One row per intent; status is updated via
    the service or the background poller.

    `reference` is what we send to Finivex as `transactionId` — it must be
    unique and stable. Generate it at intent-creation time.
    """

    STATUS_CHOICES = [
        ("PENDING",    "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED",  "Completed"),
        ("FAILED",     "Failed"),
        ("CANCELLED",  "Cancelled"),
        ("EXPIRED",    "Expired"),
        ("REFUNDED",   "Refunded"),
    ]
    TERMINAL_STATUSES = {"COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"}

    CURRENCY_CHOICES = [("USD", "USD"), ("ZWG", "ZWG")]

    PAYMENT_METHODS = [
        ("ECOCASH",   "EcoCash"),
        ("ONEMONEY",  "OneMoney"),
        ("INNBUCKS",  "InnBucks"),
        ("OMARI",     "Omari"),
        ("VISA",      "Visa"),
        ("MASTERCARD","Mastercard"),
        ("ZIPIT",     "ZIPIT"),
        ("POS",       "Zimswitch POS"),
    ]

    # --- identity -------------------------------------------------------
    reference        = models.CharField(max_length=64, unique=True, db_index=True,
                                        help_text="Our transactionId sent to Finivex")
    provider_ref     = models.CharField(max_length=64, blank=True, null=True,
                                        help_text="Reference returned by Finivex")

    # --- money ----------------------------------------------------------
    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    currency         = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")

    # --- context --------------------------------------------------------
    status           = models.CharField(max_length=16, choices=STATUS_CHOICES,
                                        default="PENDING", db_index=True)
    status_message   = models.CharField(max_length=255, blank=True, null=True)
    payment_method   = models.CharField(max_length=16, choices=PAYMENT_METHODS,
                                        blank=True, null=True)
    description      = models.CharField(max_length=255, blank=True, null=True)

    # Optional linkage to your existing Person / Company
    payer            = models.ForeignKey(
        "users.Person", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments_made",
    )
    payer_phone      = models.CharField(max_length=15, blank=True, null=True)
    payer_email      = models.EmailField(blank=True, null=True)
    invoice          = models.ForeignKey(
        'payments.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments",
    )

    # Free-form data (order id, invoice id, who initiated, etc.)
    metadata         = models.JSONField(default=dict, blank=True)

    # --- redirect / link (for hosted checkout / payment link) -----------
    redirect_url     = models.URLField(max_length=500, blank=True, null=True)
    payment_link     = models.URLField(max_length=500, blank=True, null=True)

    # --- lifecycle ------------------------------------------------------
    processed_at     = models.DateTimeField(null=True, blank=True,
                                            help_text="When Finivex reported terminal status")
    last_polled_at   = models.DateTimeField(null=True, blank=True)
    poll_count       = models.PositiveIntegerField(default=0)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_payment"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["reference"]),
            models.Index(fields=["payer", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.amount} {self.currency} [{self.status}]"

    @property
    def is_terminal(self):
        return self.status in self.TERMINAL_STATUSES

    # Convenience factory ---------------------------------------------------
    @classmethod
    def new_reference(cls, prefix="PAY"):
        return f"{prefix}-{uuid.uuid4().hex[:20].upper()}"
    
    @property
    def unallocated_amount(self):
        """Portion of this payment that produced an overpayment credit."""
        if self.status != "COMPLETED":
            return Decimal("0")
        applied = self.invoice.amount_due if self.invoice_id and self.invoice else Decimal("0")
        # safer: rely on Credit.source_payment
        from django.db.models import Sum
        return self.credits_out.aggregate(s=Sum("amount"))["s"] or Decimal("0")


class Invoice(models.Model):
    """
    A request for money. Can be issued to a Person or a Company.
    An invoice is *expected* to be paid; payments are applied against it.
    """

    STATUS_CHOICES = [
        ("DRAFT",     "Draft"),
        ("ISSUED",    "Issued"),       # sent to customer, awaiting payment
        ("PARTIAL",   "Partially Paid"),
        ("PAID",      "Paid"),
        ("OVERPAID",  "Overpaid"),
        ("CANCELLED", "Cancelled"),
        ("VOID",      "Void"),
    ]

    reference        = models.CharField(max_length=64, unique=True, db_index=True,
                                        default=generate_invoice_reference)

    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    currency         = models.CharField(max_length=3, choices=Payment.CURRENCY_CHOICES,
                                        default="USD")
    description      = models.CharField(max_length=255, blank=True, null=True)

    status           = models.CharField(max_length=16, choices=STATUS_CHOICES,
                                        default="DRAFT", db_index=True)

    # Who owes the money — one of these is set (or none for a walk-in)
    payer_person     = models.ForeignKey("users.Person", on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="invoices_as_person")
    payer_company    = models.ForeignKey("users.Company", on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="invoices_as_company")
    payer_phone      = models.CharField(max_length=15, blank=True, null=True,
                                        help_text="Phone used when no Person/Company FK is available")

    # Running totals — updated whenever a Payment is applied
    amount_paid      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_credited  = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                           help_text="Sum of overpayment credits created from this invoice")
    amount_due       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    due_date         = models.DateField(null=True, blank=True)
    metadata         = models.JSONField(default=dict, blank=True)

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_invoice"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["payer_phone"]),
            models.Index(fields=["payer_person", "status"]),
            models.Index(fields=["payer_company", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.amount} {self.currency} [{self.status}]"

    @property
    def is_terminal(self):
        return self.status in {"PAID", "OVERPAID", "CANCELLED", "VOID"}

    def recalculate(self, save=True):
        """
        Recompute amount_paid / amount_due / status from linked Payments
        and credits. Call after any Payment or Credit changes.
        """
        paid = self.payments.filter(
            status="COMPLETED"
        ).aggregate(s=models.Sum("amount"))["s"] or Decimal("0")
        credited = self.credits_out.aggregate(
            s=models.Sum("amount")
        )["s"] or Decimal("0")

        self.amount_paid     = paid
        self.amount_credited = credited
        self.amount_due      = (self.amount - paid - credited).quantize(Decimal("0.01"))

        # Status transitions
        if self.status in {"CANCELLED", "VOID"}:
            pass
        elif self.amount_due <= Decimal("0.00") and paid > Decimal("0.00"):
            self.status = "PAID" if self.amount_due == Decimal("0.00") else "OVERPAID"
        elif paid > Decimal("0.00"):
            self.status = "PARTIAL"
        elif self.status == "DRAFT":
            pass  # keep DRAFT until issued
        else:
            self.status = "ISSUED"

        if save:
            self.save(update_fields=["amount_paid", "amount_credited",
                                     "amount_due", "status", "updated_at"])
        return self


class Credit(models.Model):
    """
    Unallocated or overpaid money. It sits on a phone (or Person/Company) until
    it is either applied to an Invoice (which creates a CreditAllocation row)
    or refunded. This is how overpayments and pre-payments are tracked.
    """

    SOURCE_CHOICES = [
        ("OVERPAYMENT", "Overpayment on invoice"),
        ("UNALLOCATED", "Payment with no invoice"),
        ("MANUAL",      "Manual credit"),
        ("REFUND_REVERSAL", "Refund reversal"),
    ]

    reference        = models.CharField(max_length=64, unique=True, db_index=True,
                                        default=generate_credit_reference)
    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    remaining        = models.DecimalField(max_digits=12, decimal_places=2,
                                           help_text="Amount not yet allocated to an invoice")
    currency         = models.CharField(max_length=3, choices=Payment.CURRENCY_CHOICES,
                                        default="USD")
    source           = models.CharField(max_length=16, choices=SOURCE_CHOICES,
                                        default="UNALLOCATED")

    # Who owns this credit
    person           = models.ForeignKey("users.Person", on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="credits")
    company          = models.ForeignKey("users.Company", on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="credits")
    phone            = models.CharField(max_length=15, blank=True, null=True, db_index=True)

    # Where the credit came from
    source_payment   = models.ForeignKey("payments.Payment", on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="credits_out")
    source_invoice   = models.ForeignKey(Invoice, on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name="credits_out")

    notes            = models.TextField(blank=True, null=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_credit"
        indexes = [
            models.Index(fields=["phone", "is_active"]),
            models.Index(fields=["person", "is_active"]),
            models.Index(fields=["company", "is_active"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.remaining}/{self.amount} {self.currency}"


class CreditAllocation(models.Model):
    """
    A single application of a Credit to an Invoice. Kept as its own row so we
    can audit exactly which credit paid which invoice, and by how much.
    """
    credit           = models.ForeignKey(Credit, on_delete=models.CASCADE,
                                         related_name="allocations")
    invoice          = models.ForeignKey(Invoice, on_delete=models.CASCADE,
                                         related_name="credit_allocations")
    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    created_at       = models.DateTimeField(auto_now_add=True)
    created_by       = models.ForeignKey("users.User", on_delete=models.SET_NULL,
                                         null=True, blank=True)

    class Meta:
        db_table = "payments_creditallocation"
        indexes = [
            models.Index(fields=["invoice"]),
            models.Index(fields=["credit"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.credit.reference} → {self.invoice.reference} ({self.amount})"