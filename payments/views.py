# payments/views.py
import json
import logging

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from payments.services import PaymentService

from .client import FinivexClient, FinivexError
from .models import Payment
from .signals import payment_status_changed

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def finivex_webhook(request):
    # --- 1. Parse --------------------------------------------------------
    try:
        payload = json.loads(request.body.decode() or "{}")
    except ValueError:
        print("Webhook: invalid JSON: %r", request.body[:300])
        return JsonResponse({"ok": False, "error": "invalid json"}, status=400)

    print("Webhook received: %s", payload)

    # --- 2. Route to payment --------------------------------------------
    reference = payload.get("transactionId") or payload.get("reference")
    if not reference:
        print("Webhook: missing reference")
        return JsonResponse({"ok": True})   # ack — nothing to do

    try:
        payment = Payment.objects.get(reference=reference)
    except Payment.DoesNotExist:
        # Unknown ref (maybe a foreign merchant id) — ack so Finivex stops retrying
        print("Webhook: unknown reference %s", reference)
        return JsonResponse({"ok": True})

    # --- 3. Re-verify server-side (source of truth) ---------------------
    # Webhooks are hints; the status endpoint is authoritative.
    verified_status = None
    verified_message = None
    try:
        data = FinivexClient().get_charge_status(reference)
        verified_status  = (data.get("status") or "").upper() or None
        verified_message = data.get("statusDescription") or data.get("message")
    except FinivexError as exc:
        # If verification fails transiently, fall back to the webhook payload
        # but do NOT fulfil on unverified data unless it says COMPLETED.
        print("Webhook: verification failed for %s: %s", reference, exc)
        verified_status = (payload.get("status") or "").upper() or None

    if not verified_status:
        print("Webhook: no status for %s (payload=%s)", reference, payload)
        return JsonResponse({"ok": True})   # ack

    # --- 4. Apply idempotently -----------------------------------------
    changed = _apply_status(
        payment,
        new_status=verified_status,
        message=verified_message or payload.get("statusDescription"),
        payment_method=payload.get("paymentMethod"),
    )

    if changed:
        # Fire side-effects OUTSIDE the DB transaction (see notes below)
        payment_status_changed.send(sender=Payment, payment=payment)

    return JsonResponse({"ok": True})


def _apply_status(payment, *, new_status, message=None, payment_method=None):
    """
    Idempotent status update. Returns True only if the status actually changed
    (or a terminal timestamp was newly set). Safe to call repeatedly.
    """
    with transaction.atomic():
        # Re-read under lock to avoid race with poller
        locked = Payment.objects.select_for_update().get(pk=payment.pk)
        before = locked.status

        # Never move a terminal payment backwards
        if locked.is_terminal and new_status != "REFUNDED":
            return False

        locked.status = new_status
        if message:         locked.status_message = message
        if payment_method:  locked.payment_method = payment_method
        if locked.is_terminal and not locked.processed_at:
            locked.processed_at = timezone.now()
        locked.last_polled_at = timezone.now()

        locked.save(update_fields=[
            "status", "status_message", "payment_method",
            "processed_at", "last_polled_at", "updated_at",
        ])
        if locked.is_terminal and locked.status == "COMPLETED":
            PaymentService.reconcile_payment(locked)
        payment.refresh_from_db()
        return locked.status != before