from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Person, User

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['id','phone_number', 'national_id', 'full_name', 'user_mode', 'user_status', 'is_verified']
    list_filter = ['user_mode', 'user_status', 'is_verified']
    search_fields = ['phone_number', 'national_id', 'full_name']
    readonly_fields = ['created_at', 'updated_at', 'last_interaction']
    
    fieldsets = (
        ('Personal Info', {
            'fields': ('phone_number', 'national_id', 'full_name','mentioned_name', 'oldest_creditor','old_phone_number','mentioned_phone_number','address','uploader')
        }),
        ('Status', {
            'fields': ('user_mode', 'user_status', 'is_verified', 'credit_score', 'amount_owed', 'currency', 'name_match_score', 'phone_match_score','verification_status')
        }),
        ('Session', {
            'fields': ('session_data', 'last_interaction')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
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