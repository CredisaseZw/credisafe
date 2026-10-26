# payments/services.py
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .client import FinivexClient, FinivexError
from .models import Payment, Credit, Invoice, CreditAllocation

logger = logging.getLogger(__name__)


class PaymentService:
    """
    High-level service. Call these methods from anywhere:

        from payments.services import PaymentService

        payment = PaymentService.create_hosted_checkout(
            payer=person, amount=Decimal("10.00"), currency="USD",
            description="Top-up", return_url=request.build_absolute_uri("/done/"),
        )
        # -> redirect user to payment.redirect_url

        PaymentService.refresh_status(payment)   # check now
        PaymentService.refund(payment, reason="Customer request")
    """

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------
    @classmethod
    def charge(cls, *, phone_number: str, amount, currency="USD",
               description=None, payment_method="ECOCASH",
               payer=None, invoice=None, metadata=None) -> Payment:
        """
        Push a direct USSD/PIN charge to a phone.

        If `invoice` is given, the resulting Payment is linked to it, and on
        COMPLETED the invoice is recalculated and any overpayment is turned
        into a Credit. If `invoice` is None, the payment is unallocated — on
        COMPLETED it becomes a Credit too, so it can be applied later.
        """
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        currency = currency.upper()
        payment_method= payment_method.upper()
        # If an invoice is supplied, make sure currency matches and lock it
        if invoice is not None:
            if invoice.currency != currency:
                raise ValueError(
                    f"Invoice currency {invoice.currency} != charge currency {currency}"
                )

        reference = Payment.new_reference(prefix="CHG")

        payment = Payment.objects.create(
            reference=reference,
            amount=amount,
            currency=currency,
            description=description or (invoice.description if invoice else ""),
            payment_method=payment_method,
            payer=payer,
            payer_phone=phone_number,
            invoice=invoice,
            metadata=metadata or {},
            status="PENDING",
        )

        client = FinivexClient()
        try:
            sess = client.create_widget_session(
                transaction_id=reference, amount=amount, currency=currency,
            )
            data = client.direct_charge(
                session_token=sess["sessionToken"],
                reference=reference,
                payment_method=payment_method,
                customer_phone=phone_number,
                amount=amount,
                currency=currency,
                description=payment.description,
                callback_url=settings.FINIVEX_WEBHOOK_URL,
            )
        except FinivexError as exc:
            payment.status = "FAILED"
            payment.status_message = str(exc)
            payment.save(update_fields=["status", "status_message", "updated_at"])
            print("Charge failed for %s: %s", reference, exc)
            raise

        payment.provider_ref   = data.get("providerReference")
        payment.status         = (data.get("status") or "PROCESSING").upper()
        payment.status_message = data.get("message")
        payment.save(update_fields=["provider_ref", "status",
                                    "status_message", "updated_at"])
        return payment
        
    
    @classmethod
    def create_hosted_checkout(cls, *, payer=None, amount, currency="USD",
                               description=None, return_url=None, cancel_url=None,
                               payment_method=None, metadata=None) -> Payment:
        """
        Create a Payment row + a Finivex hosted checkout session.
        Returns the Payment with `.redirect_url` populated.
        """
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        reference = Payment.new_reference()

        payment = Payment.objects.create(
            reference=reference,
            amount=amount,
            currency=currency.upper(),
            description=description or "",
            payer=payer,
            payer_phone=getattr(payer, "phone_number", None),
            metadata=metadata or {},
            payment_method=payment_method,
            status="PENDING",
        )

        client = FinivexClient()
        try:
            data = client.create_hosted_checkout(
                transaction_id=payment.reference,
                amount=payment.amount,
                currency=payment.currency,
                description=payment.description,
                return_url=return_url,
                cancel_url=cancel_url,
            )
        except FinivexError as exc:
            payment.status = "FAILED"
            payment.status_message = str(exc)
            payment.save(update_fields=["status", "status_message", "updated_at"])
            logger.exception("Hosted checkout failed for %s", payment.reference)
            raise

        payment.provider_ref = data.get("orderId") or data.get("transactionRef")
        payment.redirect_url = data.get("redirectUrl")
        payment.status = "PENDING"
        payment.status_message = data.get("message")
        payment.save(update_fields=["provider_ref", "redirect_url", "status",
                                    "status_message", "updated_at"])
        return payment

    @classmethod
    def create_payment_link(cls, *, payer=None, amount, currency="USD",
                            description=None, redirect_url=None,
                            expires_in_minutes=1440, metadata=None) -> Payment:
        """Create a shareable payment link (no browser integration needed)."""
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        reference = Payment.new_reference(prefix="LINK")

        payment = Payment.objects.create(
            reference=reference,
            amount=amount,
            currency=currency.upper(),
            description=description or "",
            payer=payer,
            payer_phone=getattr(payer, "phone_number", None),
            metadata=metadata or {},
            status="PENDING",
        )

        client = FinivexClient()
        try:
            data = client.create_payment_link(
                amount=payment.amount,
                currency=payment.currency,
                description=payment.description,
                customer_email=payment.payer_email,
                customer_phone=payment.payer_phone,
                redirect_url=redirect_url,
                expires_in_minutes=expires_in_minutes,
            )
        except FinivexError as exc:
            payment.status = "FAILED"
            payment.status_message = str(exc)
            payment.save(update_fields=["status", "status_message", "updated_at"])
            raise

        payment.provider_ref = data.get("reference")
        payment.payment_link = data.get("paymentLink")
        payment.save(update_fields=["provider_ref", "payment_link", "updated_at"])
        return payment

    # ------------------------------------------------------------------
    # Tracking
    # ------------------------------------------------------------------
    @classmethod
    def refresh_status(cls, payment: Payment) -> Payment:
        if payment.is_terminal:
            return payment
        client = FinivexClient()
        try:
            data = client.get_charge_status(payment.reference)
        except FinivexError as exc:
            logger.warning("Refresh failed for %s: %s", payment.reference, exc)
            return payment

        new_status = (data.get("status") or "").upper()
        if not new_status:
            return payment

        from .views import _apply_status  
        changed = _apply_status(
            payment,
            new_status=new_status,
            message=data.get("statusDescription") or data.get("message"),
            payment_method=data.get("paymentMethod"),
        )
        if changed:
            from .signals import payment_status_changed
            payment_status_changed.send(sender=Payment, payment=payment)
        return payment


    @classmethod
    def apply_webhook(cls, payload: dict) -> Payment | None:
        """
        Handle a Finivex webhook payload. Idempotent.
        Returns the updated Payment or None if unknown.
        """
        reference = payload.get("transactionId") or payload.get("reference")
        if not reference:
            return None
        payment = Payment.objects.filter(reference=reference).first()
        if not payment:
            logger.warning("Webhook for unknown reference %s", reference)
            return None

        with transaction.atomic():
            status = (payload.get("status") or "").upper()
            if status and status != payment.status:
                payment.status = status
            payment.status_message = payload.get("statusDescription") or payment.status_message
            payment.payment_method = payload.get("paymentMethod") or payment.payment_method
            payment.processed_at = payment.processed_at or (
                timezone.now() if payment.is_terminal else None
            )
            payment.save()

        cls._on_status_change(payment)
        return payment

    # ------------------------------------------------------------------
    # Refund
    # ------------------------------------------------------------------
    @classmethod
    def refund(cls, payment: Payment, *, reason: str) -> Payment:
        if payment.status != "COMPLETED":
            raise ValueError("Only COMPLETED payments can be refunded")
        if not payment.payment_method:
            raise ValueError("Payment method is required for refunds")

        client = FinivexClient()
        try:
            data = client.refund(
                transaction_id=payment.reference,
                reason=reason,
                payment_method=payment.payment_method,
            )
        except FinivexError:
            logger.exception("Refund failed for %s", payment.reference)
            raise

        payment.status = "REFUNDED"
        payment.status_message = reason
        payment.save(update_fields=["status", "status_message", "updated_at"])
        cls._on_status_change(payment)
        return payment

    # ------------------------------------------------------------------
    # Hook for application side-effects
    # ------------------------------------------------------------------
    @classmethod
    def _on_status_change(cls, payment: Payment):
        """
        Called after any status change. Put your app-specific logic here:
        credit a wallet, mark an invoice paid, notify the Person, etc.
        Keep it fast & idempotent — it may run more than once.
        """
        from .signals import payment_status_changed
        payment_status_changed.send(sender=Payment, payment=payment)

    @classmethod
    def reconcile_payment(cls, payment: Payment):
        """
        Called after a Payment has been marked COMPLETED (terminal).
        Idempotent: uses Payment.metadata['reconciled'] flag and
        Credit.source_payment uniqueness to guarantee single application.

        Cases:
          A) Payment has invoice:
               - Apply payment amount to invoice.
               - If payment > invoice.amount_due (or total paid would exceed),
                 create a Credit for the difference.
               - Recalculate invoice status.
          B) Payment has no invoice (walk-in / pre-payment):
               - Create a Credit for the full amount.
        """
        if payment.status != "COMPLETED":
            return
        if payment.metadata.get("reconciled"):
            return  # already done

        with transaction.atomic():
            # Lock payment row to prevent double reconcile from
            # webhook + poller running concurrently
            locked = Payment.objects.select_for_update().get(pk=payment.pk)
            if locked.metadata.get("reconciled"):
                payment.refresh_from_db()
                return

            if locked.invoice_id:
                invoice = Invoice.objects.select_for_update().get(pk=locked.invoice_id)

                # How much of this payment can be applied?
                # amount_due is amount - already_paid - credited
                invoice.recalculate(save=False)
                due = max(invoice.amount_due, Decimal("0.00"))
                apply_now = min(locked.amount, due)
                overpay   = (locked.amount - apply_now).quantize(Decimal("0.01"))

                # Refresh invoice totals from completed payments, this
                # payment is already COMPLETED so it counts
                invoice.recalculate(save=True)

                if overpay > Decimal("0.00"):
                    # Turn the excess into a Credit
                    Credit.objects.create(
                        amount=overpay,
                        remaining=overpay,
                        currency=locked.currency,
                        source="OVERPAYMENT",
                        person=invoice.payer_person,
                        company=invoice.payer_company,
                        phone=locked.payer_phone or invoice.payer_phone,
                        source_payment=locked,
                        source_invoice=invoice,
                        notes=f"Overpayment on {invoice.reference}",
                    )
            else:
                # No invoice → full amount becomes an unallocated Credit
                Credit.objects.create(
                    amount=locked.amount,
                    remaining=locked.amount,
                    currency=locked.currency,
                    source="UNALLOCATED",
                    person=locked.payer,
                    phone=locked.payer_phone,
                    source_payment=locked,
                    notes=f"Unallocated payment {locked.reference}",
                )

            # Mark reconciled
            meta = dict(locked.metadata or {})
            meta["reconciled"] = True
            meta["reconciled_at"] = timezone.now().isoformat()
            locked.metadata = meta
            locked.save(update_fields=["metadata", "updated_at"])

        payment.refresh_from_db()
        
    @classmethod
    def allocate_credit(cls, *, credit: Credit, invoice: Invoice,
                        amount=None, created_by=None):
        """
        Apply (part of) a Credit to an Invoice. Amount defaults to min(remaining, due).
        Creates a CreditAllocation audit row and recalculates the invoice.
        """
        amount = Decimal(str(amount)).quantize(Decimal("0.01")) if amount else None

        with transaction.atomic():
            credit   = Credit.objects.select_for_update().get(pk=credit.pk)
            invoice  = Invoice.objects.select_for_update().get(pk=invoice.pk)

            if credit.currency != invoice.currency:
                raise ValueError("Currency mismatch")
            if not credit.is_active or credit.remaining <= Decimal("0.00"):
                raise ValueError("Credit has nothing left to allocate")

            invoice.recalculate(save=False)
            due = max(invoice.amount_due, Decimal("0.00"))

            if amount is None:
                amount = min(credit.remaining, due)
            if amount <= Decimal("0.00"):
                raise ValueError("Nothing to allocate")
            if amount > credit.remaining:
                raise ValueError("Allocation exceeds credit remaining")
            if amount > due:
                raise ValueError("Allocation exceeds invoice amount due")

            CreditAllocation.objects.create(
                credit=credit, invoice=invoice, amount=amount, created_by=created_by,
            )
            credit.remaining -= amount
            if credit.remaining <= Decimal("0.00"):
                credit.is_active = False
            credit.save(update_fields=["remaining", "is_active", "updated_at"])

            invoice.recalculate(save=True)

        return credit, invoice    
        
    @classmethod
    def create_invoice(cls, *, amount, currency="USD", description=None,
                       person=None, company=None, phone=None,
                       due_date=None, issue=True, metadata=None) -> Invoice:
        """Create an invoice. If issue=True, mark it ISSUED so it can be charged."""
        amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        inv = Invoice.objects.create(
            amount=amount,
            currency=currency.upper(),
            description=description or "",
            payer_person=person,
            payer_company=company,
            payer_phone=phone or getattr(person, "phone_number", None),
            due_date=due_date,
            metadata=metadata or {},
            status="ISSUED" if issue else "DRAFT",
        )
        inv.recalculate()
        return inv
        
        
        
        