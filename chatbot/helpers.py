def get_whatsapp_payments_options(lender, message_to_send):
    from chatbot.whatsapp_client import WhatsAppClient
    whatsapp = WhatsAppClient()
    buttons = [
                {'id': 'pay_ECOCASH',  'title': 'EcoCash'},
                {'id': 'pay_INNBUCKS', 'title': 'InnBucks'},
                {'id': 'pay_OMARI',    'title': 'Omari'},
                {'id':'back',   'title':'Back'},
                {'id': 'exit',   'title': 'Exit'},
            ]
    sections =[
        {
            "title": "Payment Options",
            "rows": buttons
        }
    ]
    return whatsapp.send_interactive_list(
                to_number=lender.phone_number,
                body_text=message_to_send,
                sections=sections,
                button_text="Select Payment Method"
            )