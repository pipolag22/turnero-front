import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";           
import { useAuth } from "./AuthContext";

type Role = "ADMIN" | "PUESTO" | "TV";

type Props = {
  allow: Role[];             
  children: ReactNode;
};

export default function ProtectedRoute({ allow, children }: Props) {
  const { me, token } = useAuth();
  const location = useLocation();

 
  if (!token || !me) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

 
  const role = (me as any).role as Role | undefined;
  if (!role || !allow.includes(role)) {
    
    return <Navigate to="/puesto" replace />;
  }

  return <>{children}</>;
}
