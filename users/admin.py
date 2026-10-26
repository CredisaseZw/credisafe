from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Person, User
# chatbot/admin.py
@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = (
        'phone_number', 'full_name', 'national_id',
        'is_auto_verified', 'needs_manual_review',
        'id_verification_score', 'verification_status',
    )
    list_filter = ('is_auto_verified', 'needs_manual_review', 'verification_status')
    search_fields = ('phone_number', 'national_id', 'full_name')
    readonly_fields = ('id_verification_raw_text', 'id_verification_score')

    actions = ['approve_verification', 'reject_verification']

    @admin.action(description="Approve ID verification")
    def approve_verification(self, request, queryset):
        queryset.update(
            is_verified=True, is_auto_verified=False,
            needs_manual_review=False,
            verification_status='verified',
            id_verification_method='manual',
        )

    @admin.action(description="Reject ID verification")
    def reject_verification(self, request, queryset):
        queryset.update(
            is_verified=False, needs_manual_review=False,
            verification_status='rejected',
            id_verification_method='manual',
        )

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'phone_number', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'phone_number']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('phone_number', 'role'),
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('phone_number', 'role'),
        }),
    )