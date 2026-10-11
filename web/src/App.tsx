import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuth } from './lib/auth-context';
import { AllergiesPage } from './pages/Allergies';
import { ConditionsPage } from './pages/Conditions';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { ProfilePage } from './pages/Profile';
import { RegisterPage } from './pages/Register';
import { VisitsPage } from './pages/Visits';

function AppRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Every signed-in page lives inside the shell (top navigation). */}
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/allergies" element={<AllergiesPage />} />
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}