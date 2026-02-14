from datetime import timedelta
from django.utils import timezone
from django.db.models import Count
from .models import PatientCheckIn
from django.db.models import Count
from datetime import datetime, time
from zoneinfo import ZoneInfo
from django.db.models import Count
from scheduling.models import Appointment, PatientCheckIn

ALERT_THRESHOLDS_MINUTES = {
    'checked_in': 15,
    'roomed': 20,
    'ready': 20,
    'in_progress': 60,
}

def minutes_between(a, b):
    if not a or not b:
        return None
    delta = b - a
    return int(delta.total_seconds() // 60)

def build_dashboard_metrics(clinic, date_str=None):
    now = timezone.now()

    live_qs = PatientCheckIn.objects.filter(
        clinic=clinic,
        is_active=True,
        check_out_time__isnull=True
    )

    # counts by provider (ASC-optimized)
    by_provider = list(
        live_qs.values('provider_name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # counts by status
    by_status = list(
        live_qs.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    # --- Today appointment outcomes (clinic-local day) ---
    clinic_tz = ZoneInfo(getattr(clinic, 'timezone', None) or 'America/Chicago')
    now_local = timezone.now().astimezone(clinic_tz)

    target_date = now_local.date()
    if date_str:
        try:
            from datetime import date
            target_date = date.fromisoformat(date_str)
        except Exception:
            pass

    start_local = datetime.combine(target_date, time.min).replace(tzinfo=clinic_tz)
    end_local = datetime.combine(target_date, time.max).replace(tzinfo=clinic_tz)

    start_utc = start_local.astimezone(ZoneInfo("UTC"))
    end_utc = end_local.astimezone(ZoneInfo("UTC"))

    today_appts_qs = Appointment.objects.filter(
        clinic=clinic,
        scheduled_start__range=(start_utc, end_utc),
    )

    # Today's outcomes by provider (ASC productivity)
    today_by_provider = list(
        today_appts_qs.values('provider_name', 'status')
        .annotate(count=Count('id'))
        .order_by('provider_name', 'status')
    )

    today_outcomes = list(
        today_appts_qs.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    # counts by provider (live only)
    by_provider = list(
        live_qs.values('provider_name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # longest waiters (based on status_changed_at)
    waiters = []
    for c in live_qs.select_related('patient').order_by('status_changed_at')[:50]:
        mins = minutes_between(c.status_changed_at or c.check_in_time, now) or 0
        threshold = ALERT_THRESHOLDS_MINUTES.get(c.status)
        is_alert = threshold is not None and mins >= threshold

        waiters.append({
            'checkin_id': c.id,
            'patient_id': c.patient_id,
            'patient_name': c.patient.full_name,
            'mrn': c.patient.medical_record_number,
            'status': c.status,
            'minutes_in_status': mins,
            'alert': bool(is_alert),
            'threshold_minutes': threshold,
        })

    # averages from completed checkins today 
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = PatientCheckIn.objects.filter(
        clinic=clinic,
        completed_at__isnull=False,
        check_in_time__gte=start_of_day
    )

    durations = []
    for c in completed_today:
        total = minutes_between(c.check_in_time, c.completed_at)
        if total is not None:
            durations.append(total)

    avg_total = int(sum(durations) / len(durations)) if durations else None

    return {
        'generated_at': now.isoformat(),
        'live_counts_by_status': by_status,
        'avg_total_visit_minutes_today': avg_total,
        'wait_time_alert_thresholds_minutes': ALERT_THRESHOLDS_MINUTES,
        'longest_waiters': waiters[:10],
        'live_counts_by_provider_name': by_provider,
        'today_total_appointments': today_appts_qs.count(),
        'today_outcomes_by_status': today_outcomes,}
