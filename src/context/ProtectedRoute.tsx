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
  const { token, me, isLoading } = useAuth(); 

  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Cargando...
      </div>
    );
  }

  
  const role = me?.role as Role | undefined;
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  
  if (allow.length > 0 && !allow.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <>{children}</>;
}