from django.contrib import admin
from .models import ClinicalImage, ImageSeries, ImageAnnotation

@admin.register(ClinicalImage)
class ClinicalImageAdmin(admin.ModelAdmin):
    list_display = ('patient', 'image_type', 'specialty', 'uploaded_at', 'uploaded_by')
    list_filter = ('image_type', 'specialty')

admin.site.register(ImageSeries)
admin.site.register(ImageAnnotation)
