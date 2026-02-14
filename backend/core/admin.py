from django.contrib import admin
from .models import Clinic, User, AuditLog, SystemConfiguration

@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ('name', 'clinic_type', 'city', 'state', 'is_active')
    search_fields = ('name', 'npi')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'clinic', 'is_active')
    list_filter = ('role', 'clinic', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'username', 'action', 'resource_type', 'ip_address')
    list_filter = ('action', 'resource_type', 'timestamp')
    search_fields = ('username', 'resource_type')
    readonly_fields = ('timestamp', 'username', 'action', 'resource_type', 'resource_id', 'ip_address', 'changes')

@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    list_display = ('key', 'updated_at', 'updated_by')
