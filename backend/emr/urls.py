from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.api import clinic_config
from patients.recent import recent_patients
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT auth for React
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/clinic/config/', clinic_config, name='clinic_config'),

    # APIs
    path('api/', include('patients.urls')),
    path('api/', include('scheduling.urls')),
    path('api/recent-patients/', recent_patients, name='recent_patients'),
    path('api/', include('providers.urls')),
    path('api/', include('metrics.urls')),
    path('api/', include('documents.urls')),

]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
