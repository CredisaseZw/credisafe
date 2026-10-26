# payments/signals.py
from django.dispatch import Signal

payment_status_changed = Signal()   # kwargs: payment