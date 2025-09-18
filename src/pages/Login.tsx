import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role === "ADMIN") nav("/admin", { replace: true });
      else nav("/puesto", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <style>{`
        :root{
          --bg:#0f1a2a;
          --panel:#f7f9fc;
          --card:#ffffff;
          --muted:#667085;
          --border:#e5e7eb;
          --accent:#2563eb;
          --accent-600:#1d4ed8;
          --danger:#dc2626;
          --text:#0b1324;
        }
        *{box-sizing:border-box}
        html, body, #root { height:100%; margin:0; }
        body { background:var(--panel); font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; }

        .login-root{
          height:100%;
          display:flex; flex-direction:column;
        }
        .topbar{
          height:72px;
          background:var(--bg); color:#fff;
          display:flex; align-items:center; justify-content:center;
          padding:0 16px;
        }
        .brand{ display:flex; align-items:center; gap:12px; }
        .brand img{ width:36px; height:36px; object-fit:contain; border-radius:999px; background:#0b2a4a; }
        .brand .tit{ font-weight:700; letter-spacing:.2px; }
        .brand .sub{ font-size:12px; opacity:.9; margin-top:2px; }

        .content{
          flex:1; display:grid; place-items:center; padding:24px;
          background:
            radial-gradient(1200px 500px at 100% 0%, rgba(13,82,255,.06), transparent 60%),
            radial-gradient(1000px 500px at 0% 100%, rgba(13,82,255,.06), transparent 60%),
            var(--panel);
        }

        .card{
          width:min(520px, 92vw);
          background:var(--card);
          border:1px solid var(--border);
          border-radius:16px;
          padding:28px;
          box-shadow: 0 10px 40px rgba(0,0,0,.08);
        }

        .head{
          display:flex; align-items:center; gap:12px; margin-bottom:20px;
        }
        .head .title{ font-size:22px; font-weight:800; color:var(--text); }
        .head .desc{ color:var(--muted); font-size:14px }

        .field{ margin-bottom:14px; }
        .label{ display:block; font-size:13px; color:#111827; font-weight:600; margin-bottom:6px; }
        .inputwrap{
          display:flex; align-items:center; gap:8px;
          border:1px solid var(--border);
          border-radius:10px; background:#fff; padding:10px 12px;
        }
        .input{
          border:none; outline:none; flex:1; font-size:15px; color:#111827; background:transparent;
        }
        .toggle{
          font-size:12px; color:var(--muted); cursor:pointer; user-select:none;
        }

        .actions{ margin-top:8px; display:flex; align-items:center; gap:10px; }
        .btn{
          appearance:none; border:none; border-radius:12px; padding:10px 16px;
          background:var(--accent); color:#fff; font-weight:700; cursor:pointer;
        }
        .btn:hover{ background:var(--accent-600); }
        .btn:disabled{ opacity:.6; cursor:not-allowed; }

        .linksec{
          margin-left:auto; font-size:13px; color:var(--muted);
        }
        .linksec a{ color:var(--accent-600); text-decoration:none; }

        .error{
          margin-bottom:12px; background:#fee2e2; color:#7f1d1d;
          border:1px solid #fecaca; padding:10px 12px; border-radius:10px; font-size:14px;
        }

        .foot{
          margin-top:14px; font-size:12px; color:var(--muted);
        }
      `}</style>

      {/* barra superior */}
      <header className="topbar">
        <div className="brand">
          <img src="/images/gb_tu_ciudad.svg" alt="Granadero Baigorria" />
          <div>
            <div className="tit">Municipalidad de Granadero Baigorria</div>
            <div className="sub" style={{textAlign:"center"}}>Centro de Licencias de Conducir</div>
          </div>
        </div>
      </header>

      {/* contenido centrado */}
      <main className="content">
        <form className="card" onSubmit={onSubmit}>
          <div className="head">
            <div>
              <div className="title">Ingresá a tu cuenta</div>
              <div className="desc">Operadores y administración</div>
            </div>
          </div>

          {err && <div className="error">{err}</div>}

          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <div className="inputwrap">
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="usuario@dominio.com"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="pass">Contraseña</label>
            <div className="inputwrap">
              <input
                id="pass"
                className="input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <span
                className="toggle"
                role="button"
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </span>
            </div>
          </div>

          <div className="actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
            <div className="linksec">
              <a href="/tv" target="_blank" rel="noreferrer">Ver TV</a>
            </div>
          </div>

          <div className="foot">
            Tip de prueba: <strong>admin@demo.local</strong> / <strong>admin123</strong>
          </div>
        </form>
      </main>
    </div>
  );
}
