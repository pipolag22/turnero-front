// front/src/context/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "@/types";

type Props = {
  allow?: Role[];                 
  children: React.ReactNode;
};


function homeForRole(role?: Role) {
  if (role === "ADMIN") return "/admin";
  return "/puesto";
}

export default function ProtectedRoute({ allow = [], children }: Props) {
  const { token, me } = useAuth() as any;

  
  const role = me?.role as Role | undefined;
  if (!token || !role) return <Navigate to="/login" replace />;

  
  if (allow.length > 0 && !allow.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <>{children}</>;
}
