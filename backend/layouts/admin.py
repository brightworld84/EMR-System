from django.contrib import admin
from .models import LayoutTemplate, LayoutSection, FieldType, AutoPopulationRule, LayoutUsageLog

@admin.register(LayoutTemplate)
class LayoutTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'specialty', 'visit_type', 'clinic', 'is_active')
    list_filter = ('specialty', 'visit_type', 'is_active')

admin.site.register(LayoutSection)
admin.site.register(FieldType)
admin.site.register(AutoPopulationRule)
admin.site.register(LayoutUsageLog)
