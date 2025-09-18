import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TicketsApi, AdminApi } from "@/lib/api";
import type { Etapa } from "@/types";
import { useColaRealtime } from "./hooks/useColaRealtime";

export default function AdminPage() {
  const { snap, date } = useColaRealtime();
  const nav = useNavigate();

  // Crear turno
  const [nombre, setNombre] = useState("");

  // 🔔 Alerta TV
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertText, setAlertText] = useState(
    "El sistema se encuentra temporalmente fuera de servicio. Por favor aguarde instrucciones."
  );
  const [saving, setSaving] = useState(false);
  const [loadingAlert, setLoadingAlert] = useState(true);

  useEffect(() => {
    // cargar estado inicial de la alerta
    (async () => {
      try {
        const a = await AdminApi.getAlert();
        setAlertEnabled(!!a.enabled);
        setAlertText(a.text ?? "");
      } catch {
        /* noop */
      } finally {
        setLoadingAlert(false);
      }
    })();
  }, []);

  if (!snap) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Topbar date={date} onOpenTV={openTV} onUsers={() => nav("/admin/users")} onLogout={() => nav("/login")} />
        <div className="max-w-6xl mx-auto px-6 py-10 text-slate-600">Cargando…</div>
      </div>
    );
  }

  async function crear() {
    const n = nombre.trim();
    if (!n) return;
    await TicketsApi.create(n, date);
    setNombre("");
  }

  function openTV() {
    const url = new URL("/tv", window.location.origin).toString();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function loadAlert() {
    try {
      setLoadingAlert(true);
      const a = await AdminApi.getAlert();
      setAlertEnabled(!!a.enabled);
      setAlertText(a.text ?? "");
    } finally {
      setLoadingAlert(false);
    }
  }

  async function saveAlert(nextEnabled: boolean) {
    setSaving(true);
    try {
      await AdminApi.setAlert({ enabled: nextEnabled, text: alertText.trim() });
      setAlertEnabled(nextEnabled);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Error guardando alerta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar
        date={date}
        onOpenTV={openTV}
        onUsers={() => nav("/admin/users")}
        onLogout={() => nav("/login")}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Tarjeta: crear turno + alerta */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crear turno */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <header className="mb-3">
              <h2 className="text-lg font-bold text-slate-800">Crear turno rápido</h2>
              <p className="text-sm text-slate-500">Carga manual de personas que llegan sin turno.</p>
            </header>

            <div className="flex gap-2 mt-2">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo…"
                className="border border-slate-300 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                onClick={crear}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
              >
                Crear turno
              </button>
            </div>
          </section>

          {/* Alerta TV */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <header className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-bold text-slate-800">Alerta en TV</h2>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  alertEnabled ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {alertEnabled ? "ACTIVA" : "Desactivada"}
              </span>
              <button
                onClick={loadAlert}
                className="ml-auto text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                title="Traer estado actual"
              >
                {loadingAlert ? "Cargando…" : "Recargar estado"}
              </button>
            </header>

            <label className="text-sm text-slate-600">Texto a mostrar</label>
            <textarea
              value={alertText}
              onChange={(e) => setAlertText(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Mensaje que va debajo del ícono en la TV…"
            />

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => saveAlert(true)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60"
                title="Activar alerta en todas las TVs"
              >
                {saving && alertEnabled ? "Guardando…" : "Activar / Actualizar"}
              </button>
              <button
                onClick={() => saveAlert(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold disabled:opacity-60"
                title="Quitar alerta de las TVs"
              >
                {saving && !alertEnabled ? "Guardando…" : "Desactivar"}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              La TV escucha cambios en vivo. Al activar/desactivar, todas las pantallas se actualizan automáticamente.
            </p>
          </section>
        </div>

        {/* Colas del día */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <header className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Colas del día</h2>
              <p className="text-sm text-slate-500">Vista general por etapa</p>
            </div>
            <div className="text-xs text-slate-500">Fecha: <strong className="text-slate-700">{date}</strong></div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {(["RECEPCION", "BOX", "PSICO", "CAJERO", "FINAL"] as Etapa[]).map((et) => (
              <div key={et} className="rounded-xl border border-slate-200">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                  <h3 className="text-sm font-semibold text-slate-700">Cola {et}</h3>
                </div>
                <ol className="p-3 space-y-2 text-sm">
                  {(snap.colas[et] || []).map((t) => (
                    <li key={t.id} className="px-3 py-2 rounded-lg border border-slate-200 bg-white">
                      {t.nombre || "—"}
                    </li>
                  ))}
                  {(snap.colas[et] || []).length === 0 && (
                    <div className="italic text-slate-400">— vacío —</div>
                  )}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- UI: topbar ---------- */
function Topbar({
  date,
  onOpenTV,
  onUsers,
  onLogout,
}: {
  date: string;
  onOpenTV: () => void;
  onUsers: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="h-16 bg-[#0f1a2a] text-white">
      <div className="h-full max-w-6xl mx-auto px-6 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/images/gb_tu_ciudad.svg"
            alt="Granadero Baigorria"
            className="w-9 h-9 rounded-full bg-[#0b2a4a] object-contain"
          />
          <div className="leading-tight">
            <div className="font-bold">Municipalidad de Granadero Baigorria</div>
            <div className="text-xs opacity-80">Centro Licencias de Conducir</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-sm opacity-90 mr-2">Admin — {date}</span>
          <button
            onClick={onOpenTV}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            title="Abrir tablero de TV en nueva pestaña"
          >
            Ver TV
          </button>
          <button
            onClick={onUsers}
            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            title="Administrar operadores/usuarios"
          >
            Usuarios
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            title="Cerrar sesión"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}
