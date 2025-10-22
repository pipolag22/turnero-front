import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TicketsApi, AdminApi } from "@/lib/api";
import type { Etapa } from "@/types";
import { useColaRealtime } from "./hooks/useColaRealtime";

// Definimos los tipos para los estados actualizados
type TeoricoStatus = "ACTIVO" | "INACTIVO";
type PracticoStatus = "INACTIVO" | "CIRCUITO_AUTOS" | "CIRCUITO_MOTOS" | "SUSPENDIDO_LLUVIA";

// El objeto de estado completo que viene de la API
type SystemStatus = {
  alertaEnabled: boolean;
  alertaText: string;
  teoricoStatus: TeoricoStatus;
  practicoStatus: PracticoStatus;
};

export default function AdminPage() {
  const { snap, date, refetch } = useColaRealtime(); // Asumimos que refetch existe para actualizar la cola
  const nav = useNavigate();
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false); // Usaremos este estado también para importar
  const [loading, setLoading] = useState(true);

  // Un solo estado para todo el panel de control
  const [status, setStatus] = useState<SystemStatus | null>(null);

  // Ref para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null); 

  // Carga el estado inicial completo desde el backend
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await AdminApi.getStatus(); // Usamos el nuevo endpoint getStatus
        setStatus(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Guardia de carga principal
  if (!snap || loading || !status) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Topbar date={date || ""} onOpenTV={() => {}} onUsers={() => nav("/admin/users")} onLogout={() => nav("/login")} />
        <div className="max-w-6xl mx-auto px-6 py-10 text-slate-600">Cargando…</div>
      </div>
    );
  }
  
  // Función genérica para guardar cambios parciales del estado
  async function saveStatus(changes: Partial<SystemStatus>) {
    if (!status) return;
    setSaving(true);
    const newState = { ...status, ...changes };
    try {
      await AdminApi.setStatus(newState); // Usamos el nuevo endpoint setStatus
      setStatus(newState); // Actualiza el estado local inmediatamente
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Error al guardar el estado");
      // Opcional: Podrías volver a cargar el estado si falla el guardado
      // AdminApi.getStatus().then(setStatus); 
    } finally {
      setSaving(false);
    }
  }

  // Crea un turno manualmente
  async function crear() {
    const n = nombre.trim();
    if (!n) return;
    try {
      await TicketsApi.create(n, date);
      setNombre("");
      // Opcional: Refrescar la cola si tu hook lo permite
      if (refetch) refetch(); 
    } catch (e: any) {
       alert(e?.response?.data?.message || e?.message || "Error al crear el turno");
    }
  }

  // Abre la ventana de TV
  function openTV() {
    const url = new URL("/tv", window.location.origin).toString();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Maneja la importación del archivo Excel
  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert("Por favor, seleccioná un archivo Excel (.xlsx).");
      return;
    }
    if (!file.name.endsWith('.xlsx')) {
        alert("El archivo debe ser de tipo .xlsx");
        return;
    }

    setSaving(true); // Bloquea botones mientras importa
    try {
      const result = await AdminApi.importTickets(file, date); // Usa la fecha actual
      alert(`${result.message}\nImportados: ${result.importedCount}\nFilas omitidas: ${result.skippedRows.length > 0 ? result.skippedRows.join(', ') : 'Ninguna'}`);
      // Limpiamos el input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Refrescar la cola después de importar si tu hook lo permite
      if (refetch) refetch(); 
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Error al importar el archivo.");
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
        onLogout={() => nav("/login")} // Asegúrate que la función logout esté definida o importada si es de AuthContext
      />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Crear Turno Rápido */}
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

        {/* Importar Turnos desde Excel */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <header className="mb-3">
            <h2 className="text-lg font-bold text-slate-800">Importar Turnos desde Excel</h2>
            <p className="text-sm text-slate-500">
              Subí un archivo .xlsx con columnas 'Nombre Completo' y opcionalmente 'Hora'. Se crearán turnos para la fecha: {date}.
            </p>
          </header>
          <div className="flex items-center gap-3 mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer"
              disabled={saving}
            />
            <button
              onClick={handleImport}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "Importando..." : "Importar Excel"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Máximo 5MB. Se omitirán filas sin nombre completo.</p>
        </section>

        {/* Estado de Exámenes */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Estado de Exámenes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="teorico-status" className="block font-semibold text-slate-700">Examen Teórico</label>
              <select
                id="teorico-status"
                value={status.teoricoStatus}
                onChange={(e) => saveStatus({ teoricoStatus: e.target.value as TeoricoStatus })}
                disabled={saving}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <div>
              <label htmlFor="practico-status" className="block font-semibold text-slate-700">Examen Práctico</label>
              <select
                id="practico-status"
                value={status.practicoStatus}
                onChange={(e) => saveStatus({ practicoStatus: e.target.value as PracticoStatus })}
                disabled={saving}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="INACTIVO">Inactivo</option>
                <option value="CIRCUITO_AUTOS">Circuito Autos</option>
                <option value="CIRCUITO_MOTOS">Circuito Motos</option>
                <option value="SUSPENDIDO_LLUVIA">Suspendido por Lluvia</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Recordatorio: El estado se actualiza a "Inactivo" automáticamente a las 13:00 hs.
          </p>
        </section>

        {/* Alerta General */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <header className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold text-slate-800">Alerta General en TV</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${status.alertaEnabled ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700"}`}>
              {status.alertaEnabled ? "ACTIVA" : "Desactivada"}
            </span>
          </header>
          <textarea
            value={status.alertaText}
            onChange={(e) => setStatus({ ...status, alertaText: e.target.value })} // Actualiza el estado local al escribir
            rows={3}
            className="mt-1 w-full border border-slate-300 rounded-lg p-2"
            placeholder="Mensaje de emergencia para la TV..."
          />
          <div className="flex items-center gap-2 mt-3">
            <button 
              onClick={() => saveStatus({ alertaEnabled: true, alertaText: status.alertaText })} // Guarda el estado actual al activar
              disabled={saving} 
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Activar / Actualizar
            </button>
            <button 
              onClick={() => saveStatus({ alertaEnabled: false })} 
              disabled={saving} 
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
            >
              Desactivar
            </button>
          </div>
           <p className="mt-3 text-xs text-slate-500">
             La TV escucha cambios en vivo. Al activar/desactivar, todas las pantallas se actualizan automáticamente.
           </p>
        </section>
        
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

// El componente Topbar se mantiene igual
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