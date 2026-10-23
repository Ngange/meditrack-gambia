import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AllergiesPage } from '../features/allergies/AllergiesPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ConditionsPage } from '../features/conditions/ConditionsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MedicationsPage } from '../features/medications/MedicationsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { VisitsPage } from '../features/visits/VisitsPage';
import { useAuth } from '../hooks/useAuth';

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Every signed-in page lives inside the shell (sidebar + header). */}
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/allergies" element={<AllergiesPage />} />
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
