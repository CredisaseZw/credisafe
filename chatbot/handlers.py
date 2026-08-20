import re
import random
import string
from datetime import datetime, timedelta
from django.utils import timezone
from users.models import Person
from credit.models import CreditCheck, CreditHistory, LendingContract, CreditCheckAudit, Receipt
from chatbot.whatsapp_client import WhatsAppClient
import logging
from chatbot.models import WhatsAppMessage
from chatbot.validators import validate_name, validate_address
import time
from decimal import Decimal
from django.db.models import Sum

logger = logging.getLogger(__name__)

class MessageHandler:
    def __init__(self):
        self.whatsapp = WhatsAppClient()
    
    def generate_otp(self):
        """Generate 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=4))
    
    def send_sms(self, phone_number, message):
        """Send SMS using your SMS provider (e.g., Africa's Talking)"""
        from django.conf import settings
        from requests import request
        sms_api = settings.SMS_API_KEY
        sms_url = settings.SMS_URL
        params = (
            {
                "apikey": sms_api,
                "mobiles": phone_number,
                "sms": message,
            }
            
        )
        response = request.get(sms_url, params=params)
        # Implement your SMS sending logic here
        # This is a placeholder
        logger.info(f"SMS to {phone_number}: {message}")
        return True
    
    def handle_incoming_message(self, from_number, message_text,message_id=None, is_quoted=False, direction="incoming"):
        """Main handler for incoming WhatsApp messages"""
        # Save incoming message
        if message_id:
            existing = WhatsAppMessage.objects.filter(
                whatsapp_message_id=message_id,
                direction='incoming'
            ).first()
            if existing:
                logger.info(f"Duplicate message {message_id} from {from_number} - ignoring")
                return
        
        # Get or create person
        person, created = Person.objects.get_or_create(
            phone_number=from_number,
            defaults={'user_mode': 'signup', 'user_status': 'national_id'}
        )
        if message_text.lower().startswith("verify ") and from_number[-8:] in ["79586059","72219151"]:
            from chatbot.services import verify_person_service
            national_id = message_text[7:].strip()
            person = Person.objects.filter(national_id__iexact=national_id).first()

            if not person:
                self.whatsapp.send_message(
                    from_number,
                    f"No person found with ID {national_id}."
                )
                return

            verify_person_service(person)

            self.whatsapp.send_message(
                from_number,
                f"Verification process started for {person.full_name}."
            )
            return
        
        # Store message first - this ensures it's saved even if processing fails
        # But only for actual incoming messages (not system/status)
        if message_text or message_id:
            incoming_msg = WhatsAppMessage.objects.create(
                person=person,
                direction=direction,  # Strictly incoming
                content=message_text or f"Interactive response: {message_id}",
                whatsapp_message_id=message_id,  # Always save the message_id
                # message_type=message_type,
                # raw_payload=message_data
            )
            logger.info(f"Saved incoming message {message_id} from {from_number}")

        if person.is_verified and person.user_mode !='borrower_signup' and  message_text.lower() in ["hi", "hello", "hey","hie"]:
            return self.welcome_user(person)
        
        if message_text.lower() in ["exit", "quit", "q","cancel"]:
            return self.show_main_menu(person)
        
        # Route based on user mode
        
        if person.user_mode == 'login':
            return self.handle_login(person, message_text)
        
        elif person.user_mode =="borrower_confirmation":
            return self.handle_borrower_confirmation(person, message_text)
        
        elif person.user_mode =="addition_aborted":
            self.whatsapp.send_message(person.phone_number, "You rejected addition of your details to CrediSafe. Please contact us at +263715239711 if you change your mind or if you have any questions.")
        
        elif person.user_mode == "edit_borrower":
            self.whatsapp.send_message(person.phone_number, "This feature is currently in staging, stay tuned for updates!")
        elif person.user_mode =='borrower_signup':
            return self.handle_new_borrower(person, message_text)
        
        elif person.user_mode in ["edit_profile", "signup"]:
            return self.handle_signup(person, message_text)
        elif person.user_mode == 'credit_check' or message_text.lower() =="give credit":
            
            return self.handle_credit_check(person, message_text)
        elif person.user_mode == 'offer_service' or message_text.lower() in ["payment status check", "check"]:
            # return self.whatsapp.send_message(person.phone_number, "This feature is currently in staging, stay tuned for updates!")
            return self.handle_offer_service(person, message_text)
        elif person.user_mode == 'lend_money':
            # return self.whatsapp.send_message(person.phone_number, "Lending Option in dev..")
            return self.handle_lend_money(person, message_text)
        elif person.user_mode =="accept_credit":
            return self.handle_accept_credit(person, message_text)
        
        elif person.user_mode == "accounting" or message_text.lower() in ["accounting", "receipt"]:
            return self.handle_accounting(person, message_text)
        elif person.user_mode == 'receipting':
            return self.handle_receipting(person, message_text)
        elif person.user_mode == 'statements':
            return self.handle_statements(person, message_text)
        
        elif person.user_mode == 'track_lended':
            # return self.whatsapp.send_message(person.phone_number, "Tracking Logic in dev..")
            
            return self.handle_track_lended(person, message_text)
        elif person.user_mode == 'settle_debt':
            return self.whatsapp.send_message(person.phone_number, "This feature is in development")
            
            return self.handle_settle_debt(person, message_text)
        elif person.user_mode == 'welcome':
            return self.welcome_user(person)
        else:
            return self.show_main_menu(person)
    
    def handle_receipting(self, person, message_text):
        if person.user_status == "receipt_date":
            # Handle receipt date here
            selected_credit_to_receipt = person.get_session_key("selected_credit_to_receipt")
            credit = LendingContract.objects.filter(id=selected_credit_to_receipt).first()
            if not credit:
                self.whatsapp.send_message(person.phone_number, "An error occurred. Please try again.")
                person.user_status = None
                person.save(update_fields=["user_status"])
                return self.show_main_menu(person)
            if not message_text:
                response = (
                    "❌ Invalid receipt date. Please enter a valid date "
                    "(e.g., 4 July 2026 or 4/7/2026):"
                )
                self.whatsapp.send_message(person.phone_number, response)
                return False

            formats = [
                "%d %B %Y",   # 4 July 2026
                "%d %b %Y",   # 4 Jul 2026
                "%d/%m/%Y",   # 4/7/2026
                "%d-%m-%Y",   # 4-7-2026
                "%Y-%m-%d",   # 2026-07-04
            ]

            due_date = None

            for fmt in formats:
                try:
                    due_date = datetime.strptime(message_text.strip(), fmt).date()

                    break
                except ValueError:
                    continue

            if due_date is None:
                response = (
                    "❌ Invalid receipt date. Please enter a valid date "
                    "(e.g., 4 July 2026 or 4/7/2026):"
                )
                buttons = [
                            {'id': 'exit', 'title': 'Exit'},
                            ]
                self.whatsapp.send_interactive_buttons(person.phone_number, response, buttons)
                        
                # self.whatsapp.send_message(person.phone_number, response)
                return False

            # Make timezone-aware if USE_TZ=True
            receipt_ob =Receipt.objects.create(
                lending_contract=credit,
                receipt_date=due_date,
                confirmed=False
            )
            person.user_status = "enter_receipt_amount"
            person.set_session_data("pending_receipt_id", receipt_ob.id)
            person.save()
            message = f"Please enter received amount from {credit.borrower.full_name} ({credit.borrower.national_id}) "
            self.whatsapp.send_message(person.phone_number, message)
            return True
        
        elif person.user_status == "enter_receipt_amount":
            pending_receipt_id = person.get_session_key("pending_receipt_id")
            receipt = Receipt.objects.filter(id=pending_receipt_id).first()
            if not receipt:
                self.whatsapp.send_message(person.phone_number, "An error occurred. Please try again. \n RCA-101")
                return self.show_main_menu(person)
            try:
                amount = Decimal(message_text.strip())
                if amount <= 0:
                    raise ValueError
            except:
                buttons = [
                            {'id': 'exit', 'title': 'Exit'},
                            ]
                self.whatsapp.send_interactive_buttons(person.phone_number, "Invalid amount. Please enter a valid number or", buttons)
                        
                # self.whatsapp.send_message(person.phone_number, "Invalid amount. Please enter a valid number.")
                return False
            currency = receipt.lending_contract.currency
            receipt.amount = amount
            receipt.currency = currency  # Default to contract currency
            receipt.save(update_fields=["amount", "currency"])
            person.user_status = "receipt_confirmation"
            person.save(update_fields=["user_status"])
            receipt_date= receipt.receipt_date.strftime("%d %B %Y")
            message = f"You have received {currency}{amount} from {receipt.lending_contract.borrower.full_name} ({receipt.lending_contract.borrower.national_id}) on {receipt_date}"
            buttons = [
                {'id': 'confirm', 'title': "Confirm"},
                {'id': 'back', 'title': 'Back'},
                {'id': 'exit', 'title': 'Exit'},
            ]
            return self.whatsapp.send_interactive_buttons(person.phone_number, message, buttons)
        
        elif person.user_status == "receipt_confirmation":
            if message_text.lower() == "confirm":
                receipt_id = person.get_session_key("pending_receipt_id")
                receipt = Receipt.objects.filter(id=receipt_id).first()
                if not receipt:
                    self.whatsapp.send_message(person.phone_number, "An error occurred. Please try again. \n RCA-102")
                    return self.show_main_menu(person)
                receipt.confirmed = True
                receipt.confirmed_at = timezone.now()
                receipt.save(update_fields=["confirmed", "confirmed_at"])
                person.user_mode = "welcome"
                person.save(update_fields=["user_mode"])
                contract = receipt.lending_contract

                total_paid = (
                    contract.receipts
                    .filter(confirmed=True)
                    .aggregate(total=Sum("amount"))["total"]
                    or Decimal("0.00")
                )

                balance_left = contract.amount - total_paid
                if total_paid >= contract.amount:
                    contract.status = "settled"
                    contract.settled_at = timezone.now()
                    contract.save(update_fields=["status", "settled_at"])

                    balance_left = Decimal("0.00")
                
                self.whatsapp.send_message(person.phone_number, "Receipt confirmed successfully.")
                borrower_ob = contract.borrower
                borrower_credit_history = self.get_credit_history(borrower_ob)
                borrower_payment_status = borrower_credit_history.get('default_risk', 'Low Risk')
                message_to_borrower = f"Hi {borrower_ob.full_name}. This is confirmation of your payment of {receipt.currency}{receipt.amount} to {contract.lender.full_name} balance left is {receipt.currency}{balance_left}. Your payment status is {borrower_payment_status}."
                return self.whatsapp.send_message(borrower_ob.phone_number, message_to_borrower)
        
        
        credits_given = LendingContract.objects.filter(
            lender=person,
            status="active"
        ).order_by("created_at")
        # If the user has replied with a number
        if message_text.isdigit():
            choice = int(message_text)

            # Convert QuerySet to a list
            credits = list(credits_given)

            if 1 <= choice <= len(credits):
                selected_credit = credits[choice - 1]  # because lists are 0-based

                borrower = selected_credit.borrower
                national_id = borrower.national_id

                # Do whatever you need
                self.whatsapp.send_message(
                    person.phone_number,
                    f"Please enter receipt date from {borrower.full_name} ({national_id}) \ne.g. 30/7/2026 for `30th July 2026`)"
                )
                person.user_status = "receipt_date"
                person.set_session_data("selected_credit_to_receipt", selected_credit.id)
                person.save()
                return

            self.whatsapp.send_message(
                person.phone_number,
                "Invalid selection. Please choose a valid number."
            )
            return

        # Otherwise send the menu
        receipt_menu = "Receipt\n"

        credits = list(credits_given)

        if not credits:
            self.whatsapp.send_message(
                person.phone_number,
                "You have no active credits to receipt."
            )
            person.user_mode = "welcome"
            person.save(update_fields=["user_mode"])
            return self.show_main_menu(person)

        for i, credit in enumerate(credits, start=1):
            receipt_menu += (
                f"{i}. {credit.borrower.full_name}"
                f" ({credit.borrower.national_id})"
                f" - {credit.currency}{credit.amount}\n"
            )

        receipt_menu += "\nOther\nBack\nExit"

        return self.whatsapp.send_message(person.phone_number, receipt_menu)
    
    def handle_statements(self,person,message_text):
        return self.whatsapp.send_message(person.phone_number, "This feature is in development")
    
    def handle_accounting(self, person, message_text):
        if message_text.lower() == "receipting":
            person.user_mode = "receipting"
            person.save(update_fields=["user_mode"])
            return self.handle_receipting(person, message_text)
        elif message_text.lower() == "statement":
            person.user_mode = "statements"
            person.save(update_fields=["user_mode"])
            return self.handle_statements(person, message_text)
        if person.user_mode == 'receipting':
            if message_text.lower() in ['1', '1.', 'receipting']:
                return self.handle_receipting(person, message_text)
        if person.user_mode == 'statements':
            if message_text.lower() in ['2', '2.', 'statement']:
                return self.handle_statements(person, message_text)
        else:
            buttons = [
                {'id': 'receipting', 'title': "Receipting"},
                {'id': 'statement', 'title': 'Statement'},
                {'id': 'exit', 'title': 'Exit'},
            ]
            person.user_mode = "accounting"
            person.save(update_fields=["user_mode"])
            return self.whatsapp.send_interactive_buttons(person.phone_number, "Accounting", buttons)
    
    def handle_borrower_confirmation(self, person, message_text):

        uploader = getattr(person, 'uploader', None)
        if message_text.lower() in ["yes", "y","1"]:
            person.user_status = "otp_setup"
            person.user_mode ="signup"
            person.is_verified = True
            person.verification_status = "verified"
            person.save(update_fields=["user_status","user_mode","is_verified","verification_status"])
            message_to_subject = "Your details have been added successfully. Enter a 4-digit code for future access"
            self.whatsapp.send_message(person.phone_number, message_to_subject)
            # title_two = "Get Credit"
            if uploader:
                title_one ="Give Credit"
                message_to_creditor = f"{person.full_name} - {person.national_id} is now a user on CrediSafe\n\n"
                return self.show_main_menu(uploader,welcome_message=message_to_creditor,title_one=title_one)
            return True
        elif message_text.lower() in ["2", "2.", "edit","edit details"]:
            person.user_mode = "edit_profile"
            person.save(update_fields=["user_mode"])
            message =f"What would you like to change?"
            buttons = [
                {'id': '1', 'title': "Name"},
                {'id': '2', 'title': 'National ID'},
                {'id': '3', 'title': 'Address'},
                # {'id': 'exit', 'title': 'Exit'},
            ]
            return self.whatsapp.send_interactive_buttons(person.phone_number, message, buttons)
        
        elif message_text.lower() in ["3.", "3","reject"]:
            person.verification_status = "rejected"
            person.user_mode ="addition_aborted"
            person.save(update_fields=["verification_status","user_mode"])
            message_to_subject = "You rejected adding your details to CrediSafe. Please contact us at 0715239711 if you decided otherwise or if you have any questions."
            self.whatsapp.send_message(person.phone_number, message_to_subject)
            if uploader:
                message_to_creditor = f"{person.full_name} - {person.national_id} rejected adding their details to CrediSafe.\n\n"
                self.whatsapp.send_message(uploader.phone_number, message_to_creditor)
            return True
        else:
            buttons = [
                {'id': '1', 'title': "Yes"},
                {'id': '2', 'title': 'No'},
            ]
            return self.whatsapp.send_interactive_buttons(person.phone_number, "Invalid response. Please click 'yes' or 'no'.", buttons)

    def handle_accept_credit(self, person, message_text):
        pending_contract_to_confirm_id = person.get_session_key("pending_contract_to_confirm_id")
        contract = LendingContract.objects.filter(id=pending_contract_to_confirm_id).first()
        if not contract:
            return self.whatsapp.send_message(person.phone_number, "An error occurred, error code: 101")
        
        if message_text.lower() in ["no", "n","reject"]:
            contract.status = "rejected"
            contract.save(update_fields=["status"])
            message_to_subject = "Credit has been rejected."
            self.whatsapp.send_message(person.phone_number, message_to_subject)
            message_to_creditor = f"{person.full_name} - {person.national_id} rejected your credit of {contract.currency}{contract.amount}.\n\n"
            self.whatsapp.send_message(contract.lender.phone_number, message_to_creditor)
            return True
        try:
            otp = int(message_text)
        except:
            return self.whatsapp.send_message(person.phone_number, "Invalid response. Please type a the pin to accept or click 'reject' to reject.")
        
        if not person.otp_code:
            person.otp_code = otp
            person.save(update_fields=["otp_code"])
        if int(person.otp_code) == otp:
            contract.status = "active"
            contract.save(update_fields=["status"])
            person.set_session_data("pending_contract_to_confirm_id",None)
            message_to_subject = "Credit has been accepted."
            self.whatsapp.send_message(person.phone_number, message_to_subject)
            readable_date = contract.due_date.strftime("%d %B %Y")
            person.user_mode = "welcome"
            person.save(update_fields=["user_mode"])
            message_to_creditor = f"{person.full_name}({person.phone_number}) has confirmed taking credit from you of {contract.currency}{contract.amount} for {contract.credit_type} to be repaid on {readable_date}."
            self.whatsapp.send_message(contract.lender.phone_number, message_to_creditor)
            return True
        else:
            return self.whatsapp.send_message(person.phone_number, "Wrong code. Please try again.")
    
    def handle_login(self, person, message_text):
        try:
            otp = int(message_text)
        except ValueError:
            return self.whatsapp.send_message(person.phone_number, "Invalid PIN. Please type your pincode to use Credisafe.")

        if int(person.otp_code) == otp:

            incoming = (
                WhatsAppMessage.objects.filter(
                    person=person,
                    direction="incoming",
                    content=message_text,
                )
                .order_by("-timestamp")
                .first()
            )

            outgoing = (
                WhatsAppMessage.objects.filter(
                    person=person,
                    direction="outgoing",
                    content=person.otp_code,
                )
                .order_by("-timestamp")
                .first()
            )

            if incoming and incoming.whatsapp_message_id:
                self.whatsapp.delete_message(incoming.whatsapp_message_id)

            if outgoing and outgoing.whatsapp_message_id:
                self.whatsapp.delete_message(outgoing.whatsapp_message_id)

            person.user_mode = "welcome"
            person.save(update_fields=["user_mode"])

            return self.show_main_menu(person)

        return self.whatsapp.send_message(
            person.phone_number,
            "Incorrect PIN. Please try again."
        )
    
    def welcome_user(self, person):
        """Welcome new users and show main menu"""
        if person.is_verified:
            return self.show_main_menu(person)
        if not person.is_verified and person.address:
            self.whatsapp.send_message(person.phone_number, f"Hi {person.full_name}. Your account is currently being reviewed. Stay tuned for updates.")
            return True
        person_last_message = WhatsAppMessage.objects.filter(person=person).order_by('-timestamp').first()
        one_hour_ago = timezone.now() - timedelta(hours=1)
        if person_last_message and person_last_message.timestamp <= one_hour_ago:
            self.whatsapp.send_message(person.phone_number, f"Hi {person.full_name}. Welcome back to CrediSafe. Enter your pin to continue.")
            person.user_mode='login'
            person.save(update_fields=['user_mode'])
            return True
            
        if person.user_mode == 'welcome':
            welcome_message = "Welcome to CrediSafe. You are not yet a user. Please enter your ID number to continue. use format 12345678A90"
            self.whatsapp.send_message(person.phone_number, welcome_message)
        elif person.user_mode =="signup":
            self.whatsapp.send_message(person.phone_number, "Please finish signup to continue.")
    
    def handle_signup(self, person, message_text):
        """Full signup + identity verification flow"""
        from users.services.identity_service import (
            fetch_individual,
            compute_credit_score,
            get_highest_creditor,
            similarity,
            normalize_phone,
            phone_match_score,
        )
        from users.utils.validators import normalize_national_id, is_valid_zim_national_id

        # Accounts on hold cannot proceed until verified
        if person.verification_status == 'hold':
            self.whatsapp.send_message(
                person.phone_number,
                "Your account is currently on hold. You will be notified when your account is verified."
            )
            return False
        
        if person.verification_status == 'manual_review':
            self.whatsapp.send_message(
                person.phone_number,
                "Your account is currently being reviewed. Stay tuned for updates."
            )
            return False
        
        # =========================================================
        # STEP 1: NATIONAL ID
        # =========================================================
        if person.user_status == 'national_id':
            nid = normalize_national_id(message_text)
            if not person.national_id and message_text.lower() in ["hi", "hello", "hie","hy"]:
                self.whatsapp.send_message(person.phone_number, "Welcome to CrediSafe. You are not yet a user. Please enter your ID number to continue.")
                return False

            if not is_valid_zim_national_id(nid):
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid National ID format. Please use the format 63-1234567A12 or 12345678A90."
                )
                return False

            data = fetch_individual(nid)
            credit_score, top_creditor = None, None
            if data:
                self.handle_subject_credit_records(person, data)
                credit_score = compute_credit_score(data)
                top_creditor = get_highest_creditor(data.get("claims", []))

            # save base identity
            person.national_id = nid
            person.credit_score = credit_score

            if top_creditor:
                person.oldest_creditor = top_creditor["creditor_name"]
                person.amount_owed = top_creditor["amount"]
                person.currency = top_creditor["currency"]

            person.user_status = 'full_name'

            person.save(update_fields=[
                'national_id',
                'credit_score',
                'oldest_creditor',
                'amount_owed',
                'currency',
                'user_status'
            ])

            self.whatsapp.send_message(
                person.phone_number,
                "Please type your full Firstname and Surname"
            )

            return True

    

        # =========================================================
        # STEP 3: NAME CHECK
        # =========================================================
        elif person.user_status == 'full_name':
            name = message_text.strip().title()
            if not validate_name(name):
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid name format. Please use the format Firstname Surname."
                )
                return False

            person.mentioned_name = name
            person.full_name = name
            person.user_status = 'add_address'

            person.save(update_fields=[
                'mentioned_name',
                'user_status',
                'full_name'
            ])

            self.whatsapp.send_message(
                person.phone_number,
                "Please add residential address in the format;\n12 Grade close, Mukumba, Marondera, Zimbabwe"
            )
            return True
        
        
        # =========================================================
        # STEP 4: ADDRESS CHECK
        # =========================================================
        elif person.user_status == 'add_address':
            address = message_text.strip()
            if not validate_address(address):
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid address format. Please use the format;\n12 Grade close, Mukumba, Marondera, Zimbabwe"
                )
                return False

            person.address = address
            person.user_status = 'verify_details'

            person.save(update_fields=[
                'address',
                'user_status'
            ])

            media_sent =self.whatsapp.send_media(
                person.phone_number,
                "image",
                "https://pub-8fbfebaf851945ab8d216920b749e37f.r2.dev/idcard.jpeg",
                "Please upload a clear image of yourself holding your National ID/Passport like this."
            )
            if media_sent is None:
                self.whatsapp.send_message(
                    person.phone_number,
                    "Please send a selfie holding your National ID/Passport. like the example below."
                )
            return True
        
        # =========================================================
        # STEP 5: EDITING PROFILE
        # =========================================================

        elif person.user_mode == "edit_profile":
            if message_text == '1':
                person.user_status = "edit_full_name"
                person.user_mode = "signup"
                person.save(update_fields=['user_status','user_mode'])
                self.whatsapp.send_message(person.phone_number, "Please type your full Firstname and Surname")
                return True
            elif message_text == '2':
                person.user_status = "edit_national_id"
                person.user_mode = "signup"
                person.save(update_fields=['user_status','user_mode'])
                self.whatsapp.send_message(person.phone_number, "Please type your National ID number")
                return True
            elif message_text == '3':
                person.user_status = "edit_address"
                person.user_mode = "signup"
                person.save(update_fields=['user_status','user_mode'])
                self.whatsapp.send_message(person.phone_number, "Please add residential address in the format;\n12 Grade close, Mukumba, Marondera, Zimbabwe")
                return True
        
        elif person.user_status == 'edit_full_name':
            name = message_text.strip().title()
            if not len(name.split(" ")) < 2 or len(name) <5:
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid name format. Please use the format Firstname Surname."
                )
                return False
            person.full_name = name
            person.user_status = 'verify_details'
            person.save(update_fields=['full_name','user_status'])
            self.whatsapp.send_message(person.phone_number, "Name updated successfully")
            return True

        elif person.user_status == 'edit_national_id':
            nid = message_text.strip()
            if not is_valid_zim_national_id(nid):
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid National ID format. Please use the format 63-1234567A12 or 12345678A90."
                )
                return False
            person.national_id = nid
            person.user_status = 'verify_details'
            person.save(update_fields=['national_id','user_status'])
            self.whatsapp.send_message(person.phone_number, "National ID updated successfully")
            return True

        elif person.user_status == 'edit_address':
            address = message_text.strip()
            if not len(address.split(",")) < 4 or len(address) < 5:
                self.whatsapp.send_message(
                    person.phone_number,
                    "Invalid address format. Please use the format;\n12 Grade close, Mukumba, Marondera, Zimbabwe"
                )
                return False
            person.address = address
            person.user_status = 'verify_details'
            person.save(update_fields=['address','user_status'])
            self.whatsapp.send_message(person.phone_number, "Address updated successfully")
            return True

        # =========================================================
        # STEP 6: VERIFY DETAILS
        # =========================================================
        elif person.user_status == 'verify_details':
            if "[Image]" in message_text:
                self.whatsapp.send_message(person.phone_number, "Image received. Please wait while we verify your details.")
                
            if message_text == '1' or message_text.lower() in ["confirm", "yes","1."]:
                if not person.otp_code:
                    person.user_status = "otp_setup"
                    person.save(update_fields=['user_status'])
                    self.whatsapp.send_message(person.phone_number, "Please enter a 4-digit pin code for future access.")
                    return True
                else:
                    person.user_status = "completed"
                    person.user_mode ="welcome"
                    person.save(update_fields=['user_status', 'user_mode'])
                    self.whatsapp.send_message(person.phone_number, "Got it! Your details are currently being verified, you'll be notified when completed.")
                    return True
            elif message_text == '2' or message_text.lower() in ["edit", "no","2."]:
                person.user_mode = "edit_profile"
                person.save(update_fields=['user_mode'])
                message = "What do you want to edit?\n\n1. Name\n2. ID Number\n3. Address"
                self.whatsapp.send_message(person.phone_number, message)
                return True
            elif message_text == '3' or message_text.lower() in ["exit", "quit", "q","cancel"]:
                self.whatsapp.send_message(person.phone_number, "Signup has been cancelled.")
                return True
            name = getattr(person, 'full_name', 'N/A')
            national_id = getattr(person, 'national_id', 'N/A')
            address = getattr(person, 'address', 'N/A')
            mobile_number = getattr(person, 'phone_number', 'N/A')
            message_to_send = (
                "*Confirm details*\n\n"
                f"Name: {name}\n"
                f"ID Number: {national_id}\n"
                f"Address: {address}\n" 
                f"Mobile Number: {mobile_number}\n\n"
                "1. *Confirm*\n"
                "2. *Edit*\n"
                "3. *Exit*"
            )

            self.whatsapp.send_message(person.phone_number, message_to_send)
            return True
        
        # =========================================================
        # STEP 7: OTP SETUP
        # =========================================================
        elif person.user_status == 'otp_setup':
            import time
            if not self.is_valid_pin(message_text):
                self.whatsapp.send_message(person.phone_number, "Invalid pin code format. Please use the format 1234.")
                return False
            person.otp_code = message_text
            person.user_status = "completed"
            person.user_mode = "welcome"
            person.save(update_fields=['otp_code', 'user_status', 'user_mode'])
            self.whatsapp.send_message(person.phone_number, "Pin code set successfully! Please remember it for future access. \n\nStay tuned for account verification updates.")
            time.sleep(5)
            last_message = (
                WhatsAppMessage.objects.filter(
                    person=person,
                    direction="incoming",
                    content=message_text,
                )
                .order_by("-timestamp")
                .first()
            )
            if last_message:
                message_id = last_message.whatsapp_message_id
                print("Message ID:", message_id)
                self.whatsapp.delete_message(message_id)
        return True
    def is_valid_pin(self, pin):
        return re.match(r'^\d{4}$', pin)
    
    def handle_credit_check(self, person, message_text):
        """Handle credit check flow with API integration"""
        from users.services.identity_service import fetch_individual, compute_credit_score, get_highest_creditor
        from users.utils.validators import normalize_national_id, is_valid_zim_national_id
        require_otp=True
        if message_text.lower() =="give credit":
            require_otp=False
        # Check if user is verified
        if not person.is_verified:
            response = "🔒 *Verification Required* 🔒\n\n"
            response += "You need to be verified before Payment Status Checking.\n"
            response += "Please wait while we verify your details."
            self.whatsapp.send_message(person.phone_number, response)
            return self.show_main_menu(person)
        
        if person.user_status == 'borrower_id':
            # Validate national ID format
            nid = normalize_national_id(message_text)
            
            if not is_valid_zim_national_id(nid):
                response = "❌ Invalid ID number format. Please enter a valid ID (e.g., 63-1234567A12 or 12345678A90)\n\n> reply exit to return to main menu"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            
            # Store the borrower's national ID
            person.set_session_data('borrower_national_id', nid)
            person.user_status = 'fetching_borrower_data'
            person.save()
            # Show loading message
            self.whatsapp.send_typing_indicator(person.phone_number)
            
            # Check if person exists in DB first
            borrower_ob = Person.objects.filter(national_id=nid).first()
            
            if person.messages.filter(content__iexact="give credit",timestamp__date=timezone.now().date()).exists():
                if borrower_ob and borrower_ob.uploader == person and borrower_ob.created_at.date() == timezone.now().date():
                    require_otp=False
            
            # Fetch data from API
            try:
                api_data = fetch_individual(nid)
                if api_data:
                    # Person exists in API
                    self.handle_existing_borrower(person, api_data, nid, borrower_ob)
                if borrower_ob:
                    if not borrower_ob.is_verified and borrower_ob.address:
                        response = f"This person is not yet verified, wait for verification updates\nRegards,\nCrediSafe"
                        self.whatsapp.send_message(person.phone_number, response)
                        return True
                    if person.verification_status == 'rejected':
                        response = f"This person rejected using CrediSafe services."
                        self.whatsapp.send_message(person.phone_number, response)
                        return True
                    if not borrower_ob.address:
                        person.user_mode="borrower_signup"
                        person.user_status="borrower_address"
                        return self.handle_new_borrower(person, nid)
                    
                    return self.initiate_credit_check(person, borrower_ob,require_otp=require_otp)
                        
                if not borrower_ob:
                    # Person not found in API or DB - create new record
                    return self.handle_new_borrower(person, nid)
                    
            except Exception as e:
                logger.error(f"API fetch error: {str(e)}")
                # If API fails but person exists in DB, use DB data
                if borrower_ob:
                    print("API failed, but person exists in DB. Using existing data.")
                    person.set_session_data('borrower_id', borrower_ob.id)
                    person.user_status = 'borrower_full_name'
                    person.save()
                    
                    response = f"✅ Found: {borrower_ob.full_name}\n\nPlease enter their phone number for verification:"
                    self.whatsapp.send_message(person.phone_number, response)
                    return True
                else:
                    response = "❌ Error fetching credit data. Please try again later."
                    self.whatsapp.send_message(person.phone_number, response)
                    return self.show_main_menu(person)
        
        elif person.user_status == 'fetching_borrower_data':
            # This state is handled above, but keep for safety
            return self.handle_credit_check(person, message_text)
        
        elif person.user_status == 'otp_confirmation':
            # Verify OTP
            credit_check_id = person.get_session_key('current_credit_check_id')
            try:
                credit_check = CreditCheck.objects.get(id=credit_check_id)
                
                if credit_check.is_expired():
                    response = "❌ OTP has expired. Please start over."
                    self.whatsapp.send_message(person.phone_number, response)
                    return self.show_main_menu(person)
                
                if credit_check.otp_code == message_text.strip():
                    credit_check.status = 'verified'
                    credit_check.otp_verified_at = timezone.now()
                    credit_check.save()
                    
                    credit_history = self.get_credit_history(credit_check.subject)
                    credit_check.credit_history_snapshot = credit_history
                    credit_check.status = 'completed'
                    credit_check.checked_at = timezone.now()
                    credit_check.save()
                    
                    CreditCheckAudit.objects.create(
                        credit_check=credit_check,
                        action='credit_viewed',
                        details={'method': 'otp_verified'},
                        performed_by_phone=person.phone_number
                    )
                    response = self.format_credit_report(credit_check.subject, credit_history)
                    self.whatsapp.send_message(person.phone_number, response)
                    time.sleep(3)
                    subject_name = credit_check.subject.full_name
                    subject_national_id = credit_check.subject.national_id
                    response = f"Would you like to give credit to {subject_name} - {subject_national_id}?\n\n"
                    buttons = [
                                {'id': 'lend_money', 'title': 'Yes'},
                                {'id': 'no', 'title': 'No'},
                                # {'id': 'settle_debt', 'title': '✅ Settle Debt'}
                            ]
                    self.whatsapp.send_interactive_buttons(person.phone_number, response, buttons)
                    # self.whatsapp.send_message(person.phone_number, response)
                    person.set_session_data('pending_credit_check', credit_check.id)
                    person.user_status = 'offer_lending'
                    person.save()
                    return True
                    
                else:
                    response = "❌ Invalid OTP. Please try again \n\n> reply exit to return to main menu"
                    self.whatsapp.send_message(person.phone_number, response)
                    return False
                    
            except CreditCheck.DoesNotExist:
                response = "Session expired. Please start over."
                self.whatsapp.send_message(person.phone_number, response)
                return self.show_main_menu(person)
        
        elif person.user_status == 'offer_lending':
            if message_text.lower() in ['yes', 'y','sure']:
                credit_check_id = person.get_session_key('pending_credit_check')
                credit_check = CreditCheck.objects.get(id=credit_check_id)
                
                subject_name = credit_check.subject.full_name
                subject_national_id = credit_check.subject.national_id
                response = f"Which currency is credit to {subject_name} - {subject_national_id} ?"
                buttons = [
                            {'id': 'usd', 'title': 'USD'},
                            {'id': 'rand', 'title': 'Rand'},
                            {'id': 'zwl', 'title': 'ZWL'}
                        ]
                self.whatsapp.send_interactive_buttons(person.phone_number, response, buttons)
                person.user_mode = 'lend_money'
                person.user_status = 'enter_credit_currency'
                person.set_session_data('lending_borrower_id', credit_check.subject.id)
                person.save()
                
                # self.whatsapp.send_message(person.phone_number, response)
                return True
            else:
                return self.show_main_menu(person)
        
        person.user_mode = 'credit_check'
        person.user_status = 'borrower_id'
        person.save()
        
        return self.whatsapp.send_message(person.phone_number, "Please enter the National ID of the person you want to give credit to eg 12345678A90 \n\n> reply exit to return to main menu")
    
    def handle_existing_borrower(self, person, api_data, national_id, borrower=None):
        """Handle borrower that exists in API"""
        from users.services.identity_service import compute_credit_score, get_highest_creditor
        
        individual = api_data.get("individual", {})
        api_full_name = f"{individual.get('firstname','')} {individual.get('surname','')}".strip()
        api_phone = individual.get("mobile")
        credit_score = compute_credit_score(api_data)
        top_creditor = get_highest_creditor(api_data.get("claims", []))
        
        # Check if person already exists in our system
        if borrower is None:
            borrower = Person.objects.filter(national_id=national_id).first()
        
        if borrower:
            # Update existing record with latest API data
            # borrower.full_name = api_full_name
            borrower.credit_score = credit_score
            borrower.old_phone_number = api_phone
            if top_creditor:
                borrower.oldest_creditor = top_creditor["creditor_name"]
                borrower.amount_owed = top_creditor["amount"]
                borrower.currency = top_creditor["currency"]
            borrower.save()
            print(f"Updated existing borrower: {borrower.full_name}")
        # else:
        #     # Create new person record (not verified yet)
        #     borrower = Person.objects.create(
        #         national_id=national_id,
        #         full_name=api_full_name,
        #         phone_number=api_phone or '',
        #         credit_score=credit_score,
        #         old_phone_number=api_phone,
        #         is_verified=False,
        #         verification_status='pending',
        #         user_mode='welcome',
        #         user_status='welcome'
        #     )
            
            if top_creditor and borrower:
                borrower.oldest_creditor = top_creditor["creditor_name"]
                borrower.amount_owed = top_creditor["amount"]
                borrower.currency = top_creditor["currency"]
                borrower.save()
                
        return self.handle_subject_credit_records(borrower, api_data)
        
    def handle_subject_credit_records(self, person, api_data):
        from users.services.identity_service import (
            fetch_individual,
            compute_credit_score,
            get_highest_creditor,
            similarity,
            normalize_phone,
            phone_match_score,
        )
        if not api_data:
            return False
        amount_owed = 0
        currency = "USD"
        api_data_summary = api_data.get("summary", {})
        oldest_creditor = get_highest_creditor(api_data.get("claims", []))
        if oldest_creditor:
            amount_owed = oldest_creditor["amount"]
            currency = oldest_creditor["currency"]
        person_credit_history = CreditHistory.objects.filter(person=person).first()
        if not person_credit_history:
            credit_score = compute_credit_score(api_data)
            if credit_score >= 800:
                default_risk = 'high'
            elif credit_score >= 600:
                default_risk = 'medium'
            else:
                default_risk = 'low'
            CreditHistory.objects.create(
                person=person,
                credit_score=credit_score,
                total_borrowed=amount_owed,
                total_repaid=0,
                outstanding_balance=amount_owed,
                default_risk=default_risk,
                total_claims=api_data_summary.get("claims_count", 0),
                total_courts = api_data_summary.get("court_cases_count", 0),
            )
            return True
        else:
            person_credit_history.total_claims = api_data_summary.get("claims_count", 0)
            person_credit_history.total_courts = api_data_summary.get("court_cases_count", 0)
            person_credit_history.save()
        return True
    
    
    def handle_new_borrower(self, person, message_text=''):
        """Handle new borrower not found in API"""
        borrower_id = person.session_data.get('borrower_national_id',None)
        borrower_ob = Person.objects.filter(
                national_id=borrower_id,
            ).first()
        full_name = getattr(borrower_ob, 'full_name', 'Person')
        
        if person.user_status == 'borrower_full_name':
            full_name = message_text.strip()
            if not validate_name(full_name):
                response = "Please type Full Name and Surname eg: John Doe\n\n> reply exit to return to main menu"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            new_borrower, created = Person.objects.get_or_create(
                national_id=borrower_id,
                defaults={
                    'uploader': person,
                    'full_name': full_name,
                    'mentioned_name': full_name,
                }
            )
            person.user_status = 'borrower_address'
            person.save()
            
            message =f"Please type address for {full_name} in the format;\n\n12 Grade close, Mukumba, Marondera, Zimbabwe\n\n> reply exit to return to main menu"
            self.whatsapp.send_message(person.phone_number, message)
            return True
        
        elif person.user_status == 'borrower_address':
            if not validate_address(message_text):
                response = "Invalid address format. Please use the format;\n12 Grade close, Mukumba, Marondera, Zimbabwe"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            borrower_ob = Person.objects.filter(
                    national_id=borrower_id,
                ).first()
            if borrower_ob:
                borrower_ob.address = message_text.strip()
                borrower_ob.save()
            
            person.user_status = 'borrower_phone'
            person.save()
            message = f"Please type mobile number for {full_name} in the format; 0771234567"
            self.whatsapp.send_message(person.phone_number, message)
            return True
        
        elif person.user_status == 'borrower_phone':
            from chatbot.validators import is_valid_zimbabwe_phone
            phone_number = message_text.strip()
            if not is_valid_zimbabwe_phone(phone_number):
                response = "*Invalid mobile number*.\nPlease type mobile number in the format; 0771234567\n\n> reply exit to return to main menu"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            if borrower_ob:
                if phone_number.startswith('07'):
                    phone_number = phone_number.replace('07', '2637', 1)
                borrower_ob.phone_number = phone_number
                borrower_ob.save()
            person.user_status = 'verify_borrower_details'
            person.save()
            borrower_name = getattr(borrower_ob, 'full_name', 'N/A')
            borrower_national_id = getattr(borrower_ob, 'national_id', 'N/A')
            borrower_phone = getattr(borrower_ob, 'phone_number', 'N/A')
            borrower_address = getattr(borrower_ob, 'address', 'N/A')
            borrower_details =(
                f"You have added the individual;\n{borrower_name}\n"
                f"*National ID*: {borrower_national_id}\n"
                f"*Mobile Number*: {borrower_phone}\n"
                f"*Address*: {borrower_address}\n\n"
            )
            buttons = [
                {'id': 'confirm', 'title': 'Confirm'},
                {'id': 'edit', 'title': 'Edit Details'},
                {'id': 'exit', 'title': 'Exit'},
                ]
            self.whatsapp.send_interactive_buttons(person.phone_number, borrower_details, buttons)
            # self.whatsapp.send_message(person.phone_number, borrower_details)
            return True
        
        elif person.user_status =='verify_borrower_details':
            if "[Image]" in message_text:
                self.whatsapp.send_message(person.phone_number, "Image received. Please wait while we verify the details.")
                return True
            if message_text.lower() in ["1", "yes","1.","confirm"]:
                media_sent =self.whatsapp.send_media(
                    person.phone_number,
                    "image",
                    "https://pub-8fbfebaf851945ab8d216920b749e37f.r2.dev/idcard.jpeg",
                    "Information saved successfully, please send a selfie of the subject holding their ID card"
                )
                if media_sent is None:
                    message = "Information saved successfully, please send a selfie of the subject holding their ID card"
                    self.whatsapp.send_message(person.phone_number, message)
                try:
                    from users.services.identity_service import (
                                fetch_individual,
                            )
                    data = fetch_individual(borrower_id)
                    self.handle_subject_credit_records(borrower_ob, data)
                    print("subject data updated from api.... after adder verified subject..")
                except:
                    pass
                return True
            elif message_text.lower() in ["2", "edit","2.","edit details"]:
                person.user_mode = 'edit_borrower'
                person.save()
                message = "What information would you like to edit?\n"
                buttons = [
                    {'id': 'name', 'title': 'Full Name'},
                    {'id': 'edit', 'title': 'Phone Number'},
                    {'id': 'exit', 'title': 'Address'},
                    ]
                self.whatsapp.send_interactive_buttons(person.phone_number, message, buttons)
                # self.whatsapp.send_message(person.phone_number, message)
                
                return True
            elif message_text.lower() in ["3", "main menu","3."]:
                return self.show_main_menu(person)
            elif message_text.lower() in ["4", "exit","4."]:
                return self.show_main_menu(person)
        
        if message_text.lower() in ["2", "no","2."]:
            return self.show_main_menu(person)
        elif message_text.lower() in ["1", "yes","1."]:
            person.user_status = 'borrower_full_name'
            person.save(update_fields=['user_status'])
            if borrower_id:
                
                message = f"ID Number {borrower_id} \n Please type Full Name and Surname"
            else:
                message ="Please type Full Name and Surname"
            self.whatsapp.send_message(person.phone_number, message)
            return True

        person.user_mode = 'borrower_signup'
        person.save()
        
        response = "Sorry, that ID number was not found in database. Would you like to add the individual?\n\n"
        buttons = [
            {'id': 'yes', 'title': 'Yes'},
            {'id': 'no', 'title': 'No'},
            {'id': 'exit', 'title': 'Exit'},
        ]
        self.whatsapp.send_interactive_buttons(person.phone_number, response, buttons)
        # self.whatsapp.send_message(person.phone_number, response)
        return True
    
    
    def handle_offer_service(self, person, message_text):
        """Handle offer service mode"""
        normalized = message_text.lower().strip()
        if normalized in ['1', 'lend money', 'lend', 'payment status check', 'lend_money']:
            person.user_mode = 'credit_check'
            person.user_status = 'borrower_id'
            person.save()
            
            # response = "🔍 *Credit Check* 🔍\n\n"
            response = "Please enter the ID Number here like 12345678A90 \n\n> reply exit to return to main menu\n"
            # response += "________________________________\n"
            # response += "Example: 63-1234567A12 or 12345678A90"
            # response += "\n\nreply exit, or q to return to main menu"
            
            return self.whatsapp.send_message(person.phone_number, response)
            
        elif normalized in ['2', 'usd', 'track', 'rand', 'zwl']:
            return self.handle_track_lended(person, None)
            
        elif normalized in ['3', 'settle debt', 'settle', '✅ settle debt', 'settle_debt']:
            person.user_mode = 'settle_debt'
            person.user_status = 'awaiting_settlement'
            person.save()
            
            active_loans = LendingContract.objects.filter(
                lender=person,
                status='active'
            )
            
            if active_loans.exists():
                response = "📋 *Your Active Loans* 📋\n\n"
                for loan in active_loans:
                    response += f"🆔 Loan ID: {loan.id}\n"
                    response += f"👤 Borrower: {loan.borrower.full_name}\n"
                    response += f"💰 Amount: ${loan.amount}\n"
                    response += f"📅 Due: {loan.due_date.strftime('%Y-%m-%d')}\n"
                    response += "─" * 20 + "\n"
                
                response += "\nEnter the Loan ID to mark as settled:"
                self.whatsapp.send_message(person.phone_number, response)
            else:
                response = "📭 You have no active loans."
                self.whatsapp.send_message(person.phone_number, response)
                return self.show_main_menu(person)
        else:
            return self.show_main_menu(person)
        
        return True

    def handle_lend_money(self, person, message_text):
        """Handle lending money flow"""
        current_lending_contract_id = person.get_session_key('current_lending_contract_id')
        contract = LendingContract.objects.filter(id=current_lending_contract_id).first()
        borrower_id = person.get_session_key('lending_borrower_id')
        borrower = Person.objects.get(id=borrower_id)
        message_text = message_text.lower().strip()
        
        if person.user_status == 'enter_credit_currency':
            if not message_text in ['usd', 'rand','zwl','1','2','3']:
                response = "❌ Invalid currency. Please enter the valid option: 1,2 or 3."
                self.whatsapp.send_message(person.phone_number, response)
                return False
            # Check if borrower is verified
            if not borrower.is_verified:
                response = "❌ Cannot lend to unverified person.\n\n"
                response += f"{borrower.full_name} needs to verify their account first."
                return self.whatsapp.send_message(person.phone_number, response)
                
            if message_text in ['1','usd']:
                currency = 'usd'
            elif message_text in ['2','rand']:
                currency = 'rand'
            elif message_text in ['3','zwl']:
                currency = 'zwl'
            # Create lending contract
            contract = LendingContract.objects.create(
                    lender=person,
                    borrower=borrower,
                    currency=currency,
                    status='inactive',
                    amount=0,
                    due_date=timezone.now() + timedelta(days=30)
                )
            person.set_session_data('current_lending_contract_id', contract.id)
            person.user_status = 'lend_amount'
            person.save()
            response = "Enter Credit Amount:"
            self.whatsapp.send_message(person.phone_number, response)
            return True
        
        if person.user_status == 'lend_amount':
            try:
                if not isinstance(float(message_text), float):
                    self.whatsapp.send_message(person.phone_number, "❌ Invalid amount. Please enter a valid number.")
                    return False
                amount = float(message_text)
                if amount <= 0:
                    self.whatsapp.send_message(person.phone_number, "❌ Invalid amount. Please enter a positive number.")
                    return False
                
                # Create lending contract
                if contract:
                    contract.amount = amount
                    contract.save()
                response = "Select Credit Type:\n\n"
                response += f"1. Cash\n"
                response += f"2. Goods\n"
                response += f"3. Service\n"
                response += f"4. Loan\n"
                response += f"5. Mukando\n"
                self.whatsapp.send_message(person.phone_number, response)
                person.user_status = 'enter_credit_type'
                person.save()
                return True
                
            except ValueError:
                response = "❌ Invalid amount. Please enter a valid number (e.g., 100.50):"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            except Person.DoesNotExist:
                response = "❌ Borrower not found. Please start over."
                self.whatsapp.send_message(person.phone_number, response)
                return self.show_main_menu(person)
        
        elif person.user_status =="enter_credit_type":
            if not message_text in ['1', '2', '3', '4', '5']:
                response = "❌ Invalid credit type. Please enter a valid option (e.g., 1, 2, 3, 4, 5):"
                self.whatsapp.send_message(person.phone_number, response)
                return False
            if message_text == '1':
                credit_type = 'cash'
            elif message_text == '2':
                credit_type = 'goods'
            elif message_text == '3':
                credit_type = 'service'
            elif message_text == '4':
                credit_type = 'loan'
            elif message_text == '5':
                credit_type = 'mukando'
            contract.credit_type = credit_type
            contract.save()
            person.user_status = 'enter_end_date'
            person.save()
            response = "Enter Repayment Date e.g 4 July 2026 or (4/7/2026):"
            self.whatsapp.send_message(person.phone_number, response)
            return True
        
        elif person.user_status == "enter_end_date":
            if not message_text:
                response = (
                    "❌ Invalid repayment date. Please enter a valid date "
                    "(e.g., 4 July 2026 or 4/7/2026):"
                )
                self.whatsapp.send_message(person.phone_number, response)
                return False

            formats = [
                "%d %B %Y",   # 4 July 2026
                "%d %b %Y",   # 4 Jul 2026
                "%d/%m/%Y",   # 4/7/2026
                "%d-%m-%Y",   # 4-7-2026
                "%Y-%m-%d",   # 2026-07-04
            ]

            due_date = None

            for fmt in formats:
                try:
                    due_date = datetime.strptime(message_text.strip(), fmt)
                    break
                except ValueError:
                    continue

            if due_date is None:
                response = (
                    "❌ Invalid repayment date. Please enter a valid date "
                    "(e.g., 4 July 2026 or 4/7/2026):"
                )
                self.whatsapp.send_message(person.phone_number, response)
                return False

            # Make timezone-aware if USE_TZ=True
            
            due_date = datetime.strptime(message_text.strip(), fmt).date()

            contract.due_date = due_date
            contract.save()
            person.user_status = "confirm_credit_details"
            person.save()
            end_date= due_date.strftime("%d %B %Y")
            message = f"Confirm credit to {borrower.full_name} ({borrower.national_id}) of {contract.currency}{contract.amount:.2f} for {contract.credit_type} to be repaid on {end_date}:\n\n1. Yes\n2. No\n3. Exit"
            self.whatsapp.send_message(person.phone_number, message)
            return True
        
        elif person.user_status == "confirm_credit_details":
            if message_text == "1":
                readable_date = contract.due_date.strftime("%d %B %Y")
                otp = self.generate_otp()
                contract.otp_code = otp
                contract.save()
                self.whatsapp.send_message(person.phone_number, f"Credit details confirmed, waiting for {borrower.full_name} to accept, you will be notified when they accept.")
                time.sleep(1)
                message_to_borrower =(
                    f"If you accept receiving credit from {person.full_name} ({person.national_id})"
                    f"of {contract.currency}{contract.amount:.2f} for {contract.credit_type}, to be repaid on {readable_date}, please enter your pin to confirm or"
                )
                borrower.user_mode='accept_credit'
                borrower.set_session_data('pending_contract_to_confirm_id', contract.id)
                borrower.save()
                buttons = [
                    {'id': 'reject', 'title': 'Reject'},
                ]
                self.whatsapp.send_interactive_buttons(borrower.phone_number, message_to_borrower, buttons)
                # self.whatsapp.send_message(borrower.phone_number, message_to_borrower)
                person.user_mode = "welcome"
                person.save()
                return True
            elif message_text == "2":
                contract.status = "cancelled"
                contract.save()
                person.user_mode = "welcome"
                person.save()
                self.show_main_menu(person)
            elif message_text == "3":
                return self.show_main_menu(person)
        return True
    
    def handle_track_lended(self, person, message_text):
        """Track all lending given by user"""
        loans = LendingContract.objects.filter(lender=person).order_by('-created_at')
        
        if loans.exists():
            response = "📊 *Your Lending History* 📊\n\n"
            total_lent = 0
            total_repaid = 0
            
            for loan in loans:
                status_emoji = "✅" if loan.status == 'settled' else "🔄" if loan.status == 'active' else "⚠️"
                response += f"{status_emoji} *Loan #{loan.id}*\n"
                response += f"   👤 Borrower: {loan.borrower.full_name}\n"
                response += f"   💰 Amount: ${loan.amount:.2f}\n"
                response += f"   📊 Status: {loan.status.upper()}\n"
                if loan.status == 'settled':
                    response += f"   📅 Settled: {loan.settled_at.strftime('%Y-%m-%d')}\n"
                else:
                    response += f"   📅 Due: {loan.due_date.strftime('%Y-%m-%d')}\n"
                response += "\n"
                
                total_lent += loan.amount
                if loan.status == 'settled':
                    total_repaid += loan.amount
            
            response += f"📈 *Summary*\n"
            response += f"   Total Lent: ${total_lent:.2f}\n"
            response += f"   Total Repaid: ${total_repaid:.2f}\n"
            response += f"   Outstanding: ${total_lent - total_repaid:.2f}"
        else:
            response = "📭 You haven't lent any money yet."
        
        return self.whatsapp.send_message(person.phone_number, response)
        return self.show_main_menu(person)
   
    def handle_settle_debt(self, person, message_text):
        """Mark a loan as settled"""
        try:
            loan_id = int(message_text)
            loan = LendingContract.objects.get(id=loan_id, lender=person, status='active')
            loan.settle()
            
            response = "✅ *Loan Settled!* ✅\n\n"
            response += f"Loan #{loan.id} has been marked as settled.\n"
            response += f"💰 Amount: ${loan.amount:.2f} from {loan.borrower.full_name}"
            self.whatsapp.send_message(person.phone_number, response)
            
            # Notify borrower
            borrower_response = "✅ *Loan Settlement Confirmed* ✅\n\n"
            borrower_response += f"Your loan of ${loan.amount:.2f} from {person.full_name} has been marked as settled.\n"
            borrower_response += "Thank you for your timely repayment!"
            
            self.whatsapp.send_message(loan.borrower.phone_number, borrower_response)
            
        except (ValueError, LendingContract.DoesNotExist):
            response = "❌ Invalid Loan ID. Please enter a valid Loan ID from the list:"
            self.whatsapp.send_message(person.phone_number, response)
            return False
        
        return self.show_main_menu(person)

    
    def show_main_menu(self, person,welcome_message="",title_one="Payment Status Check",title_two="Accounting"):
        """Display main menu options"""
        # Reset mode to offer_service
        if not person.is_verified:
            self.whatsapp.send_message(person.phone_number, "Finish signup to use the CrediSafe services.")
            return False
        person_last_message = WhatsAppMessage.objects.filter(person=person).order_by('-timestamp').first()
        one_hour_ago = timezone.now() - timedelta(hours=1)
        if person_last_message and person_last_message.timestamp <= one_hour_ago:
            self.whatsapp.send_message(person.phone_number, f"Hi {person.full_name}. Welcome back to CrediSafe. Enter your pin to continue.")
            person.user_mode='login'
            person.save(update_fields=['user_mode'])
            return True
        person.user_mode = 'welcome'
        person.save()
        user_name = person.full_name or "there"
        if not welcome_message:
            welcome_message = f"Welcome {user_name} \n\n"
            credit_score = person.credit_score or 0
            if credit_score >= 800:
                payment_status="🔴"
                code = "High Risk-Upper"
            elif credit_score >= 600:
                payment_status="🟠"
                code="High Risk-Lower"
            elif credit_score >= 300:
                payment_status="🟡"
                code="Medium Risk"
            else:
                code="Low Risk"
                payment_status="🟢"
                

            credit_taken = (
                LendingContract.objects.filter(
                    borrower=person,
                    status='active'
                ).aggregate(total=Sum('amount'))['total']
                or Decimal('0.00')
            )

            credit_given = (
                LendingContract.objects.filter(
                    lender=person,
                    status='active'
                ).aggregate(total=Sum('amount'))['total']
                or Decimal('0.00')
            )

            if credit_taken <=0:
                payment_status ="`N/A`"
                credit_history = person.credit_histories.first()
                if credit_history:
                    credit_taken = credit_history.total_borrowed
                    
            welcome_message += (
                f"Your Payment Status:\n"
                f"{code} {payment_status}\n\n"
                f"*Net Status*\n"
                f"Credit Taken - US${credit_taken:,.2f}\n"
                f"Credit Given - US${credit_given:,.2f}\n\n"
                f"Options:\n"
            )
            
            menu = f", *{user_name}!* Please choose an option:\n\n"
            menu += "1️⃣ *Credit Services* - Check credit history and lend\n"
            menu += "2️⃣ *My Activity* - View your lending history\n"
            menu += "3️⃣ *Settle Debt* - Mark loan as settled\n\n"
            menu += "Reply with the option number 1, 2, or 3."
        
        # self.whatsapp.send_message(person.phone_number, menu)
        
        # Send as interactive buttons if supported
        buttons = [
            {'id': 'lend_money', 'title': title_one},
            {'id': 'accounting', 'title': title_two},
            # {'id': 'settle_debt', 'title': '✅ Settle Debt'}
        ]
        self.whatsapp.send_interactive_buttons(person.phone_number, welcome_message, buttons)
        
        return True
    
    def format_credit_report(self, person, credit_history, is_self_check=""):
        """Format credit report for display"""
        score = person.credit_score or 0
        if score >= 800:
            risk = "High Risk-Upper"
            emoji = "🔴"
        elif score >= 600:
            risk="High Risk-Lower"
            emoji="🟠"
        elif score >= 300:
            emoji="🟡"
            risk="Medium Risk"
        else:
            emoji="🟢"
            risk="Low Risk"
        active_credit_histories = person.loans_taken.filter(status='active').count()
        defaulted_loans_taken = person.loans_taken.filter(status='defaulted').count()
        if defaulted_loans_taken <= 0:
            credit_history = person.credit_histories.first()
            if credit_history:
                defaulted_loans_taken = credit_history.total_claims + credit_history.total_courts
        
        report = f"*{is_self_check}Payment Status Report*\n\n"
        report += f"*{person.national_id} -{person.full_name or 'N/A'}*\n\n"
        report += f"*Listed Address:*\n\t{person.address}\n"
        report += f"*Status -* {risk} {emoji}\n"
        report += f"*Active Credit  -* {active_credit_histories}\n"
        report += f"*In Arrears  -* {defaulted_loans_taken}"
        
        # if person.oldest_creditor:
        #     report += f"\n🏦 *Highest Creditor:* {person.oldest_creditor}\n"
        #     report += f"💰 *Amount Owed:* {person.currency} {person.amount_owed:.2f}\n"
        
        return report
    
    def initiate_credit_check(self, person, borrower, require_otp=True):
        """Initiate the actual credit check process"""
        # Check if person is checking themselves
        borrower_name = getattr(borrower, 'full_name', '')
        creditor_name = getattr(person, 'full_name', 'A Private Checker')
        if borrower.phone_number == person.phone_number:
            # Self check - no SMS required
            credit_check = CreditCheck.objects.create(
                checker=person,
                subject=borrower,
                check_type='self_check',
                status='completed'
            )
            
            credit_history = self.get_credit_history(borrower)
            credit_check.credit_history_snapshot = credit_history
            credit_check.checked_at = timezone.now()
            credit_check.save()
            
            response = self.format_credit_report(borrower, credit_history,f"Self ")
            return self.whatsapp.send_message(person.phone_number, response)
            # return self.show_main_menu(person)
        else:
            # Third party check - need OTP
            otp_code = self.generate_otp()
            credit_check = CreditCheck.objects.create(
                checker=person,
                subject=borrower,
                check_type='third_party',
                status='pending_otp',
                otp_code=otp_code,
                expires_at=timezone.now() + timedelta(minutes=10)
            )
            person.set_session_data('current_credit_check_id', credit_check.id)
            
            if require_otp:
            # Send SMS to checker
                message = f"Hi {borrower_name},\n\n{creditor_name} wants to check your payment status, give them this code: *{otp_code}* if you agree.\n\n _You can safely ignore this message if you believe this is a mistake._"
                self.whatsapp.send_message(borrower.phone_number, message)
                person.user_status = 'otp_confirmation'
                person.save()
                
                response = "🔐 An OTP has been sent to the subject.\nPlease enter the OTP to view their credit history:"
                return self.whatsapp.send_message(person.phone_number, response)
            
            subject_name = borrower.full_name
            subject_national_id = borrower.national_id
            response = f"Which currency is credit to {subject_name} - {subject_national_id} ?"
            buttons = [
                        {'id': 'usd', 'title': 'USD'},
                        {'id': 'rand', 'title': 'Rand'},
                        {'id': 'zwl', 'title': 'ZWL'}
                    ]
            self.whatsapp.send_interactive_buttons(person.phone_number, response, buttons)
            person.user_mode = 'lend_money'
            person.user_status = 'enter_credit_currency'
            person.set_session_data('lending_borrower_id', credit_check.subject.id)
            person.save()
            return True
    
    
    def get_credit_history(self, person):
        """Get or generate credit history for a person"""
        score = person.credit_score or 0
        try:
            credit = CreditHistory.objects.get(person=person)

            if score >= 800:
                risk = "High Risk-Upper"
            elif score >= 600:
                risk="High Risk-Lower"
            elif score >= 300:
                risk="Medium Risk"
            else:
                risk="Low Risk"
            return {
                'credit_score': person.credit_score,
                'total_borrowed': float(credit.total_borrowed),
                'total_repaid': float(credit.total_repaid),
                'outstanding_balance': float(credit.outstanding_balance),
                'default_risk': risk,
            }
        except CreditHistory.DoesNotExist:
            # Generate credit history based on credit score
   
            if score >= 800:
                risk = "High Risk-Upper"
            elif score >= 600:
                risk="High Risk-Lower"
            elif score >= 300:
                risk="Medium Risk"
            else:
                risk="Low Risk"
            return {
                'credit_score': score,
                'total_borrowed': 0.00,
                'total_repaid': 0.00,
                'outstanding_balance': 0.00,
                'default_risk': risk,
            }