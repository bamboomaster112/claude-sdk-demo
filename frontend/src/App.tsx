import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const { user, token, loading, login, signup, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={login} onSignup={signup} />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Layout user={user!} onLogout={logout} />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage token={token!} />} />
          <Route path="/chat" element={<ChatPage token={token!} />} />
          <Route path="/chat/:sessionId" element={<ChatPage token={token!} />} />
          <Route path="/history" element={<HistoryPage token={token!} />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} loading={loading} requireAdmin>
                <AdminPage token={token!} userId={user?.id || ''} />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
