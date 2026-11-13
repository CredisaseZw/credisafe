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
                button_text="Payment Method"
            )
    
def handle_how_it_works():
    """Send users a detailed explanation of how Credi works."""

    message = (
        "📘 *Credi: HOW IT WORKS*\n\n"
        "Welcome to *©Credi by Fincheck*, a registered credit bureau.\n\n"
        "Credi helps individuals and businesses keep proper records "
        "of money they lend, money they borrow and other outstanding "
        "financial obligations.\n\n"
        "Whether you lend money to someone, buy goods on credit, owe "
        "someone money or want to keep track of payments, Credi "
        "helps you manage these records through WhatsApp.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*1. CREATE YOUR ACCOUNT*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "To get started, register on Credi through WhatsApp.\n\n"
        "You will be guided through the registration process, where "
        "you provide your personal details and National ID information "
        "for verification.\n\n"
        "Once your details have been verified, you can access the "
        "available Credi services.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*2. GIVE SOMEONE CREDIT*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "If you lend money to someone or allow someone to take goods "
        "or services on credit, you can record the agreement on Credi.\n\n"
        "You will provide details such as:\n"
        "• The borrower's details.\n"
        "• The amount being given.\n"
        "• The currency.\n"
        "• The agreed repayment date.\n"
        "• Other relevant credit agreement details.\n\n"
        "The borrower must give consent before the credit can be activated.\n\n"
        "Once the borrower has consented and the credit is activated, "
        "the agreement is recorded on Credi.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*3. TRACK MONEY OWED TO YOU*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "You can use Credi to see who owes you money, how much "
        "they owe and when they are expected to pay.\n\n"
        "You do not have to rely on memory, WhatsApp conversations "
        "or handwritten notes to keep track of outstanding credit agreements.\n\n"
        "Your records are available through your account.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*4. TRACK MONEY YOU OWE*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Credi also helps you keep track of your own financial obligations.\n\n"
        "You can view recorded credit obligations linked to your profile, "
        "including money you owe to lenders, credit stores and other "
        "participating service providers.\n\n"
        "This helps you understand your outstanding debts and keep "
        "track of your financial commitments.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*5. WHAT HAPPENS IF SOMEONE DOES NOT PAY?*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "When a credit agreement is activated, Credi keeps track "
        "of the agreed repayment date.\n\n"
        "If the borrower fails to settle the outstanding amount, "
        "the unpaid obligation may be recorded as a negative credit "
        "record in accordance with the applicable credit reporting process.\n\n"
        "This can affect their ability to obtain credit or access "
        "services from participating institutions, including:\n\n"
        "• Banks.\n"
        "• Credit stores.\n"
        "• Microfinance institutions.\n"
        "• Rental service providers.\n"
        "• Other participating credit providers.\n\n"
        "An unpaid credit obligation can therefore affect someone's "
        "ability to obtain further credit.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*6. HOW TO CLEAR A DEBT AFTER RECEIVING PAYMENT*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Once someone pays you, you need to record that payment "
        "on Credi.\n\n"
        "Follow these steps:\n\n"
        "1. Open your Credi WhatsApp account.\n"
        "2. Go to *Accounting*.\n"
        "3. Select the option to post a receipt.\n"
        "4. Enter the relevant payment details.\n"
        "5. Submit the receipt.\n\n"
        "The payment is then recorded against the relevant financial "
        "obligation, and the outstanding credit record is updated accordingly.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*7. CHECK SOMEONE'S CREDIT INFORMATION*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Before giving someone credit, you can check their credit "
        "information through Credi.\n\n"
        "This helps you understand their existing credit obligations "
        "and repayment history before making a lending decision.\n\n"
        "However, credit information is not accessible without the "
        "person's consent.\n\n"
        "The person must authorise the inquiry. Credi handles "
        "the consent process automatically.\n\n"
        "If you are able to view someone's credit report, it means "
        "the required consent has been provided.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*8. MANAGE YOUR FINANCES*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Credi is not limited to recording money you lend.\n\n"
        "You can also use it to manage and view your financial records, "
        "including:\n\n"
        "• Money owed to you.\n"
        "• Money you owe.\n"
        "• Outstanding credit agreements.\n"
        "• Payments and receipts.\n"
        "• Financial statements.\n"
        "• Credit inquiries.\n"
        "• Other recorded financial obligations.\n\n"
        "The aim is to help you maintain accurate records of your "
        "financial dealings.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*9. OTHER SERVICES*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Credi also supports financial records involving different "
        "types of credit arrangements, including:\n\n"
        "• Personal loans.\n"
        "• Business credit.\n"
        "• Goods purchased on credit.\n"
        "• Bank-related credit obligations.\n"
        "• Microfinance loans.\n"
        "• Credit store accounts.\n"
        "• Rental dues and obligations.\n"
        "• Other recorded financial agreements.\n\n"
        "Availability depends on participating service providers "
        "and the services enabled on the platform.\n\n"

        "━━━━━━━━━━━━━━━━━━\n"
        "*10. YOUR CONSENT AND PRIVACY*\n"
        "━━━━━━━━━━━━━━━━━━\n\n"
        "Your financial information is private.\n\n"
        "Credi requires the relevant person's consent before "
        "their credit information can be accessed or a new credit "
        "agreement can be activated.\n\n"
        "Your records are not made available to other parties "
        "without the required authorisation.\n\n"
        "Always ensure that the information you submit is accurate "
        "and that credit agreements reflect what was actually agreed "
        "between the parties.\n\n"

        "━━━━━━━━━━━━━━━━━━\n\n"
        "🌐 Website: https://fincheck.co.zw\n\n"
        "📞 WhatsApp Support: +263 715 239 711\n\n"
        "*©Credi by Fincheck*\n\n"
        "Your money. Your records. Your trust.\n\n"
        "*Record it. Track it. Get paid.*"
    )

    return message



def welcome():
    message = (
        "👋 Hi, I’m Credi by Fincheck (Registered Credit Bureau Zimbabwe) http://fincheck.co.zw\n\n"
        "Your money. Your records. Your trust.\n\n"
        "I help you protect your hard-earned money by enabling you to check the credit status of a potential borrower, record credit transactions, follow up on overdue loans and keep track of payments and balances.\n\n"
        "With me, you can build a stronger financial reputation and unlock more opportunities with suppliers and lenders.\n\n"
        "🔒 *Your Privacy Matters*\n\n"
        "Your information belongs to you. Here is our promise:\n"
        "🔒 Private & Confidential: Only you can access your financial records.\n"
        "🛡️ Your Information, Your Control: We do not share or report your records to tax authorities or other third parties.\n"
        "🤝 Your Consent Comes First: No one can view your credit information without your permission.\n\n"
        "💳 *Payments & Services*\n"
        "Some services, such as uploading credit records and checking credit status, require a small fee.\n"
        "Payments are made easily through mobile money platforms, including EcoCash, InnBucks, Omari, and other supported payment options.\n"
        "You will be informed of the applicable charges before completing a paid service.\n"
        "Ready to take control of your credit and protect your money?\n"
        "By continuing, you acknowledge and agree to our privacy practices and service terms."
    )

    return message
