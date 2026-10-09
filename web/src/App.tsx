import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { AllergiesPage } from './pages/Allergies';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ConditionsPage } from './pages/Conditions';

function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <p>Logged in as {user?.userId} ({user?.role})</p>
      <p><Link to="/allergies">My allergies</Link></p>
      <p><Link to="/allergies">Allergies</Link></p>
      <p><Link to="/conditions">Conditions</Link></p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/allergies" element={user ? <AllergiesPage /> : <Navigate to="/login" replace />} />
      <Route path="/conditions" element={user ? <ConditionsPage /> : <Navigate to="/login" replace />} />
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
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