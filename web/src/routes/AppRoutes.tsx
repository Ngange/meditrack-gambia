import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AllergiesPage } from '../features/allergies/AllergiesPage';
import { AdminNoticePage } from '../features/auth/AdminNoticePage';
import { RegisterProviderPage } from '../features/auth/RegisterProviderPage';
import { DoctorHomePage } from '../features/provider/DoctorHomePage';
import { DoctorPatientPage } from '../features/provider/DoctorPatientPage';
import { DoctorShell } from '../features/provider/DoctorShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ConditionsPage } from '../features/conditions/ConditionsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LabResultsPage } from '../features/labs/LabResultsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { MedicationsPage } from '../features/medications/MedicationsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { TimelinePage } from '../features/timeline/TimelinePage';
import { SharePage } from '../features/share/SharePage';
import { SharedViewPage } from '../features/shared-view/SharedViewPage';
import { VisitsPage } from '../features/visits/VisitsPage';
import { DoctorPrintPage, PatientPrintPage } from '../features/print/PrintPages';
import { useAuth } from '../hooks/useAuth';

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/register/doctor" element={user ? <Navigate to="/" replace /> : <RegisterProviderPage />} />

      {/* What a doctor sees from a link: public, no login, outside the shell. */}
      <Route path="/s/:token" element={<SharedViewPage />} />

      {/* Each role gets its own set of pages. Anyone not signed in falls through to the login page. */}
      {user?.role === 'provider' && (
        <Route element={<DoctorShell />}>
          <Route path="/" element={<DoctorHomePage />} />
          <Route path="/patient/:sessionId" element={<DoctorPatientPage />} />
          <Route path="/patient/:sessionId/print" element={<DoctorPrintPage />} />
        </Route>
      )}
      {user?.role === 'admin' && <Route path="/" element={<AdminNoticePage />} />}
      {user?.role === 'patient' && <Route path="/print" element={<PatientPrintPage />} />}
      {user?.role === 'patient' && (
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/allergies" element={<AllergiesPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/lab-results" element={<LabResultsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}
