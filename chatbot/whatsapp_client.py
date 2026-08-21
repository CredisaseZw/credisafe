import requests
import json
from django.conf import settings
import logging
from typing import Dict, Any, List, Optional
from django.core.cache import cache
logger = logging.getLogger(__name__)

class WhatsAppClient:
    def __init__(self):
        self.api_key = settings.WHAPI_API_KEY
        self.base_url = settings.WHAPI_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'accept': 'application/json'
        }
        self.cache_prefix = "whapi_disappearing_"
        
        # WHAPI ephemeral duration mappings
        self.ephemeral_mappings = {
            86400: "day",      # 24 hours
            604800: "week",    # 7 days
            2592000: "month",  # 30 days
            31536000: "year",  # 365 days
        }
    
    def _clean_phone_number(self, phone_number: str) -> str:
        """Clean phone number for WhatsApp"""
        phone_number = phone_number.replace('+', '').replace(' ', '')
        return phone_number
    
    def _get_chat_id(self, phone_number: str) -> str:
        """
        Convert phone number to WHAPI chat ID format
        Based on WHAPI documentation, ChatID should be in format: phone_number@c.us
        """
        phone_number = self._clean_phone_number(phone_number)
        return f"{phone_number}@s.whatsapp.net"
    
    def _get_ephemeral_value(self, expiration_time: int) -> str:
        """
        Convert seconds to WHAPI ephemeral string value
        WHAPI accepts: "day", "week", "month", "year"
        """
        # If exact match found
        if expiration_time in self.ephemeral_mappings:
            return self.ephemeral_mappings[expiration_time]
        
        # Find closest match
        closest = min(self.ephemeral_mappings.keys(), key=lambda x: abs(x - expiration_time))
        return self.ephemeral_mappings[closest]
    
    def _get_cache_key(self, phone_number: str) -> str:
        """Get cache key for a phone number"""
        return f"{self.cache_prefix}{phone_number}"
    
    def _is_disappearing_enabled(self, phone_number: str) -> bool:
        """Check if disappearing messages are already enabled for this chat"""
        cache_key = self._get_cache_key(phone_number)
        
        # Check cache first
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        # If not in cache, check with API
        try:
            chat_id = self._get_chat_id(phone_number)
            
            response = requests.get(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Check if ephemeral is set (not null/empty)
                ephemeral = data.get('ephemeral')
                is_enabled = ephemeral is not None and ephemeral != ""
                
                cache.set(cache_key, is_enabled, timeout=3600)
                return is_enabled
            
            return False
                
        except Exception:
            return False
    
    def _enable_disappearing_messages(self, phone_number: str, expiration_time: int = 86400) -> bool:
        """
        Enable disappearing messages for a chat using PATCH /chats/{ChatID}
        According to WHAPI docs: ephemeral accepts "day", "week", "month", "year"
        """
        try:
            chat_id = self._get_chat_id(phone_number)
            ephemeral_value = self._get_ephemeral_value(expiration_time)
            
            # WHAPI PATCH /chats/{ChatID} with ephemeral
            payload = {
                "ephemeral": ephemeral_value  # "day", "week", "month", or "year"
            }
            
            response = requests.patch(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                cache_key = self._get_cache_key(phone_number)
                cache.set(cache_key, True, timeout=3600)
                return True
            else:
                # Try with disappearing_messages field as well
                payload_alt = {
                    "ephemeral": ephemeral_value,
                    "disappearing_messages": True
                }
                
                response = requests.patch(
                    f"{self.base_url}/chats/{chat_id}",
                    headers=self.headers,
                    json=payload_alt,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    cache_key = self._get_cache_key(phone_number)
                    cache.set(cache_key, True, timeout=3600)
                    return True
                
                logger.error(f"Failed to enable disappearing: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Enable disappearing error: {str(e)}")
            return False
    
    def _ensure_disappearing_enabled(self, phone_number: str) -> bool:
        """Ensure disappearing messages are enabled for a chat"""
        if self._is_disappearing_enabled(phone_number):
            return True
        
        return self._enable_disappearing_messages(phone_number)
    
    def send_message(self, to_number: str, message: str, enable_disappearing: bool = True):
        """Send a message via WhatsApp with optional disappearing messages"""
        import time
        try:
            to_number = self._clean_phone_number(to_number)
            # Enable disappearing messages if requested
            if enable_disappearing:
                enabled = self._ensure_disappearing_enabled(to_number)
                if not enabled:
                    # Log but continue - don't block message sending
                    logger.error(f"Could not enable disappearing for {to_number}, but continuing with message")
            
            payload = {
                "to": to_number,
                "body": message,
            }
            time.sleep(1)
            response = requests.post(
                f"{self.base_url}/messages/text",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                # Try alternative endpoint
                return self._send_message_alternative(to_number, message)
                
        except Exception as e:
            logger.error(f"WhatsApp send error: {str(e)}")
            return None
    
    def send_media(
        self,
        to_number: str,
        media_type: str,
        media_url: str,
        caption: str = ""
    ):
        """Send media via WhatsApp using Whapi."""

        try:
            to_number = self._clean_phone_number(to_number)

            # Whapi endpoint is based on the media type
            endpoint = f"{self.base_url}/messages/{media_type}"

            payload = {
                "to": to_number,
                "media": media_url,
            }

            if caption:
                payload["caption"] = caption

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload,
                timeout=60
            )

            if response.status_code in [200, 201]:
                return response.json()

            return None

        except Exception as e:
            logger.error(f"WhatsApp media send error: {str(e)}")
            return None
    
    def delete_message(self, message_id: str) -> bool:
        """Delete a message from server"""
        try:
            response = requests.delete(
                f"{self.base_url}/messages/{message_id}",
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 200:
                return True

            logger.error(f"Failed to delete message {message_id}: {response.status_code} {response.text}")
            return False

        except Exception as e:
            logger.error(f"Delete message error: {str(e)}")
            return False
    
    def get_chat_settings(self, phone_number: str):
        """Get chat settings using GET /chats/{ChatID}"""
        try:
            chat_id = self._get_chat_id(phone_number)
            
            response = requests.get(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get chat settings: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Get chat settings error: {str(e)}")
            return None
    
    def update_chat_settings(self, phone_number: str, settings: dict):
        """Update chat settings using PATCH /chats/{ChatID}"""
        try:
            chat_id = self._get_chat_id(phone_number)
            
            response = requests.patch(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                json=settings,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                logger.error(f"Failed to update chat settings: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Update chat settings error: {str(e)}")
            return None
    
    def disable_disappearing_messages(self, phone_number: str) -> bool:
        """Disable disappearing messages for a chat"""
        try:
            chat_id = self._get_chat_id(phone_number)
            
            # To disable, set ephemeral to null or empty string
            payload = {
                "ephemeral": ""  # Empty string disables disappearing messages
            }
            
            response = requests.patch(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                cache_key = self._get_cache_key(phone_number)
                cache.set(cache_key, False, timeout=3600)
                return True
            else:
                logger.error(f"Failed to disable disappearing: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Disable disappearing error: {str(e)}")
            return False
    
    def set_ephemeral_duration(self, phone_number: str, duration: str) -> bool:
        """
        Set ephemeral message duration
        duration: "day", "week", "month", or "year"
        """
        valid_durations = ["day", "week", "month", "year"]
        if duration not in valid_durations:
            logger.error(f"Invalid duration: {duration}. Must be one of {valid_durations}")
            return False
        
        try:
            chat_id = self._get_chat_id(phone_number)
            
            payload = {
                "ephemeral": duration
            }
            
            response = requests.patch(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                cache_key = self._get_cache_key(phone_number)
                cache.set(cache_key, True, timeout=3600)
                return True
            else:
                logger.error(f"Failed to set ephemeral duration: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Set ephemeral duration error: {str(e)}")
            return False
    
    def get_ephemeral_status(self, phone_number: str):
        """Get current ephemeral/ disappearing message status"""
        try:
            chat_id = self._get_chat_id(phone_number)
            
            response = requests.get(
                f"{self.base_url}/chats/{chat_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                ephemeral = data.get('ephemeral')
                return {
                    'enabled': ephemeral is not None and ephemeral != "",
                    'duration': ephemeral if ephemeral else 'disabled'
                }
            else:
                logger.error(f"Failed to get ephemeral status: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Get ephemeral status error: {str(e)}")
            return None
    def get_chat_id_from_response(self, phone_number: str) -> str:
        """
        Get the actual chat ID from WHAPI by checking the chat
        This can help debug the correct format
        """
        try:
            phone_number = self._clean_phone_number(phone_number)
            
            # Try different formats
            formats = [
                f"{phone_number}@c.us",
                f"{phone_number}@s.whatsapp.net",
                phone_number
            ]
            
            results = {}
            for chat_id in formats:
                try:
                    response = requests.get(
                        f"{self.base_url}/chats/{chat_id}",
                        headers=self.headers,
                        timeout=5
                    )
                    results[chat_id] = {
                        'status': response.status_code,
                        'exists': response.status_code == 200
                    }
                except Exception as e:
                    results[chat_id] = {'error': str(e)}
            
            return results
            
        except Exception as e:
            logger.error(f"Get chat ID error: {str(e)}")
            return {}
        
    def send_message_alternative(self, to_number, message):
        """Try alternative WHAPI endpoint format"""
        try:
            to_number = self._clean_phone_number(to_number)
            
            # Alternative payload format
            payload = {
                "to": to_number,
                "text": message,
                "type": "text"
            }
            
            
            response = requests.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code == 200 or response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Alternative also failed: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Alternative send error: {str(e)}")
            return None
    
    def send_interactive_buttons(self, to_number, text, buttons, header_text=None, footer_text=None):
        """
        Send interactive button message using CORRECT WHAPI format
        buttons: List of dicts with 'id' and 'title' keys (max 3)
        """
        try:
            to_number = self._clean_phone_number(to_number)
                
            # Build the payload using CORRECT WHAPI format
            payload = {
                "to": to_number,
                "type": "button",
                "body": {"text": text},
            }
            
            # Add optional components
            if header_text:
                payload["header"] = {"text": header_text}
            
            if footer_text:
                payload["footer"] = {"text": footer_text}
            
            # Build buttons with CORRECT types - using 'quick_reply' instead of 'reply'
            action_buttons = []
            for btn in buttons[:3]:  # Max 3 buttons
                action_buttons.append(
                    {
                        "type": "quick_reply",  # Changed from 'reply' to 'quick_reply'
                        "title": btn["title"][:20],  # Max 20 chars
                        "id": btn.get("id", f"btn_{len(action_buttons)}"),
                    }
                )
            
            # Add action with buttons
            payload["action"] = {"buttons": action_buttons}
            
            
            url = f"{self.base_url}/messages/interactive"
            response = requests.post(url, json=payload, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                return True
            else:
                logger.error(f"Failed to send buttons: {response.status_code} - {response.text}")
                # Fallback to text message
                fallback_text = text + "\n\n"
                for i, btn in enumerate(buttons, 1):
                    fallback_text += f"{i}. {btn['title']}\n"
                self.send_message(to_number, fallback_text)
                return False
                
        except Exception as e:
            logger.error(f"Interactive buttons error: {str(e)}")
            return False
    
    def send_interactive_list(
        self,
        to_number: str,
        body_text: str,
        button_text: str,
        sections: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
    ) -> bool:
        """
        Send interactive list message using confirmed working structure
        For credit service app menus and options
        """
        try:
            to_number = self._clean_phone_number(to_number)
            
            # Build the payload using the confirmed working structure
            payload = {
                "to": to_number,
                "type": "list",
                "body": {"text": body_text},
            }
            
            # Add optional components
            if header_text:
                payload["header"] = {"text": header_text}
            
            if footer_text:
                payload["footer"] = {"text": footer_text}
            
            # Format sections exactly as in working example
            formatted_sections = []
            for section in sections:
                section_data = {
                    "title": section.get("title", "Options")[:24],
                    "rows": [],
                }
                
                for row in section.get("rows", [])[:10]:  # Max 10 rows
                    row_data = {
                        "title": row["title"][:24],
                        "id": row.get("id", f"row_{len(section_data['rows'])}"),
                    }
                    if row.get("description"):
                        row_data["description"] = row["description"][:72]
                    
                    section_data["rows"].append(row_data)
                
                formatted_sections.append(section_data)
            
            # Add action with list structure
            payload["action"] = {
                "list": {
                    "sections": formatted_sections,
                    "label": button_text[:20],  # This becomes the button text
                }
            }
            
            logger.debug(f"Sending interactive list to {to_number}")
            logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
            
            url = f"{self.base_url}/messages/interactive"
            response = requests.post(url, json=payload, headers=self.headers, timeout=30)
            
            if response.status_code in [200, 201]:
                logger.info(f"Interactive list sent successfully to {to_number}")
                return True
            else:
                logger.error(f"Failed to send list: {response.status_code} - {response.text}")
                # Fallback to text message
                fallback_text = body_text + "\n\n"
                for section in sections:
                    fallback_text += f"\n{section.get('title', 'Options')}:\n"
                    for row in section.get('rows', []):
                        fallback_text += f"  • {row['title']}"
                        if row.get('description'):
                            fallback_text += f" - {row['description']}"
                        fallback_text += "\n"
                self.send_message(to_number, fallback_text)
                return False
                
        except Exception as e:
            logger.error(f"Interactive list error: {str(e)}")
            return False
    
    def send_main_menu_buttons(self, to_number: str) -> bool:
        """Send main menu options as interactive buttons for credit service"""
        buttons = [
            {'id': 'lend_money', 'title': '💰 Lend Money'},
            {'id': 'track_lended', 'title': '📊 Track Lended'},
            {'id': 'settle_debt', 'title': '✅ Settle Debt'}
        ]
        
        return self.send_interactive_buttons(
            to_number=to_number,
            text="🏦 *AssetSafe Credit Service*\n\nPlease select an option:",
            buttons=buttons,
            header_text="Main Menu",
            footer_text="Reply with option number if buttons don't work"
        )
    
    def send_credit_report_buttons(self, to_number: str, person_name: str) -> bool:
        """Send credit report action buttons"""
        buttons = [
            {'id': 'request_access', 'title': '🔐 Request Access'},
            {'id': 'edit_details', 'title': '✏️ Edit Details'},
            {'id': 'exit', 'title': '🚪 Exit'}
        ]
        
        return self.send_interactive_buttons(
            to_number=to_number,
            text=f"What would you like to do with {person_name}'s credit report?",
            buttons=buttons,
            header_text="Credit Report Options",
            footer_text="Select an option to continue"
        )
    
    def send_loan_selection_list(self, to_number: str, loans: List[Dict]) -> bool:
        """
        Send active loans as interactive list for settlement
        loans: List of dicts with 'id', 'amount', 'borrower_name', 'due_date'
        """
        if not loans:
            return False
        
        sections = [{
            "title": "Your Active Loans",
            "rows": []
        }]
        
        for loan in loans[:10]:  # Max 10 items
            sections[0]["rows"].append({
                "id": str(loan['id']),
                "title": f"${loan['amount']:.2f} - {loan['borrower_name']}",
                "description": f"Due: {loan['due_date']}"
            })
        
        return self.send_interactive_list(
            to_number=to_number,
            body_text="Please select the loan you want to mark as settled:",
            button_text="Select Loan",
            sections=sections,
            header_text="📋 Settle Debt",
            footer_text="Choose a loan to settle"
        )
    
    def send_track_loans_list(self, to_number: str, loans: List[Dict]) -> bool:
        """
        Send loans as interactive list for tracking
        loans: List of dicts with 'id', 'amount', 'borrower_name', 'status', 'due_date'
        """
        if not loans:
            return False
        
        # Group loans by status
        sections = []
        
        active_loans = [l for l in loans if l.get('status') == 'active']
        settled_loans = [l for l in loans if l.get('status') == 'settled']
        
        if active_loans:
            active_section = {
                "title": "🔄 Active Loans",
                "rows": []
            }
            for loan in active_loans[:10]:
                active_section["rows"].append({
                    "id": str(loan['id']),
                    "title": f"${loan['amount']:.2f} - {loan['borrower_name']}",
                    "description": f"Due: {loan['due_date']}"
                })
            sections.append(active_section)
        
        if settled_loans:
            settled_section = {
                "title": "✅ Settled Loans",
                "rows": []
            }
            for loan in settled_loans[:10]:
                settled_section["rows"].append({
                    "id": str(loan['id']),
                    "title": f"${loan['amount']:.2f} - {loan['borrower_name']}",
                    "description": f"Settled: {loan.get('settled_date', 'N/A')}"
                })
            sections.append(settled_section)
        
        if not sections:
            return False
        
        return self.send_interactive_list(
            to_number=to_number,
            body_text="Here are your lending records:",
            button_text="View Loans",
            sections=sections,
            header_text="📊 Lending History",
            footer_text="Select a loan for details"
        )
    
    def send_verification_options_list(self, to_number: str) -> bool:
        """Send verification options as interactive list"""
        sections = [
            {
                "title": "Verification Methods",
                "rows": [
                    {
                        "id": "send_id_photo",
                        "title": "📸 Send ID Photo",
                        "description": "Upload National ID/Passport photo"
                    },
                    {
                        "id": "manual_review",
                        "title": "⏳ Request Review",
                        "description": "Request manual account review"
                    },
                    {
                        "id": "contact_support",
                        "title": "📞 Contact Support",
                        "description": "Get help from support team"
                    },
                    {
                        "id": "check_status",
                        "title": "🔍 Check Status",
                        "description": "Check verification status"
                    }
                ]
            }
        ]
        
        return self.send_interactive_list(
            to_number=to_number,
            body_text="How would you like to verify your account?",
            button_text="Verify Account",
            sections=sections,
            header_text="🔐 Account Verification",
            footer_text="Choose verification method"
        )
    
    def send_credit_timeline_list(self, to_number: str) -> bool:
        """Send credit check timeline options"""
        sections = [
            {
                "title": "Credit Check Options",
                "rows": [
                    {
                        "id": "check_self",
                        "title": "👤 Check My Credit",
                        "description": "View your own credit report"
                    },
                    {
                        "id": "check_other",
                        "title": "👥 Check Someone Else",
                        "description": "Check credit with OTP verification"
                    },
                    {
                        "id": "bulk_check",
                        "title": "📋 Bulk Credit Check",
                        "description": "Check multiple IDs (Premium)"
                    },
                    {
                        "id": "credit_score",
                        "title": "📊 Credit Score Info",
                        "description": "Learn about credit scoring"
                    }
                ]
            }
        ]
        
        return self.send_interactive_list(
            to_number=to_number,
            body_text="What type of credit check would you like to perform?",
            button_text="Credit Check",
            sections=sections,
            header_text="🔍 Credit Check",
            footer_text="Select an option"
        )
    
    def send_loan_amount_options(self, to_number: str) -> bool:
        """Send loan amount quick options"""
        sections = [
            {
                "title": "Quick Amounts",
                "rows": [
                    {"id": "100", "title": "$100", "description": "Small loan amount"},
                    {"id": "500", "title": "$500", "description": "Medium loan amount"},
                    {"id": "1000", "title": "$1,000", "description": "Standard loan"},
                    {"id": "5000", "title": "$5,000", "description": "Large loan"},
                    {"id": "custom", "title": "💰 Custom Amount", "description": "Enter your own amount"}
                ]
            }
        ]
        
        return self.send_interactive_list(
            to_number=to_number,
            body_text="Select a loan amount or choose custom:",
            button_text="Select Amount",
            sections=sections,
            header_text="💰 Loan Amount",
            footer_text="Quick select or enter custom amount"
        )
    
    def send_list_message(self, to_number, title, description, sections):
        """Send a list message for options - WHAPI format (legacy method)"""
        try:
            to_number = self._clean_phone_number(to_number)
            
            # Transform sections to WHAPI format
            whapi_sections = []
            for section in sections:
                whapi_section = {
                    "title": section.get('title', 'Options'),
                    "rows": []
                }
                for row in section.get('rows', []):
                    whapi_section['rows'].append({
                        "rowId": row.get('id', ''),
                        "title": row.get('title', ''),
                        "description": row.get('description', '')
                    })
                whapi_sections.append(whapi_section)
            
            # Use the new interactive list method
            return self.send_interactive_list(
                to_number=to_number,
                body_text=description,
                button_text=title[:20] if title else "Select",
                sections=whapi_sections,
                header_text=title,
                footer_text=None
            )
            
        except Exception as e:
            logger.error(f"List message error: {str(e)}")
            return False
    
    def send_typing_indicator(self, to_number):
        """Send typing indicator"""
        try:
            to_number = self._clean_phone_number(to_number)
            
            payload = {
                "to": to_number,
                "typing": True
            }
            
            response = requests.post(
                f"{self.base_url}/typing",
                headers=self.headers,
                json=payload
            )
            
            return response.status_code in [200, 201]
            
        except Exception as e:
            logger.error(f"Typing indicator error: {str(e)}")
            return False

    def send_template_message(self, to_number, template_name, language="en", components=None):
        """Send a template message (for verified business accounts)"""
        try:
            to_number = self._clean_phone_number(to_number)
            
            payload = {
                "to": to_number,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language},
                    "components": components or []
                }
            }
            
            response = requests.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload
            )
            
            return response.status_code in [200, 201]
            
        except Exception as e:
            logger.error(f"Template message error: {str(e)}")
            return False