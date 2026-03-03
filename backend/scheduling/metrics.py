from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.utils import timezone
from django.db.models import Count
from scheduling.models import Appointment, PatientCheckIn

ALERT_THRESHOLDS_MINUTES = {
    'checked_in':     15,
    'pre_op':         30,
    'operating_room': 90,
    'pacu':           45,
}

def minutes_between(a, b):
    if not a or not b:
        return None
    return int((b - a).total_seconds() // 60)

def build_dashboard_metrics(clinic, date_str=None):
    now = timezone.now()

    live_qs = PatientCheckIn.objects.filter(
        clinic=clinic,
        is_active=True,
        check_out_time__isnull=True,
    )

    by_status = list(
        live_qs.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    by_provider = list(
        live_qs.values('provider_name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Today's appointments (clinic-local timezone)
    clinic_tz = ZoneInfo(getattr(clinic, 'timezone', None) or 'America/Chicago')
    now_local = now.astimezone(clinic_tz)

    target_date = now_local.date()
    if date_str:
        try:
            from datetime import date
            target_date = date.fromisoformat(date_str)
        except Exception:
            pass

    start_utc = datetime.combine(target_date, time.min).replace(tzinfo=clinic_tz).astimezone(ZoneInfo("UTC"))
    end_utc   = datetime.combine(target_date, time.max).replace(tzinfo=clinic_tz).astimezone(ZoneInfo("UTC"))

    today_appts_qs = Appointment.objects.filter(
        clinic=clinic,
        scheduled_start__range=(start_utc, end_utc),
    )

    today_outcomes = list(
        today_appts_qs.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    today_by_provider = list(
        today_appts_qs.values('provider_name', 'status')
        .annotate(count=Count('id'))
        .order_by('provider_name', 'status')
    )

    # Longest waiters
    waiters = []
    for c in live_qs.select_related('patient').order_by('status_changed_at')[:50]:
        mins = minutes_between(c.status_changed_at or c.check_in_time, now) or 0
        threshold = ALERT_THRESHOLDS_MINUTES.get(c.status)
        waiters.append({
            'checkin_id':        c.id,
            'patient_id':        c.patient_id,
            'patient_name':      c.patient.full_name,
            'mrn':               c.patient.medical_record_number,
            'status':            c.status,
            'minutes_in_status': mins,
            'alert':             threshold is not None and mins >= threshold,
            'threshold_minutes': threshold,
        })

    # Average total visit duration for discharged patients today
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    discharged_today = PatientCheckIn.objects.filter(
        clinic=clinic,
        discharged_at__isnull=False,
        check_in_time__gte=start_of_day,
    )

    durations = [
        d for d in (
            minutes_between(c.check_in_time, c.discharged_at)
            for c in discharged_today
        ) if d is not None
    ]
    avg_total = int(sum(durations) / len(durations)) if durations else None

    return {
        'generated_at':                      now.isoformat(),
        'live_counts_by_status':             by_status,
        'live_counts_by_provider_name':      by_provider,
        'avg_total_visit_minutes_today':     avg_total,
        'wait_time_alert_thresholds_minutes': ALERT_THRESHOLDS_MINUTES,
        'longest_waiters':                   waiters[:10],
        'today_total_appointments':          today_appts_qs.count(),
        'today_outcomes_by_status':          today_outcomes,
        'today_outcomes_by_provider':        today_by_provider,
    }
