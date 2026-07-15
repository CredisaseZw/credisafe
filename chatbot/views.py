from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from chatbot.handlers import MessageHandler
import json
import logging
from django.conf import settings
import re

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['POST'])
def whatsapp_webhook(request):
    """Webhook endpoint for WhatsApp messages - FULL MEDIA SUPPORT"""
    try:
        # Parse the incoming data
        data = json.loads(request.body)
        BUSINESS_PHONE_NUMBER = settings.WHATSAPP_BUSINESS_PHONE_NUMBER
        direction = "incoming"
        # WHAPI webhook format
        if 'messages' in data:
            for message in data['messages']:
                # Skip if this is a status update or system message
                if message.get('type') == 'status':
                    logger.info(f"Skipping status message: {message.get('id')}")
                    continue
                
                # Extract sender info - ensure it's a user message
                from_number = message.get('from')
                if not from_number:
                    logger.warning("Message missing 'from' field, skipping")
                    continue
                
                # Check if this message is from a system/status update
                if from_number.startswith('status@') or from_number == 'status':
                    logger.info(f"Skipping system message from: {from_number}")
                    continue
                
                from_name = message.get('from_name', '')
                message_type = message.get('type', 'text')
                message_id = message.get('id', '')
                
                # Skip if no message_id
                if not message_id:
                    logger.warning("Message missing 'id', skipping")
                    continue
                
                if from_number.endswith(BUSINESS_PHONE_NUMBER):
                    direction = 'outgoing'
                # Extract message content based on type
                message_text = ""
                media_url = None
                media_caption = None
                is_quoted = False
                
                # --- TEXT MESSAGES ---
                if message_type == 'text':
                    message_text = message.get('text', {}).get('body', '')
                    logger.info(f"Text message from {from_number}: {message_text[:50]}...")
                
                # --- IMAGE MESSAGES ---
                elif message_type == 'image':
                    image_data = message.get('image', {})
                    media_url = image_data.get('url')
                    media_caption = image_data.get('caption', '')
                    # Set message text to indicate it's an image
                    message_text = f"[Image]{' - ' + media_caption if media_caption else ''}"
                    logger.info(f"Image message from {from_number}: {media_caption or 'no caption'}")
                
                # --- VIDEO MESSAGES ---
                elif message_type == 'video':
                    video_data = message.get('video', {})
                    media_url = video_data.get('url')
                    media_caption = video_data.get('caption', '')
                    message_text = f"[Video]{' - ' + media_caption if media_caption else ''}"
                    logger.info(f"Video message from {from_number}")
                
                # --- AUDIO MESSAGES ---
                elif message_type == 'audio':
                    audio_data = message.get('audio', {})
                    media_url = audio_data.get('url')
                    # Audio messages usually don't have captions
                    message_text = "[Audio]"
                    logger.info(f"Audio message from {from_number}")
                
                # --- VOICE MESSAGES ---
                elif message_type == 'voice':
                    voice_data = message.get('voice', {})
                    media_url = voice_data.get('url')
                    message_text = "[Voice Note]"
                    logger.info(f"Voice note from {from_number}")
                
                # --- DOCUMENT MESSAGES ---
                elif message_type == 'document':
                    document_data = message.get('document', {})
                    media_url = document_data.get('url')
                    filename = document_data.get('filename', 'unknown')
                    media_caption = document_data.get('caption', '')
                    message_text = f"[Document: {filename}]{' - ' + media_caption if media_caption else ''}"
                    logger.info(f"Document from {from_number}: {filename}")
                
                # --- LOCATION MESSAGES ---
                elif message_type == 'location':
                    location_data = message.get('location', {})
                    latitude = location_data.get('latitude')
                    longitude = location_data.get('longitude')
                    name = location_data.get('name', '')
                    address = location_data.get('address', '')
                    message_text = f"[Location: {name or address or f'{latitude},{longitude}'}]"
                    logger.info(f"Location from {from_number}: {message_text}")
                
                # --- CONTACT MESSAGES ---
                elif message_type == 'contact':
                    contact_data = message.get('contact', {})
                    contacts = contact_data.get('contacts', [])
                    if contacts:
                        contact = contacts[0]
                        name = contact.get('name', {})
                        full_name = f"{name.get('first_name', '')} {name.get('last_name', '')}".strip()
                        phones = contact.get('phones', [])
                        phone = phones[0].get('phone', '') if phones else ''
                        message_text = f"[Contact: {full_name or 'Unknown'} - {phone}]"
                    else:
                        message_text = "[Contact]"
                    logger.info(f"Contact shared from {from_number}")
                
                # --- STICKER MESSAGES ---
                elif message_type == 'sticker':
                    sticker_data = message.get('sticker', {})
                    media_url = sticker_data.get('url')
                    message_text = "[Sticker]"
                    logger.info(f"Sticker from {from_number}")
                
                # --- INTERACTIVE MESSAGES (Buttons/Lists) ---
                elif message_type == 'reply':
                    reply_data = message.get('reply', {})
                    reply_type = reply_data.get('type', '')
                    
                    if reply_type == 'buttons_reply':
                        buttons_reply = reply_data.get('buttons_reply', {})
                        message_text = buttons_reply.get('title', '')
                        if not message_text:
                            message_text = buttons_reply.get('id', '')
                        logger.info(f"Button reply from {from_number}: {message_text}")
                        
                    elif reply_type == 'list_reply':
                        list_reply = reply_data.get('list_reply', {})
                        message_text = list_reply.get('title', '')
                        if not message_text:
                            message_text = list_reply.get('id', '')
                        logger.info(f"List reply from {from_number}: {message_text}")
                
                # --- LEGACY BUTTON/LIST FORMATS ---
                elif message_type == 'button':
                    button_data = message.get('button', {})
                    message_text = button_data.get('text', '')
                    if not message_text:
                        message_text = button_data.get('id', '')
                    logger.info(f"Legacy button from {from_number}: {message_text}")
                    
                elif message_type == 'list':
                    list_data = message.get('list', {})
                    message_text = list_data.get('title', '')
                    if not message_text:
                        message_text = list_data.get('id', '')
                    logger.info(f"Legacy list from {from_number}: {message_text}")
                
                # --- UNKNOWN MESSAGE TYPE ---
                else:
                    continue
                    message_text = f"[{message_type.upper()}]"
                    logger.warning(f"Unknown message type '{message_type}' from {from_number}")
                
                # Check for quoted message context
                context = message.get('context', {})
                if context:
                    is_quoted = True
                    quoted_content = context.get('quoted_content', {})
                    if quoted_content:
                        logger.debug(f"Quoted context found: {quoted_content}")
                
                # If we still don't have message text, use the message type
                if not message_text and message_type:
                    message_text = f"[{message_type.upper()}]"
                
                # Map common IDs to text commands (for interactive responses)
                if message_type in ['reply', 'button', 'list'] and not message_text:
                    id_to_text = {
                        'lend_money': 'lend money',
                        'track_lended': 'track lended',
                        'settle_debt': 'settle debt',
                        'ButtonsV3:lend_money': 'lend money',
                        'ButtonsV3:track_lended': 'track lended',
                        'ButtonsV3:settle_debt': 'settle debt',
                        'main_menu': 'menu',
                        'profile': 'profile',
                        'offer': 'offer service',
                    }
                    message_text = id_to_text.get(message_id, message_id)
                
                # Only process if we have content
                if from_number and (message_text or message_id):
                    handler = MessageHandler()
                    
                    # Pass all the extracted data
                    handler.handle_incoming_message(
                        from_number=from_number,
                        message_text=message_text,
                        message_id=message_id,
                        is_quoted=is_quoted,
                        direction=direction
                    )
                else:
                    logger.warning(f"Message ignored - from: {from_number}, type: {message_type}, id: {message_id}")
        
        return Response({'status': 'ok', 'message': 'Webhook processed'}, status=200)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return Response({'status': 'error', 'message': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}", exc_info=True)
        return Response({'status': 'error', 'message': str(e)}, status=500)
    
@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'healthy'}, status=200)

@csrf_exempt
@api_view(['POST'])
def verify_person(request, person_id):
    from users.models import Person
    from chatbot.whatsapp_client import WhatsAppClient
    import random
    whatsapp = WhatsAppClient()
    try:
        person = Person.objects.get(id=person_id)
        if getattr(person,'uploader',None):
            random_number = random.randint(1000, 9999)
            subject_details = (
                "Do you accept addition of your details below to CrediSafe;\n\n"
                f"Name: {person.full_name}\n"
                f"ID Number: {person.national_id}\n"
                f"Address: {person.address}\n"
                f"Mobile Number: {person.phone_number}\n"
                f"\n1. Yes, type code *{random_number}* below\n"
                "2. Edit details\n3. Reject"
            )
            
            person.user_status = 'borrower_confirmation'
            person.save(update_fields=['user_status'])
            whatsapp.send_message(person.phone_number, subject_details)
        else:
            person.user_status = 'verified'
            person.is_verified = True
            person.save(update_fields=['user_status', 'is_verified'])
            whatsapp.send_message(person.phone_number, "Congratulations! Your account has been verified on CrediSafe, send hi to get started.")
        return Response({'status': 'ok', 'message': 'Person verified'}, status=200)
    except Person.DoesNotExist:
        return Response({'status': 'error', 'message': 'Person not found'}, status=404)


def is_valid_zimbabwe_phone(phone: str) -> bool:
    """
    Validates Zimbabwean mobile phone numbers.

    Accepted formats:
    - 0772123456
    - 0712345678
    - 0731234567
    - 0783123456
    - +263772123456
    - 263772123456
    """
    pattern = r"^(?:\+263|263|0)(?:71|73|77|78)\d{7}$"
    return bool(re.fullmatch(pattern, phone))

def validate_name(name: str) -> bool:
    if len(name.split()) < 2 or len(name) <5:
        return False
    return True

def validate_address(address: str) -> bool:
    if not len(address.split(",")) < 4 or len(address) < 5:
        return False
    return True