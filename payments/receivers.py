# payments/receivers.py
import logging

from django.dispatch import receiver

from .models import Payment
from .signals import payment_status_changed

logger = logging.getLogger(__name__)


@receiver(payment_status_changed, dispatch_uid="payments.on_status_change")
def on_payment_status_change(sender, payment: Payment, **kwargs):
    """
    Single entry point for post-payment side effects.
    Dispatches on payment.metadata["kind"]. Each handler is idempotent.
    """
    if payment.status != "COMPLETED":
        return

    kind = (payment.metadata or {}).get("kind")
    if not kind:
        logger.debug("Payment %s completed with no kind; nothing to do.",
                     payment.reference)
        return

    handler = _HANDLERS.get(kind)
    if not handler:
        logger.warning("No handler for kind=%r (ref=%s)", kind, payment.reference)
        return

    try:
        handler(payment)
    except Exception:
        # Never let this bubble back into the webhook — status is already
        # committed and 200 has been returned.
        logger.exception("Handler for kind=%r failed (ref=%s)",
                         kind, payment.reference)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _handle_credit_report_fee(payment: Payment):
    """Checker paid for a credit report — deliver it to the checker."""
    from credit.models import CreditCheck
    from chatbot.whatsapp_client    import WhatsAppClient        
    from chatbot.handlers import MessageHandler            

    credit_check = CreditCheck.objects.filter(
        payment_reference=payment.reference
    ).first()

    if not credit_check:
        logger.warning("Report fee paid but no CreditCheck linked to %s",
                       payment.reference)
        return

    # Idempotency: already delivered?
    if credit_check.status == "completed" and credit_check.checked_at:
        logger.info("CreditCheck %s already delivered; skipping.", credit_check.id)
        return

    # CreditCheck.status must be in awaiting_payment or payment_processing
    # at this point. deliver_credit_report flips it to 'completed'.
    bot = MessageHandler(whatsapp=WhatsAppClient())
    bot.deliver_credit_report(credit_check, credit_check.subject)

    logger.info("Delivered credit report for CreditCheck %s (payment %s)",
                credit_check.id, payment.reference)


def _handle_credit_acceptance_fee(payment: Payment):
    """Lender paid the activation fee — activate the contract and notify both."""
    from credit.models import LendingContract
    from chatbot.whatsapp_client import WhatsAppClient

    contract = LendingContract.objects.filter(
        payment_reference=payment.reference
    ).first()

    if not contract:
        logger.warning("Acceptance fee paid but no LendingContract linked to %s",
                       payment.reference)
        return

    if contract.status == "active":
        logger.info("Contract %s already active; skipping.", contract.id)
        return

    contract.status = "active"
    contract.save(update_fields=["status", "updated_at"])

    wa = WhatsAppClient()

    # --- confirmation to the LENDER ---
    wa.send_message(
        contract.lender.phone_number,
        f"Payment received. Your contract with {contract.borrower.full_name} "
        f"({contract.borrower.national_id}) for "
        f"{contract.currency.upper()}{contract.amount} is now active."
    )

_HANDLERS = {
    "credit_report_fee":     _handle_credit_report_fee,
    "credit_acceptance_fee": _handle_credit_acceptance_fee,
}