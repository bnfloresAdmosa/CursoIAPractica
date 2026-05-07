import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

type RequireAuthProps = {
  children: ReactNode;
};

/**
 * Protege rutas: si no hay sesión activa, redirige a /login y guarda
 * la URL de origen en location.state.from para volver tras el login.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
