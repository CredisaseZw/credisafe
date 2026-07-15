from django.db import models
from users.models import Person

class WhatsAppMessage(models.Model):
    """Track all WhatsApp messages for audit"""
    DIRECTION_CHOICES = [
        ('incoming', 'Incoming'),
        ('outgoing', 'Outgoing'),
    ]
    
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='messages')
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    message_type = models.CharField(max_length=50, default='text')
    content = models.TextField()
    whatsapp_message_id = models.CharField(max_length=100, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['person', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.direction} - {self.person.phone_number} - {self.timestamp}"

class ConversationSession(models.Model):
    """Track conversation sessions for better state management"""
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='sessions')
    is_active = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    context_data = models.JSONField(default=dict)
    
    def end_session(self):
        self.is_active = False
        self.ended_at = models.DateTimeField(auto_now=True)
        self.save()