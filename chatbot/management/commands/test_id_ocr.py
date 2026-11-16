
from pprint import pprint

from django.core.management.base import BaseCommand, CommandError

from users.models import Person
from chatbot.id_verification import verify_id_from_image


class Command(BaseCommand):
    help = "Test the production ID verification service"

    def add_arguments(self, parser):
        parser.add_argument(
            "--national-id",
            required=True,
            help="National ID of the person to verify",
        )

    def handle(self, *args, **options):

        national_id = options["national_id"]

        # Find the actual person object
        person = Person.objects.filter(
            national_id__iexact=national_id
        ).first()

        if not person:
            raise CommandError(
                f"No person found with national ID: {national_id}"
            )

        self.stdout.write(
            self.style.SUCCESS(f"Person found: {person}")
        )

        self.stdout.write(f"Person PK: {person.pk}")
        self.stdout.write(f"Phone: {person.phone_number}")

        # Call the actual production service
        self.stdout.write("\nRunning production verification...\n")

        result = verify_id_from_image(person)

        # Display the exact response returned by the service
        self.stdout.write("\nVERIFICATION RESPONSE:")
        pprint(result, sort_dicts=False)

        self.stdout.write("\nDATABASE STATE:")

        person.refresh_from_db()

        self.stdout.write(
            f"Verified: {person.is_verified}"
        )
        self.stdout.write(
            f"Auto verified: {person.is_auto_verified}"
        )
        self.stdout.write(
            f"Manual review: {person.needs_manual_review}"
        )
        self.stdout.write(
            f"Score: {person.id_verification_score}"
        )
        self.stdout.write(
            f"Status: {person.verification_status}"
        )
