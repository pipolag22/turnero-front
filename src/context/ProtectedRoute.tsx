import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Props = {
  allow: string[];        // p.ej. ["ADMIN"] o []
  children: React.ReactNode;
};

export default function ProtectedRoute({ allow, children }: Props) {
  const { token, me } = useAuth();

  if (!token || !me) return <Navigate to="/login" replace />;
  if (allow.length && !allow.includes(me.role)) return <Navigate to="/puesto" replace />;

  return <>{children}</>;
}
