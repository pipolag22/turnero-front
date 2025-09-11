// src/App.tsx
import { Link, Route, Routes } from "react-router-dom";
import TVBoard from "@/pages/TVBoard";
import PuestoPage from "@/pages/PuestoPage";
import Login from "@/pages/Login";
import ProtectedRoute from "./context/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

function NavBar() {
  const { me, logout } = useAuth();
  return (
    <div style={{ padding: 8, borderBottom: "1px solid #eee" }}>
      <Link to="/tv" style={{ marginRight: 8 }}>TV</Link>
      <Link to="/puesto" style={{ marginRight: 8 }}>Puesto</Link>
      {me ? (
        <>
          <span style={{ marginRight: 8, opacity: 0.7 }}>
            {me.name ?? me.email} ({me.role})
          </span>
          <button onClick={logout}>Salir</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* acceso abierto a la TV */}
        <Route path="/tv" element={<TVBoard />} />

        {/* ejemplo protegido (puede ser ["ADMIN","BOX_AGENT"] según tu JWT) */}
        <Route
          path="/puesto"
          element={
            <ProtectedRoute allow={[]}>
              <PuestoPage />
            </ProtectedRoute>
          }
        />

        {/* default */}
        <Route path="*" element={<TVBoard />} />
      </Routes>
    </>
  );
}
