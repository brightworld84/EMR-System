from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import AuditLog
from .models import Patient
from .serializers import PatientSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_patients(request):
    """
    Return recently viewed patients for the logged-in user.
    Uses AuditLog entries (resource_type='patient', action='view').
    Clinic-scoped for HIPAA multi-tenant safety.
    """
    logs = AuditLog.objects.filter(
        user=request.user,
        resource_type='patient',
        action='view'
    ).order_by('-timestamp')[:100]

    ids = []
    for log in logs:
        rid = str(log.resource_id or '').strip()
        if rid.isdigit():
            pid = int(rid)
            if pid not in ids:
                ids.append(pid)
        if len(ids) >= 10:
            break

    patients = Patient.objects.filter(
        clinic=request.user.clinic,
        is_active=True,
        id__in=ids
    )

    # Preserve original order from logs
    by_id = {p.id: p for p in patients}
    ordered = [by_id[i] for i in ids if i in by_id]

    return Response(PatientSerializer(ordered, many=True, context={'request': request}).data)
