from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AppointmentViewSet,
    PatientCheckInViewSet,
    SurgeryCaseViewSet,
    OperatingRoomRecordViewSet,
    PacuRecordViewSet,
    ImmediatePostOpProgressNoteViewSet,
    ExparelBillingWorksheetViewSet,
    ImplantBillableInformationViewSet,
    AnesthesiaRecordViewSet,
    PeripheralNerveBlockProcedureNoteViewSet,
    AnesthesiaOrdersViewSet,
    ConsentForAnesthesiaServicesViewSet,
    HistoryAndPhysicalViewSet,
    SafeSurgeryCommunicationChecklistViewSet,
    PreOpPhoneCallViewSet,
    MedicationReconciliationViewSet,
    FallRiskAssessmentPreOpTestingViewSet,
    PreoperativeNursesNotesViewSet,
    FallRiskAssessmentPreOpViewSet,
    PostOpPhoneCallViewSet,
    PatientEducationInfectionRiskViewSet,
    PatientEducationDVTPEViewSet,
    PatientInstructionsViewSet,
)

from scheduling.mobility_views import PacuMobilityAssessmentViewSet
from scheduling.pacu_additional_views import PacuAdditionalNursingNotesViewSet
from scheduling.pacu_progress_views import PacuProgressNotesViewSet


router = DefaultRouter()
router.register(r"appointments", AppointmentViewSet, basename="appointments")
router.register(r"checkins", PatientCheckInViewSet, basename="checkins")

router.register(r"pre-op-phone-call", PreOpPhoneCallViewSet, basename="pre-op-phone-call")
router.register(r"medication-reconciliation", MedicationReconciliationViewSet, basename="medication-reconciliation")
router.register(r"fall-risk-assessment-preop-testing", FallRiskAssessmentPreOpTestingViewSet, basename="fall-risk-assessment-preop-testing")
router.register(r"preoperative-nurses-notes", PreoperativeNursesNotesViewSet, basename="preoperative-nurses-notes")
router.register(r"fall-risk-assessment-preop", FallRiskAssessmentPreOpViewSet, basename="fall-risk-assessment-preop")
router.register(r"post-op-phone-call", PostOpPhoneCallViewSet, basename="post-op-phone-call")
router.register(r"patient-education-infection-risk", PatientEducationInfectionRiskViewSet, basename="patient-education-infection-risk")
router.register(r"patient-education-dvt-pe", PatientEducationDVTPEViewSet, basename="patient-education-dvt-pe")
router.register(r"patient-instructions", PatientInstructionsViewSet, basename="patient-instructions")
router.register(r"safe-surgery-communication-checklist", SafeSurgeryCommunicationChecklistViewSet, basename="safe-surgery-communication-checklist")

router.register(r"pacu-mobility", PacuMobilityAssessmentViewSet, basename="pacu-mobility")
router.register(r"pacu-progress-notes", PacuProgressNotesViewSet, basename="pacu-progress-notes")
router.register(
    r"pacu-additional-nursing-notes",
    PacuAdditionalNursingNotesViewSet,
    basename="pacu-additional-nursing-notes",
)
router.register(r"pacu-records", PacuRecordViewSet, basename="pacu-records")

router.register(r"surgery-cases", SurgeryCaseViewSet, basename="surgery-cases")
router.register(
    r"immediate-postop-progress-note",
    ImmediatePostOpProgressNoteViewSet,
    basename="immediate-postop-progress-note",
)
router.register(
    r"exparel-billing-worksheet",
    ExparelBillingWorksheetViewSet,
    basename="exparel-billing-worksheet",
)
router.register(
    r"implant-billable-information",
    ImplantBillableInformationViewSet,
    basename="implant-billable-information",
)
router.register(
    r"operating-room-record",
    OperatingRoomRecordViewSet,
    basename="operating-room-record",
)
router.register(r"anesthesia-record", AnesthesiaRecordViewSet, basename="anesthesia-record")
router.register(
    r"peripheral-nerve-block-procedure-note",
    PeripheralNerveBlockProcedureNoteViewSet,
    basename="peripheral-nerve-block-procedure-note",
)
router.register(r"anesthesia-orders", AnesthesiaOrdersViewSet, basename="anesthesia-orders")
router.register(
    r"consent-for-anesthesia-services",
    ConsentForAnesthesiaServicesViewSet,
    basename="consent-for-anesthesia-services",
)

router.register(r"history-and-physical", HistoryAndPhysicalViewSet, basename="history-and-physical")
router.register(
    r"safe-surgery-communication-checklist",
    SafeSurgeryCommunicationChecklistViewSet,
    basename="safe-surgery-communication-checklist",
)

urlpatterns = [
    path("", include(router.urls)),
]
