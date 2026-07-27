from users.models import Person
from chatbot.whatsapp_client import WhatsAppClient
import random

def verify_person_service(person):
    whatsapp = WhatsAppClient()

    if getattr(person, 'uploader', None):

        person.user_mode = 'borrower_confirmation'
        person.save(update_fields=['user_mode'])

        subject_details = (
            "Do you accept addition of your details below to CrediSafe;\n\n"
            f"Name: {person.full_name}\n"
            f"ID Number: {person.national_id}\n"
            f"Address: {person.address}\n"
            f"Mobile Number: {person.phone_number}\n"
        )
        buttons = [
                {'id': 'yes', 'title': 'Yes'},
                {'id': 'edit', 'title': 'Edit Details'},
                {'id': 'reject', 'title': 'Reject'},
                ]
        whatsapp.send_interactive_buttons(person.phone_number, subject_details, buttons)

        # whatsapp.send_message(person.phone_number, subject_details)

    else:
        person.verification_status = 'verified'
        person.is_verified = True
        person.save(update_fields=['verification_status', 'is_verified'])

        whatsapp.send_message(
            person.phone_number,
            "Congratulations! Your account has been verified on CrediSafe, send hi to get started."
        )

    return person