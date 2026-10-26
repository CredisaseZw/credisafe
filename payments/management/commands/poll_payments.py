# payments/management/commands/poll_payments.py
from django.core.management.base import BaseCommand
from payments.tasks import poll_pending_payments, run_poller_forever


class Command(BaseCommand):
    help = "Poll Finivex for pending payment statuses"

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true",
                            help="Run forever instead of a single pass")

    def handle(self, *args, **opts):
        if opts["loop"]:
            run_poller_forever()
        else:
            n = poll_pending_payments()
            self.stdout.write(self.style.SUCCESS(f"Updated {n} payment(s)"))