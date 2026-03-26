import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../contexts/AuthContext";

export default function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { token, user } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

