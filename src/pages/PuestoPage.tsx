// src/pages/PuestoPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useColaRealtime } from "./hooks/useColaRealtime";
import type { Etapa, Turno } from "@/types";
import { TicketsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function PuestoPage() {
  const { me } = useAuth();
  const { snap, date } = useColaRealtime();

  // Etapa por defecto según rol
  const [stage, setStage] = useState<Etapa>("BOX");
  useEffect(() => {
    if (me?.role === "PSYCHO_AGENT") setStage("PSICO");
    else setStage("BOX");
  }, [me]);

  // Qué cola mostrar a la izquierda según el puesto
  const queueStage: Etapa = stage === "BOX" ? "RECEPCION" : "PSICO";

  const { enAtencion, enCola, retornoCola } = useMemo(() => {
    const todosDeStage = snap?.colas[stage] ?? [];
    const at = todosDeStage.find(t => t.status === "EN_ATENCION") || null;
    const colaVisible = (snap?.colas[queueStage] ?? []).filter(t => t.status === "EN_COLA");

    // Cola de retorno para Licencia (solo útil en BOX)
    const colaRetorno = (snap?.colas["FINAL"] ?? []).filter(t => t.status === "EN_COLA");
    return { enAtencion: at, enCola: colaVisible, retornoCola: colaRetorno };
  }, [snap, stage, queueStage]);

  if (!snap) return <div className="p-6">Cargando…</div>;

  // Helpers
  async function moveTo(t: Turno, next: Partial<Pick<Turno,"stage"|"status"|"nombre">>) {
    await TicketsApi.patch(t.id, next as any);
  }

  // TOMAR SIGUIENTE (desde la cola visible)
  async function tomarDesde(queue: Etapa) {
    const cola = (snap?.colas[queue] ?? []).filter(t => t.status === "EN_COLA");
    const next = cola[0];
    if (!next) return;
    await moveTo(next, { stage, status: "EN_ATENCION" });
  }

  // Guardar nombre en blur (solo para BOX tiene sentido editar)
  async function guardarNombre(t: Turno, nombre: string) {
    const nuevo = (nombre || "").trim();
    if ((t.nombre || "") === nuevo) return;
    await TicketsApi.patch(t.id, { nombre: nuevo });
  }

  // Finalizar atención según etapa
  async function finalizarActual() {
    if (!enAtencion) return;
    if (stage === "BOX") {
      // pasa a PSICO, queda en cola
      await moveTo(enAtencion, { stage: "PSICO", status: "EN_COLA" });
    } else if (stage === "PSICO") {
      // termina PSICO y va a Retiro/Final (espera de retorno a Licencia)
      await moveTo(enAtencion, { stage: "FINAL", status: "EN_COLA" });
    }
  }

  const puedeCambiarTab = me?.role === "ADMIN";

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header y acciones */}
      <div className="flex items-center gap-2 mb-4">
        {puedeCambiarTab && (
          <>
            <button
              className={`px-3 py-2 rounded ${stage === "BOX" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setStage("BOX")}
            >
              BOX
            </button>
            <button
              className={`px-3 py-2 rounded ${stage === "PSICO" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setStage("PSICO")}
            >
              PSICO
            </button>
          </>
        )}

        {/* Botones de tomar según etapa */}
        {stage === "BOX" ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => tomarDesde("RECEPCION")}
              className="px-4 py-2 rounded bg-emerald-600 text-white"
              disabled={!!enAtencion}
              title={enAtencion ? "Hay un turno en atención" : "Tomar de recepción"}
            >
              Tomar de recepción
            </button>
            <button
              onClick={() => tomarDesde("FINAL")}
              className="px-4 py-2 rounded bg-teal-600 text-white"
              disabled={!!enAtencion}
              title={enAtencion ? "Hay un turno en atención" : "Tomar retorno (FINAL)"}
            >
              Tomar retorno
            </button>
          </div>
        ) : (
          <button
            onClick={() => tomarDesde("PSICO")}
            className="ml-auto px-4 py-2 rounded bg-emerald-600 text-white"
            disabled={!!enAtencion}
          >
            Tomar siguiente
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lista izquierda: cola visible */}
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-2">
            {stage === "BOX" ? "Recepción (esperando)" : "Psicofísico (esperando)"}
          </h2>

          <ul className="space-y-2">
            {enCola.map((t) => (
              <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                {stage === "BOX" ? (
                  <input
                    defaultValue={t.nombre || ""}
                    placeholder="Nombre completo…"
                    onBlur={(e) => guardarNombre(t, e.currentTarget.value)}
                    className="border rounded px-2 py-1 flex-1"
                  />
                ) : (
                  <div className="flex-1 font-medium">{t.nombre || "—"}</div>
                )}
                {/* hint de etapa actual del ticket */}
                <span className="text-xs opacity-60">{t.stage}</span>
              </li>
            ))}
            {enCola.length === 0 && (
              <li className="opacity-60 italic p-3 rounded border">— vacío —</li>
            )}
          </ul>

          {/* Cola de retorno visible solo en BOX */}
          {stage === "BOX" && (
            <>
              <h3 className="text-base font-semibold mt-6 mb-2">Retorno a Licencia (FINAL)</h3>
              <ul className="space-y-2">
                {retornoCola.map((t) => (
                  <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                    <div className="flex-1 font-medium">{t.nombre || "—"}</div>
                    <span className="text-xs opacity-60">{t.stage}</span>
                  </li>
                ))}
                {retornoCola.length === 0 && (
                  <li className="opacity-60 italic p-3 rounded border">— vacío —</li>
                )}
              </ul>
            </>
          )}
        </div>

        {/* Panel derecha: ahora atendiendo */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Ahora atendiendo</h2>
          <div className="p-4 rounded border min-h-[120px] flex flex-col gap-3">
            {enAtencion ? (
              <>
                <div className="text-lg font-semibold">{enAtencion.nombre || "—"}</div>
                <button
                  onClick={finalizarActual}
                  className="self-start px-3 py-1 rounded bg-indigo-600 text-white"
                >
                  {stage === "BOX" ? "Finalizar (enviar a PSICO)" : "Finalizar (enviar a Retiro)"}
                </button>
              </>
            ) : (
              <div className="text-gray-400">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
