import { Navigate } from 'react-router-dom';
import { User } from '../../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  user: User | null;
  loading: boolean;
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  user,
  loading,
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
