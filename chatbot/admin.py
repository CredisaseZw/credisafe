from django.contrib import admin
from chatbot.models import WhatsAppMessage

@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ['person', 'direction', 'message_type', 'whatsapp_message_id', 'timestamp']
    search_fields = ['person__phone_number',"whatsapp_message_id"]
# Register your models here.
