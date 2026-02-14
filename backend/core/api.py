from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinic_config(request):
    clinic = request.user.clinic

    defaults = {
        "checked_in": "Checked In",
        "roomed": "Roomed",
        "ready": "Ready",
        "in_progress": "In Progress",
        "completed": "Complete",
    }

    labels = defaults.copy()
    if isinstance(clinic.workflow_labels, dict):
        labels.update(clinic.workflow_labels)

    return Response({
        "clinic_id": clinic.id,
        "clinic_name": clinic.name,
        "timezone": clinic.timezone,
        "workflow_labels": labels,
    })
