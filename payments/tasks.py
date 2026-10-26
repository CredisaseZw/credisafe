# payments/tasks.py
import logging
import time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Payment
from .services import PaymentService

logger = logging.getLogger(__name__)


def poll_pending_payments(batch_size: int = 100) -> int:
    """
    One polling pass. Called by Celery beat or the management command.
    Returns the number of payments updated (non-terminal -> possibly terminal).
    """
    cutoff = timezone.now() - timedelta(hours=settings.FINIVEX_POLL_MAX_AGE_HOURS)
    pending = (
        Payment.objects
        .filter(status__in=["PENDING", "PROCESSING"], created_at__gte=cutoff)
        .order_by("last_polled_at")[:batch_size]
    )

    updated = 0
    for payment in pending:
        before = payment.status
        try:
            PaymentService.refresh_status(payment)
        except Exception:
            logger.exception("Failed refreshing %s", payment.reference)
            continue
        if payment.status != before:
            updated += 1
    if updated:
        logger.info("Payment poller: %d status(es) changed", updated)
    return updated


# --- Optional Celery integration ---------------------------------------
try:
    from celery import shared_task

    @shared_task
    def poll_pending_payments_task():
        return poll_pending_payments()
except ImportError:
    pass


# --- Fallback: run forever in-process (use systemd / supervisor) --------
def run_poller_forever():
    interval = getattr(settings, "FINIVEX_POLL_INTERVAL", 60)
    logger.info("Payment poller started (interval=%ss)", interval)
    while True:
        try:
            poll_pending_payments()
        except Exception:
            logger.exception("Polling pass failed")
        time.sleep(interval)