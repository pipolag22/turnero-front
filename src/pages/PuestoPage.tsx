import { useState } from "react";
import { useColaRealtime } from "./hooks/useColaRealtime";
import { TicketsApi } from "@/lib/api";
import { Etapa, Turno } from "@/types";

export default function PuestoPage() {
  const { snap, date } = useColaRealtime();
  const [stage, setStage] = useState<Etapa>("BOX");

  if (!snap) return <div className="p-6">Cargando…</div>;
  const cola = snap.colas[stage] || [];
  const ahora = snap.nowServing;

  async function tomarSiguiente() {
    await TicketsApi.next(stage, date); // el broadcast actualiza todo
  }
  async function guardarNombre(t: Turno, nombre: string) {
    if ((t.nombre || "") === (nombre || "")) return;
    await TicketsApi.patch(t.id, { nombre });
  }
  async function derivar(t: Turno) {
    if (stage === "BOX") {
      await TicketsApi.patch(t.id, { etapa: "PSICO", estado: "EN_COLA" });
    } else if (stage === "PSICO") {
      await TicketsApi.patch(t.id, { etapa: "FINAL", estado: "FINALIZADO" });
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded ${stage === "BOX" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setStage("BOX")}
        >BOX</button>
        <button
          className={`px-3 py-2 rounded ${stage === "PSICO" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setStage("PSICO")}
        >PSICO</button>

        <button onClick={tomarSiguiente} className="ml-auto px-4 py-2 rounded bg-emerald-600 text-white">
          Tomar siguiente
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-2">Cola {stage}</h2>
          <ul className="space-y-2">
            {cola.map(t => (
              <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                <input
                  defaultValue={t.nombre || ""}
                  placeholder="Nombre completo…"
                  onBlur={(e) => guardarNombre(t, e.currentTarget.value.trim())}
                  className="border rounded px-2 py-1 flex-1"
                />
                <button
                  className="px-3 py-1 rounded bg-indigo-600 text-white"
                  onClick={() => derivar(t)}
                >
                  {stage === "PSICO" ? "Finalizar" : "Derivar a PSICO"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Ahora atendiendo</h2>
          <div className="p-4 rounded border min-h-[96px]">
            {ahora ? (
              <div className="text-lg">
                <div className="font-semibold">{ahora.nombre || "—"}</div>
              </div>
            ) : <div className="text-gray-400">—</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
