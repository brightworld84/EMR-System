from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from scheduling.metrics import build_dashboard_metrics


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_metrics(request):
    date_str = request.query_params.get('date')  # optional: YYYY-MM-DD
    data = build_dashboard_metrics(request.user.clinic, date_str=date_str)
    return Response(data)
