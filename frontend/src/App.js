import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import AddPatient from './pages/AddPatient';
import PatientDetail from './pages/PatientDetail';
import RecentPatients from './pages/RecentPatients';
import MetricsDashboard from './pages/MetricsDashboard';
import ScheduleCalendarFC from './pages/ScheduleCalendarFC';
import TodaysSchedule from './pages/TodaysSchedule';
import LivePatients from './pages/LivePatients';
import AddAppointment from './pages/AddAppointment';
import Providers from './pages/Providers';
import ExparelBillingWorksheet from './pages/ExparelBillingWorksheet';
import ImplantBillableInformation from './pages/ImplantBillableInformation';

import AnesthesiaOrders from './pages/AnesthesiaOrders';
import AnesthesiaRecord from './pages/AnesthesiaRecord';
import PeripheralNerveBlockProcedureNote from './pages/PeripheralNerveBlockProcedureNote';
import ImmediatePostOpProgressNote from './pages/ImmediatePostOpProgressNote';
import OperatingRoomRecord from './pages/OperatingRoomRecord';
import PacuMobilityAssessment from './pages/PacuMobilityAssessment';
import PacuProgressNotes from './pages/PacuProgressNotes';
import PacuAdditionalNursingNotes from './pages/PacuAdditionalNursingNotes';
import PacuRecord from './pages/PacuRecord';
import ConsentForAnesthesiaServices from './pages/ConsentForAnesthesiaServices';
import HistoryAndPhysical from './pages/HistoryAndPhysical';
import FallRiskAssessmentPreOpTesting from './pages/FallRiskAssessmentPreOpTesting';
import FallRiskAssessmentPreOp from "./pages/FallRiskAssessmentPreOp";
import PreOpNurseNotesPage1 from "./pages/PreOpNurseNotesPage1";
import PostOpPhoneCall from './pages/PostOpPhoneCall';
import PostOpInfectionEducation from './pages/PostOpInfectionEducation';
import DVTPeEducation from './pages/DVT_PE_Education';
import PatientInstructions from './pages/PatientInstructions';
import PreOpPhoneCall from "./pages/PreOpPhoneCall";

import ProtectedRoute from './components/ProtectedRoute';
import PrintSchedule from './pages/PrintSchedule';
import PrintMetrics from './pages/PrintMetrics';
import PrintPatientChart from './pages/PrintPatientChart';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <PatientList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients/new"
          element={
            <ProtectedRoute>
              <AddPatient />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients/recent"
          element={
            <ProtectedRoute>
              <RecentPatients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientDetail />
            </ProtectedRoute>
          }
        />

        <Route
           path="/providers"
           element={
             <ProtectedRoute>
               <Providers />
             </ProtectedRoute>
           }
         />

        <Route
          path="/schedule/today"
          element={
            <ProtectedRoute>
              <TodaysSchedule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedule/new"
          element={
            <ProtectedRoute>
              <AddAppointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule/calendar"
          element={
            <ProtectedRoute>
              <ScheduleCalendarFC />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live"
          element={
            <ProtectedRoute>
              <LivePatients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/metrics"
          element={
            <ProtectedRoute>
              <MetricsDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/print/schedule"
          element={
            <ProtectedRoute>
              <PrintSchedule />
            </ProtectedRoute>
          }
        /> 
        
        <Route
          path="/print/metrics"
          element={
            <ProtectedRoute>
              <PrintMetrics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/print/patient/:id"
          element={
            <ProtectedRoute>
              <PrintPatientChart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/pre-op-phone-call"
          element={
            <ProtectedRoute>
              <PreOpPhoneCall />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/fall-risk-assessment-preop-testing"
          element={
            <ProtectedRoute>
              <FallRiskAssessmentPreOpTesting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/fall-risk-assessment-preop"
          element={
            <ProtectedRoute>
              <FallRiskAssessmentPreOp />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/preoperative-nurses-notes"
          element={
            <ProtectedRoute>
              <PreOpNurseNotesPage1 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/post-operative-phone-call"
          element={
            <ProtectedRoute>
              <PostOpPhoneCall />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/checkins/:checkinId/post-op-infection-education"
          element={
            <ProtectedRoute>
              <PostOpInfectionEducation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/dvt-pe-education"
          element={
            <ProtectedRoute>
              <DVTPeEducation /> 
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/patient-instructions"
          element={
            <ProtectedRoute>
              <PatientInstructions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/history-and-physical"
          element={
            <ProtectedRoute>
              <HistoryAndPhysical />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/consent-for-anesthesia-services"
          element={
            <ProtectedRoute>
              <ConsentForAnesthesiaServices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/anesthesia-orders"
          element={
            <ProtectedRoute>
              <AnesthesiaOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/peripheral-nerve-block-procedure-note"
          element={
            <ProtectedRoute>
              <PeripheralNerveBlockProcedureNote />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/immediate-postop-progress-note"
          element={
            <ProtectedRoute>
              <ImmediatePostOpProgressNote />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/operating-room-record"
          element={
            <ProtectedRoute>
              <OperatingRoomRecord />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/anesthesia-record"
          element={
            <ProtectedRoute>
              <AnesthesiaRecord />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/checkins/:checkinId/pacu-mobility"
          element={
            <ProtectedRoute>
              <PacuMobilityAssessment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/pacu-progress-notes"
          element={
            <ProtectedRoute>
              <PacuProgressNotes />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/checkins/:checkinId/pacu-additional-nursing-notes"
          element={
            <ProtectedRoute>
              <PacuAdditionalNursingNotes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/pacu-record"
          element={
            <ProtectedRoute>
              <PacuRecord />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/exparel-billing-worksheet"
          element={
            <ProtectedRoute>
              <ExparelBillingWorksheet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkins/:checkinId/implant-billable-information"
          element={
            <ProtectedRoute>
              <ImplantBillableInformation />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
