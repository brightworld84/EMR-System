from datetime import datetime, time
from zoneinfo import ZoneInfo

from rest_framework import status
from django.db import IntegrityError

from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Appointment,
    PatientCheckIn,
    SurgeryCase,
    CheckInStatusEvent,
    OperatingRoomRecord,
    AnesthesiaRecord,
    PacuRecord,
    ImmediatePostOpProgressNote,
    ExparelBillingWorksheet,
    ImplantBillableInformation,
    PeripheralNerveBlockProcedureNote,
    AnesthesiaOrders,
    ConsentForAnesthesiaServices,
    HistoryAndPhysical,
    SafeSurgeryCommunicationChecklist,
    PreOpPhoneCall,
    MedicationReconciliation,
    FallRiskAssessmentPreOpTesting,
    PreoperativeNursesNotes,
    FallRiskAssessmentPreOp,
    PostOpPhoneCall,
    PatientEducationInfectionRisk,
    PatientEducationDVTPE,
    PatientInstructions,
)

from .serializers import (
    AppointmentSerializer,
    PatientCheckInSerializer,
    SurgeryCaseSerializer,
    OperatingRoomRecordSerializer,
    PacuRecordSerializer,
    ImmediatePostOpProgressNoteSerializer,
    ExparelBillingWorksheetSerializer,
    ImplantBillableInformationSerializer,
    AnesthesiaRecordSerializer,
    PeripheralNerveBlockProcedureNoteSerializer,
    AnesthesiaOrdersSerializer,
    ConsentForAnesthesiaServicesSerializer,
    HistoryAndPhysicalSerializer,
    SafeSurgeryCommunicationChecklistSerializer,
    PreOpPhoneCallSerializer,
    MedicationReconciliationSerializer,
    FallRiskAssessmentPreOpTestingSerializer,
    PreoperativeNursesNotesSerializer,
    FallRiskAssessmentPreOpSerializer,
    PostOpPhoneCallSerializer,
    PatientEducationInfectionRiskSerializer,
    PatientEducationDVTPESerializer,
    PatientInstructionsSerializer,
)

from core.models import AuditLog
from .metrics import build_dashboard_metrics

def _apply_checkin_status_transition(*, checkin, new_status, actor):
    """
    Apply a status transition consistently:
    - update status + status_changed_at
    - set per-stage timestamp fields
    - write immutable CheckInStatusEvent
    """
    now = timezone.now()

    checkin.status = new_status
    checkin.status_changed_at = now

    # Stage timestamps (only set once)
    if new_status == 'roomed' and checkin.roomed_at is None:
        checkin.roomed_at = now
    if new_status == 'ready' and checkin.ready_at is None:
        checkin.ready_at = now
    if new_status == 'in_progress' and checkin.in_progress_at is None:
        checkin.in_progress_at = now
    if new_status == 'completed' and checkin.completed_at is None:
        checkin.completed_at = now

    checkin.save()

    CheckInStatusEvent.objects.create(
        clinic=checkin.clinic,
        checkin=checkin,
        status=new_status,
        occurred_at=now,
        actor=actor
    )

def _apply_checkin_status_transition(*, checkin, new_status, actor):
    """
    Apply a status transition consistently:
    - update status + status_changed_at
    - set per-stage timestamp fields
    - write immutable CheckInStatusEvent
    """
    now = timezone.now()

    checkin.status = new_status
    checkin.status_changed_at = now

    # Stage timestamps (set once)
    if new_status == 'roomed' and checkin.roomed_at is None:
        checkin.roomed_at = now
    elif new_status == 'ready' and checkin.ready_at is None:
        checkin.ready_at = now
    elif new_status == 'in_progress' and checkin.in_progress_at is None:
        checkin.in_progress_at = now
    elif new_status == 'completed' and checkin.completed_at is None:
        checkin.completed_at = now

    checkin.save()

    CheckInStatusEvent.objects.create(
        clinic=checkin.clinic,
        checkin=checkin,
        status=new_status,
        occurred_at=now,
        actor=actor
    )

def apply_immediate_postop_defaults_to_pacu_record(note, pacu_record, request=None):
    """
    Copy key fields from Immediate Post-Op note → PACU Record,
    ONLY if PACU fields are currently blank.
    """
    updates = []

    # procedure name
    if hasattr(pacu_record, "procedure") and (not pacu_record.procedure) and note.procedure_name:
        pacu_record.procedure = note.procedure_name
        updates.append("procedure")

    # surgeon (if your PACU record uses surgeon string)
    # If you store surgeon somewhere else on the note later, wire it here.
    # For now surgeon_assist isn't surgeon; so we do NOT auto-fill surgeon from surgeon_assist.

    # notes → general_notes (append safely if blank)
    if hasattr(pacu_record, "general_notes") and (not pacu_record.general_notes) and note.notes:
        pacu_record.general_notes = note.notes
        updates.append("general_notes")

    if updates:
        pacu_record.save(update_fields=updates)

        AuditLog.log_action(
            user=getattr(request, "user", None),
            action="update",
            resource_type="pacu_record_autofill_from_immediate_postop",
            resource_id=str(pacu_record.id),
            changes={
                "immediate_postop_note_id": note.id,
                "fields_updated": updates,
                "source": "immediate_postop_note",
            },
            ip_address=(request.META.get("REMOTE_ADDR", "") if request else ""),
            user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
        )

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    filterset_fields = ['patient', 'status']
    ordering_fields = ['scheduled_start', 'status']

    def get_queryset(self):
        return Appointment.objects.filter(
            clinic=self.request.user.clinic
        ).order_by('scheduled_start')

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        clinic_tz = ZoneInfo(request.user.clinic.timezone)
        now_local = timezone.now().astimezone(clinic_tz)

        start_local = datetime.combine(now_local.date(), time.min).replace(tzinfo=clinic_tz)
        end_local = datetime.combine(now_local.date(), time.max).replace(tzinfo=clinic_tz)

        start_utc = start_local.astimezone(ZoneInfo("UTC"))
        end_utc = end_local.astimezone(ZoneInfo("UTC"))

        qs = self.get_queryset().filter(scheduled_start__range=(start_utc, end_utc))
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='range')
    def range(self, request):
        """
        Calendar range fetch (clinic-scoped).
        Query params: start, end (ISO datetime)
        """
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        if not start or not end:
            return Response({'detail': 'start and end are required'}, status=400)

        start_dt = parse_datetime(start)
        end_dt = parse_datetime(end)
        if not start_dt or not end_dt:
            return Response({'detail': 'Invalid datetime format'}, status=400)

        qs = self.get_queryset().filter(scheduled_start__gte=start_dt, scheduled_start__lte=end_dt)
        return Response(AppointmentSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='provider-availability')
    def provider_availability(self, request):
        """
        Soft availability check.
        Returns conflicts if provider already has an appointment
        at the requested time within the same clinic.
        """
        provider = request.query_params.get('provider')
        scheduled_start = request.query_params.get('scheduled_start')

        if not provider or not scheduled_start:
            return Response(
                {'detail': 'provider and scheduled_start are required'},
                status=400
            )

        start_dt = parse_datetime(scheduled_start)
        if not start_dt:
            return Response({'detail': 'Invalid datetime'}, status=400)

        clinic = request.user.clinic

        conflict = Appointment.objects.filter(
            clinic=clinic,
            provider_name=provider,
            scheduled_start=start_dt
        ).exists()

        return Response({
            'available': not conflict,
            'conflict': conflict
        })

    @action(detail=False, methods=['get'], url_path='validate')
    def validate(self, request):
        """
        Ops-only appointment validation (non-blocking):
        - duplicate check (same patient, same day)
        - provider availability check (FK-first, name fallback)

        Query params:
          patient (required)
          scheduled_start (required ISO)
          provider (optional provider_id)
          provider_name (optional fallback)
          duration_minutes (optional; default 30)
        """
        patient_id = request.query_params.get('patient')
        scheduled_start = request.query_params.get('scheduled_start')
        provider_id = request.query_params.get('provider')
        provider_name = (request.query_params.get('provider_name') or '').strip()
        duration_minutes = int(request.query_params.get('duration_minutes') or 30)

        if not patient_id or not scheduled_start:
            return Response({'detail': 'patient and scheduled_start are required'}, status=400)

        start_dt = parse_datetime(scheduled_start)
        if not start_dt:
            return Response({'detail': 'scheduled_start invalid'}, status=400)

        from datetime import timedelta
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        clinic = request.user.clinic
        active_statuses = ['scheduled', 'checked_in', 'roomed', 'ready', 'in_progress']

        # --- Duplicate check: same patient same day ---
        dup_qs = Appointment.objects.filter(
            clinic=clinic,
            patient_id=patient_id,
            status__in=active_statuses,
            scheduled_start__date=start_dt.date(),
        ).order_by('scheduled_start')

        has_duplicate = dup_qs.exists()

        # --- Provider conflict: overlap window ---
        has_provider_conflict = False
        provider_conflicts_qs = Appointment.objects.none()

        if provider_id:
            provider_conflicts_qs = Appointment.objects.filter(
                clinic=clinic,
                provider_id=provider_id,
                status__in=active_statuses,
                scheduled_start__lt=end_dt,
            ).filter(
                Q(scheduled_end__gt=start_dt) | Q(scheduled_end__isnull=True)
            ).order_by('scheduled_start')

            has_provider_conflict = provider_conflicts_qs.exists()

        elif provider_name:
            provider_conflicts_qs = Appointment.objects.filter(
                clinic=clinic,
                provider_name__iexact=provider_name,
                status__in=active_statuses,
                scheduled_start__lt=end_dt,
            ).filter(
                Q(scheduled_end__gt=start_dt) | Q(scheduled_end__isnull=True)
            ).order_by('scheduled_start')

            has_provider_conflict = provider_conflicts_qs.exists()

        # --- Log conflicts (analytics via AuditLog for now) ---
        if has_duplicate or has_provider_conflict:
            AuditLog.log_action(
                user=request.user,
                action='view',
                resource_type='appointment_conflict_check',
                resource_id=str(patient_id),
                changes={
                    'has_duplicate': has_duplicate,
                    'has_provider_conflict': has_provider_conflict,
                    'provider_id': provider_id,
                    'provider_name': provider_name,
                    'scheduled_start': scheduled_start,
                    'duration_minutes': duration_minutes,
                },
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

        return Response({
            'has_duplicate': has_duplicate,
            'has_provider_conflict': has_provider_conflict,
            'duplicate_matches': AppointmentSerializer(dup_qs[:10], many=True).data,
            'provider_conflicts': AppointmentSerializer(provider_conflicts_qs[:10], many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='checkin')
    def checkin(self, request, pk=None):
        appt = self.get_object()

        with transaction.atomic():
            existing = PatientCheckIn.objects.filter(
                clinic=request.user.clinic,
                patient=appt.patient,
                is_active=True
            ).first()

            if existing:
                if appt.status != 'checked_in':
                    appt.status = 'checked_in'
                    appt.save(update_fields=['status'])

                AuditLog.log_action(
                    user=request.user,
                    action='view',
                    resource_type='checkin',
                    resource_id=str(existing.id),
                    changes={'detail': 'checkin already exists'},
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )

                return Response({'detail': 'Already checked in', 'checkin_id': existing.id})

            checkin = PatientCheckIn.objects.create(
                clinic=request.user.clinic,
                patient=appt.patient,
                appointment=appt,
                checked_in_by=request.user,
                is_active=True
            )

            appt.status = 'checked_in'
            appt.save(update_fields=['status'])

            AuditLog.log_action(
                user=request.user,
                action='create',
                resource_type='checkin',
                resource_id=str(checkin.id),
                changes={
                    'appointment_id': appt.id,
                    'patient_id': appt.patient.id,
                    'appointment_status': 'checked_in'
                },
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

            # Optional: Auto-fill room/provider from SurgeryCase schedule (do not block check-in if it fails)
            try:
                case = SurgeryCase.objects.filter(
                    clinic=request.user.clinic,
                    patient=appt.patient,
                    scheduled_start__date=timezone.localdate(),
                ).order_by('scheduled_start').first()

                if case:
                    updates = []

                    if not checkin.room and case.room:
                        checkin.room = case.room
                        updates.append('room')

                    # Put surgeon into provider_name (Live Patients uses provider_name string)
                    if (not checkin.provider_name) and case.surgeon:
                        checkin.provider_name = case.surgeon
                        updates.append('provider_name')

                    if updates:
                        checkin.save(update_fields=updates)

                    # Optional: also fill appointment fields
                    appt_updates = []

                    if (not appt.provider_name) and case.surgeon:
                        appt.provider_name = case.surgeon
                        appt_updates.append('provider_name')

                    if (not appt.reason_for_visit) and case.procedure:
                        appt.reason_for_visit = case.procedure
                        appt_updates.append('reason_for_visit')

                    if appt_updates:
                        appt.save(update_fields=appt_updates)

            except Exception:
                pass

            return Response({'detail': 'Checked in', 'checkin_id': checkin.id})

class PatientCheckInViewSet(viewsets.ModelViewSet):
    serializer_class = PatientCheckInSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PatientCheckIn.objects.filter(
            clinic=self.request.user.clinic
        ).order_by('-check_in_time')

    def perform_create(self, serializer):
        serializer.save(
            clinic=self.request.user.clinic,
            checked_in_by=self.request.user
        )

    @action(detail=False, methods=['get'], url_path='metrics/dashboard')
    def metrics_dashboard(self, request):
        data = build_dashboard_metrics(request.user.clinic)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='live')
    def live(self, request):
        qs = self.get_queryset().filter(is_active=True)
        return Response(self.get_serializer(qs, many=True).data)
    
    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        obj = self.get_object()
        new_status = request.data.get('status')

        allowed = {c[0] for c in PatientCheckIn.STATUS_CHOICES}
        if new_status not in allowed:
            return Response({'detail': 'Invalid status'}, status=400)

        _apply_checkin_status_transition(
            checkin=obj,
            new_status=new_status,
            actor=request.user
        )

        # ✅ Sync appointment status if linked
        if obj.appointment_id:
            obj.appointment.status = new_status
            obj.appointment.save(update_fields=['status'])

        AuditLog.log_action(
            user=request.user,
            action='update',
            resource_type='checkin',
            resource_id=str(obj.id),
            changes={'status': new_status, 'appointment_synced': bool(obj.appointment_id)},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        obj = self.get_object()

        obj.status = 'completed'
        obj.status_changed_at = timezone.now()
        obj.is_active = False
        obj.check_out_time = timezone.now()
        obj.save(update_fields=['status', 'status_changed_at', 'is_active', 'check_out_time'])

        # ✅ Sync appointment status if linked
        if obj.appointment_id:
            obj.appointment.status = 'completed'
            obj.appointment.save(update_fields=['status'])

        AuditLog.log_action(
            user=request.user,
            action='update',
            resource_type='checkin',
            resource_id=str(obj.id),
            changes={'status': 'completed', 'is_active': False, 'appointment_synced': bool(obj.appointment_id)},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(self.get_serializer(obj).data)

def apply_surgerycase_defaults_to_pacu_record(record, clinic):
    """
    Auto-fill PACU Record header fields from SurgeryCase,
    but ONLY if PACU fields are blank.
    """
    # Best match: SurgeryCase is tied to the same checkin
    case = SurgeryCase.objects.filter(
        clinic=clinic,
        checkin=record.checkin
    ).first()

    if not case:
        return

    updates = []

    if hasattr(record, "surgeon") and (not record.surgeon) and case.surgeon:
        record.surgeon = case.surgeon
        updates.append("surgeon")

    if hasattr(record, "anesthesiologist") and (not record.anesthesiologist) and case.anesthesiologist:
        record.anesthesiologist = case.anesthesiologist
        updates.append("anesthesiologist")

    if hasattr(record, "procedure") and (not record.procedure) and case.procedure:
        record.procedure = case.procedure
        updates.append("procedure")

    # date/time (your SurgeryCase uses scheduled_date + scheduled_start_time)
    if hasattr(record, "date") and (not record.date) and case.scheduled_date:
        record.date = case.scheduled_date
        updates.append("date")

    if hasattr(record, "arrival_time") and (not record.arrival_time) and case.scheduled_start_time:
        record.arrival_time = case.scheduled_start_time
        updates.append("arrival_time")

    # Only if your PacuRecord model has room
    if hasattr(record, "room") and (not record.room) and case.room:
        record.room = case.room
        updates.append("room")

    if updates:
        record.save(update_fields=updates)

class SurgeryCaseViewSet(viewsets.ModelViewSet):
    serializer_class = SurgeryCaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['checkin', 'scheduled_date']
    ordering_fields = ['scheduled_date', 'scheduled_start_time']
    ordering = ['-scheduled_date', '-scheduled_start_time']

    def get_queryset(self):
        return SurgeryCase.objects.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)
        
def apply_surgerycase_defaults_to_pacu_record(record, clinic, request=None):
    """
    Auto-fill PACU Record header fields from SurgeryCase,
    but ONLY if PACU fields are blank.
    """
    try:
        # Best match: SurgeryCase is tied to the same checkin
        case = SurgeryCase.objects.filter(
            clinic=clinic,
            checkin=record.checkin
        ).first()

        if not case:
            return
         
        # Guard: never auto-fill twice
        if getattr(record, "pacu_autofill_locked", False):
            return        
        if getattr(record, "pacu_autofilled", False):
            return

        updates = []

        if hasattr(record, "surgeon") and (not record.surgeon) and case.surgeon:
            record.surgeon = case.surgeon
            updates.append("surgeon")

        if hasattr(record, "anesthesiologist") and (not record.anesthesiologist) and case.anesthesiologist:
            record.anesthesiologist = case.anesthesiologist
            updates.append("anesthesiologist")

        if hasattr(record, "procedure") and (not record.procedure) and case.procedure:
            record.procedure = case.procedure
            updates.append("procedure")

        # date/time
        if hasattr(record, "date") and (not record.date) and getattr(case, "scheduled_date", None):
            record.date = case.scheduled_date
            updates.append("date")

        if hasattr(record, "arrival_time") and (not record.arrival_time) and getattr(case, "scheduled_start_time", None):
            record.arrival_time = case.scheduled_start_time
            updates.append("arrival_time")

        # room (only if PacuRecord has it)
        if hasattr(record, "room") and (not getattr(record, "room", "")) and getattr(case, "room", ""):
            record.room = case.room
            updates.append("room")

        if updates:
            record.pacu_autofilled = True
            record.pacu_autofilled_at = timezone.now()
            updates += ["pacu_autofilled", "pacu_autofilled_at"]
            record.save(update_fields=updates)
            
            # COMPLIANCE: audit auto-population
            AuditLog.log_action(
                user=getattr(request, "user", None),
                action="update",
                resource_type="pacu_record_autofill",
                resource_id=str(record.id),
                changes={
                    "checkin_id": record.checkin_id,
                    "surgery_case_id": getattr(case, "id", None),
                    "fields_updated": updates,
                    "source": "surgery_schedule",
                },
                ip_address=(request.META.get("REMOTE_ADDR", "") if request else ""),
                user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
            )
    except Exception:
        # Never block PACU record if surgery schedule lookup fails
        return

class _BaseClinicCheckinUpsertSignedViewSet(viewsets.ModelViewSet):
    """
    Shared behavior:
    - clinic-scoped queryset
    - filterset_fields = ["checkin"]
    - POST behaves like upsert-by-checkin (returns existing instead of 500 on unique)
    - locked if is_signed
    - /{id}/sign/ endpoint
    """

    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        qs = self.queryset.filter(clinic=self.request.user.clinic)

        fields = {f.name for f in self.queryset.model._meta.get_fields()}
        if "updated_at" in fields:
            return qs.order_by("-updated_at")
        if "created_at" in fields:
            return qs.order_by("-created_at")
        return qs.order_by("-id")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def create(self, request, *args, **kwargs):
        checkin_id = request.data.get("checkin")
        if not checkin_id:
            return Response({"detail": "checkin is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except IntegrityError:
            # Return existing record for this clinic+checkin
            obj = self.queryset.get(clinic=request.user.clinic, checkin_id=checkin_id)
            return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()

        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PreOpPhoneCallViewSet(viewsets.ModelViewSet):
    serializer_class = PreOpPhoneCallSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PreOpPhoneCall.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class MedicationReconciliationViewSet(viewsets.ModelViewSet):
    serializer_class = MedicationReconciliationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return MedicationReconciliation.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class FallRiskAssessmentPreOpTestingViewSet(viewsets.ModelViewSet):
    serializer_class = FallRiskAssessmentPreOpTestingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return FallRiskAssessmentPreOpTesting.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PreoperativeNursesNotesViewSet(viewsets.ModelViewSet):
    serializer_class = PreoperativeNursesNotesSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PreoperativeNursesNotes.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    # ✅ This is the missing piece that caused clinic_id NULL
    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class FallRiskAssessmentPreOpViewSet(viewsets.ModelViewSet):
    serializer_class = FallRiskAssessmentPreOpSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return FallRiskAssessmentPreOp.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PostOpPhoneCallViewSet(viewsets.ModelViewSet):
    serializer_class = PostOpPhoneCallSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PostOpPhoneCall.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PatientEducationInfectionRiskViewSet(viewsets.ModelViewSet):
    serializer_class = PatientEducationInfectionRiskSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PatientEducationInfectionRisk.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PatientEducationDVTPEViewSet(viewsets.ModelViewSet):
    serializer_class = PatientEducationDVTPESerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PatientEducationDVTPE.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class PatientInstructionsViewSet(viewsets.ModelViewSet):
    serializer_class = PatientInstructionsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PatientInstructions.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)


class SafeSurgeryCommunicationChecklistViewSet(viewsets.ModelViewSet):
    serializer_class = SafeSurgeryCommunicationChecklistSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return SafeSurgeryCommunicationChecklist.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if getattr(obj, "is_signed", False):
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()

        update_fields = ["signature_data_url", "is_signed", "signed_by", "signed_at"]
        if hasattr(obj, "updated_at"):
            update_fields.append("updated_at")

        obj.save(update_fields=update_fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)
    
    # Optional: filter by checkin
    def get_queryset(self):
        qs = super().get_queryset()
        checkin_id = self.request.query_params.get("checkin")
        if checkin_id:
            qs = qs.filter(checkin_id=checkin_id)
        return qs

class HistoryAndPhysicalViewSet(viewsets.ModelViewSet):
    serializer_class = HistoryAndPhysicalSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return HistoryAndPhysical.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class ConsentForAnesthesiaServicesViewSet(viewsets.ModelViewSet):
    serializer_class = ConsentForAnesthesiaServicesSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return ConsentForAnesthesiaServices.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    # ✅ prevents 500 if checkin is OneToOne/unique and already exists
    def create(self, request, *args, **kwargs):
        checkin_id = request.data.get("checkin")
        if not checkin_id:
            return Response({"detail": "checkin is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except IntegrityError:
            obj = ConsentForAnesthesiaServices.objects.get(
                clinic=request.user.clinic,
                checkin_id=checkin_id,
            )
            return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class AnesthesiaOrdersViewSet(viewsets.ModelViewSet):
    serializer_class = AnesthesiaOrdersSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return AnesthesiaOrders.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class PeripheralNerveBlockProcedureNoteViewSet(viewsets.ModelViewSet):
    serializer_class = PeripheralNerveBlockProcedureNoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PeripheralNerveBlockProcedureNote.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    # ✅ KEY FIX: override create so POST is idempotent (no 500 on duplicates)
    def create(self, request, *args, **kwargs):
        checkin_id = request.data.get("checkin")
        if not checkin_id:
            return Response({"detail": "checkin is required."}, status=status.HTTP_400_BAD_REQUEST)

        clinic = request.user.clinic

        # If exists already, return it (prevents UniqueViolation)
        existing = PeripheralNerveBlockProcedureNote.objects.filter(
            clinic=clinic,
            checkin_id=checkin_id,
        ).first()
        if existing:
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        # Otherwise create safely
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except IntegrityError:
            # In case two requests race, fetch the one that won
            obj = PeripheralNerveBlockProcedureNote.objects.get(
                clinic=clinic,
                checkin_id=checkin_id,
            )
            return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class OperatingRoomRecordViewSet(viewsets.ModelViewSet):
    serializer_class = OperatingRoomRecordSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return OperatingRoomRecord.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class AnesthesiaRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AnesthesiaRecordSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return AnesthesiaRecord.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class ExparelBillingWorksheetViewSet(viewsets.ModelViewSet):
    serializer_class = ExparelBillingWorksheetSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return ExparelBillingWorksheet.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])
    
        AuditLog.log_action(
           user=request.user,
           action="update",
           resource_type="exparel_billing_worksheet",
           resource_id=str(obj.id),
           changes={"detail": "signed", "checkin_id": obj.checkin_id},
           ip_address=request.META.get("REMOTE_ADDR", ""),
           user_agent=request.META.get("HTTP_USER_AGENT", ""),
        ) 
     
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class ImplantBillableInformationViewSet(viewsets.ModelViewSet):
    serializer_class = ImplantBillableInformationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["checkin"]
    ordering_fields = ["updated_at", "created_at"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return ImplantBillableInformation.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "This form is signed and locked."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        obj = self.get_object()
        if obj.is_signed:
            return Response({"detail": "Already signed."}, status=status.HTTP_400_BAD_REQUEST)

        sig = request.data.get("signature_data_url", "")
        if not sig:
            return Response({"detail": "signature_data_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        obj.signature_data_url = sig
        obj.is_signed = True
        obj.signed_by = request.user
        obj.signed_at = timezone.now()
        obj.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

class ImmediatePostOpProgressNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ImmediatePostOpProgressNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ImmediatePostOpProgressNote.objects.filter(clinic=self.request.user.clinic).order_by("-updated_at")

    def perform_create(self, serializer):
        note = serializer.save(clinic=self.request.user.clinic)
        # Auto-link to PACU Record if it exists for this check-in
        try:
            pacu = PacuRecord.objects.filter(
                clinic=self.request.user.clinic,
                checkin=note.checkin
            ).first()

            if not pacu:
                pacu = PacuRecord.objects.create(
                    clinic=self.request.user.clinic,
                    checkin=note.checkin
                )

            if not note.pacu_record:
                note.pacu_record = pacu
                note.save(update_fields=["pacu_record"])

            AuditLog.log_action(
                user=self.request.user,
                action="update",
                resource_type="immediate_postop_autolink_pacu_record",
                resource_id=str(note.id),
                changes={
                    "checkin_id": note.checkin_id,
                    "pacu_record_id": pacu.id,
                },
                ip_address=self.request.META.get("REMOTE_ADDR", ""),
                user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
            )
        except Exception:
            # never block clinical workflow
            pass
            # Auto-fill PACU from Immediate Post-Op (only blanks)
            apply_immediate_postop_defaults_to_pacu_record(note, pacu, request=self.request)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        note = self.get_object()
        if note.is_signed:
            return Response({"detail": "Already signed."}, status=400)

        sig = (request.data.get("signature_data_url") or "").strip()
        if not sig.startswith("data:image"):
            return Response({"detail": "signature_data_url is required."}, status=400)

        note.signature_data_url = sig
        note.is_signed = True
        note.signed_by = request.user
        note.signed_at = timezone.now()
        note.save(update_fields=["signature_data_url", "is_signed", "signed_by", "signed_at", "updated_at"])

        AuditLog.log_action(
            user=request.user,
            action="update",
            resource_type="immediate_postop_progress_note_signed",
            resource_id=str(note.id),
            changes={"checkin_id": note.checkin_id},
            ip_address=request.META.get("REMOTE_ADDR", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(self.get_serializer(note).data)

class PacuRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PacuRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PacuRecord.objects.filter(
            clinic=self.request.user.clinic
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        #️⃣ Save PACU record first
        record = serializer.save(clinic=self.request.user.clinic)

        #️⃣ Auto-fill from SurgeryCase (SAFE, non-destructive)
        apply_surgerycase_defaults_to_pacu_record(record, self.request.user.clinic, request=self.request)
      
        # ✅ Auto-link to Immediate Post-Op note if it already exists for this checkin
        try:
            note = ImmediatePostOpProgressNote.objects.filter(clinic=record.clinic, checkin=record.checkin).first()
            if note and not note.pacu_record_id:
                note.pacu_record = record
                note.save(update_fields=['pacu_record'])
        except Exception:
            pass
