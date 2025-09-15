import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      // Redirección por rol
      if (user.role === "ADMIN") {
        nav("/admin", { replace: true });
      } else {
        nav("/puesto", { replace: true });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Iniciar sesión</h1>
      {err && <div style={{ color: "crimson" }}>{err}</div>}
      <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <label>
          Email&nbsp;
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginRight: 8 }}
          />
        </label>
        <label>
          Password&nbsp;
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginRight: 8 }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <p style={{ opacity: 0.6, marginTop: 8 }}>
        Tip: admin@demo.local / admin123
      </p>
    </div>
  );
}
