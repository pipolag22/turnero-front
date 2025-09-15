import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Props = {
  allow: string[];        // p.ej. ["ADMIN"] o []
  children: React.ReactNode;
};

function homeForRole(role?: string) {
  if (role === "ADMIN") return "/admin";
  return "/puesto";
}

export default function ProtectedRoute({ allow, children }: Props) {
  const { token, me } = useAuth();

  if (!token || !me) return <Navigate to="/login" replace />;

 
  if (allow.length && !allow.includes(me.role)) {
    return <Navigate to={homeForRole(me.role)} replace />;
  }

  return <>{children}</>;
}
