import { useEffect, useMemo, useState } from "react";
import { useColaRealtime } from "./hooks/useColaRealtime";
import type { Etapa, Turno } from "@/types";
import { OpsApi, TicketsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function PuestoPage() {
  const { me } = useAuth();
  const { snap, date } = useColaRealtime();

  // id robusto para comparar con assignedUserId
  const myUserId =
    (me as any)?.id ??
    (me as any)?.userId ??
    (me as any)?.sub ??
    null;

  // Tab por defecto según rol
  const [stage, setStage] = useState<Etapa>("BOX");
  useEffect(() => {
    setStage(me?.role === "PSYCHO_AGENT" ? "PSICO" : "BOX");
  }, [me?.role]);

  const queueStage: Etapa = stage === "BOX" ? "RECEPCION" : "PSICO";

  const { enCola, retornoCola, myCalledBox, myAttBox, myCalledPsy, myAttPsy } =
    useMemo(() => {
      const colas = snap?.colas ?? ({} as Record<Etapa, Turno[]>);

      const colaVisible = (colas[queueStage] ?? []).filter(
        (t) => t.status === "EN_COLA"
      );
      const finalCola = (colas["FINAL"] ?? []).filter(
        (t) => t.status === "EN_COLA"
      );

      const myBox = me?.boxNumber ?? null;
      const boxTickets = [...(colas["BOX"] ?? []), ...(colas["FINAL"] ?? [])];
      const myCalledBox =
        boxTickets.find(
          (t) => t.assignedBox === myBox && t.status === "EN_COLA"
        ) || null;
      const myAttBox =
        boxTickets.find(
          (t) => t.assignedBox === myBox && t.status === "EN_ATENCION"
        ) || null;

      const psyTickets = colas["PSICO"] ?? [];

      // ⚠️ si myUserId es null, NUNCA tomes uno como "mío"
      const calledPsy =
        myUserId != null
          ? psyTickets.find(
              (t) => t.assignedUserId === myUserId && t.status === "EN_COLA"
            ) || null
          : null;

      const attPsy =
        myUserId != null
          ? psyTickets.find(
              (t) =>
                t.assignedUserId === myUserId && t.status === "EN_ATENCION"
            ) || null
          : null;

      return {
        enCola: colaVisible,
        retornoCola: finalCola,
        myCalledBox,
        myAttBox,
        myCalledPsy: calledPsy,
        myAttPsy: attPsy,
      };
    }, [snap, stage, queueStage, me?.boxNumber, myUserId]);

  if (!snap) return <div className="p-6">Cargando…</div>;

  const busyBox = !!myCalledBox || !!myAttBox;
  const busyPsy = !!myCalledPsy || !!myAttPsy;

  // ---- acciones BOX / FINAL
  async function callRecepcion() {
    await OpsApi.callNextLic(date);
  }
  async function callRetorno() {
    await OpsApi.callNextRet(date);
  }
  async function attendBox() {
    if (myCalledBox) await OpsApi.attend(myCalledBox.id);
  }
  async function finishBox() {
    if (myAttBox) await OpsApi.finish(myAttBox.id);
  }
  async function cancelBox() {
    if (myCalledBox) await OpsApi.cancel(myCalledBox.id);
  }

  // ---- acciones PSICO
  async function callPsy() {
    await OpsApi.callNextPsy(date);
  }
  async function attendPsy() {
    if (myCalledPsy) await OpsApi.psyAttend(myCalledPsy.id);
  }
  async function cancelPsy() {
    if (myCalledPsy) await OpsApi.psyCancel(myCalledPsy.id);
  }
  async function finishPsy() {
    if (myAttPsy) await OpsApi.psyFinish(myAttPsy.id);
  }

  // editar nombre en cola (solo BOX)
  async function guardarNombre(t: Turno, nombre: string) {
    const nuevo = (nombre || "").trim();
    if ((t.nombre || "") === nuevo) return;
    await TicketsApi.patch(t.id, { nombre: nuevo });
  }

  const puedeCambiarTab = me?.role === "ADMIN";

  return (
    <div
      className="p-6 max-w-6xl mx-auto"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="flex items-center gap-2 mb-4">
        {puedeCambiarTab && (
          <>
            <button
              className={`px-3 py-2 rounded ${
                stage === "BOX" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setStage("BOX")}
            >
              BOX
            </button>
            <button
              className={`px-3 py-2 rounded ${
                stage === "PSICO" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setStage("PSICO")}
            >
              PSICO
            </button>
          </>
        )}

        {stage === "BOX" ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={callRecepcion}
              className="px-4 py-2 rounded bg-emerald-600 text-white"
              disabled={busyBox}
            >
              Llamar recepción
            </button>
            <button
              onClick={callRetorno}
              className="px-4 py-2 rounded bg-teal-600 text-white"
              disabled={busyBox}
            >
              Llamar retorno
            </button>
          </div>
        ) : (
          <button
            onClick={callPsy}
            className="ml-auto px-4 py-2 rounded bg-emerald-600 text-white"
            disabled={busyPsy}
          >
            Llamar PSICO
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lista izquierda */}
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-2">
            {stage === "BOX"
              ? "Recepción (esperando)"
              : "Psicofísico (esperando)"}
          </h2>

          <ul className="space-y-2">
            {enCola.map((t) => (
              <li
                key={t.id}
                className="p-3 rounded border flex items-center gap-2"
              >
                {stage === "BOX" ? (
                  <input
                    defaultValue={t.nombre || ""}
                    placeholder="Nombre completo…"
                    onBlur={(e) => guardarNombre(t, e.currentTarget.value)}
                    className="border rounded px-2 py-1 flex-1"
                  />
                ) : (
                  <div className="flex-1 font-medium">
                    {t.nombre || "—"}
                  </div>
                )}
                <span className="text-xs opacity-60">{t.stage}</span>
              </li>
            ))}
            {enCola.length === 0 && (
              <li className="opacity-60 italic p-3 rounded border">
                — vacío —
              </li>
            )}
          </ul>

          {stage === "BOX" && (
            <>
              <h3 className="text-base font-semibold mt-6 mb-2">
                Retorno a Licencia (FINAL)
              </h3>
              <ul className="space-y-2">
                {retornoCola.map((t) => (
                  <li
                    key={t.id}
                    className="p-3 rounded border flex items-center gap-2"
                  >
                    <div className="flex-1 font-medium">
                      {t.nombre || "—"}
                    </div>
                    <span className="text-xs opacity-60">{t.stage}</span>
                  </li>
                ))}
                {retornoCola.length === 0 && (
                  <li className="opacity-60 italic p-3 rounded border">
                    — vacío —
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        {/* Panel derecha */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            {stage === "BOX" ? `Mi Box ${me?.boxNumber ?? "—"}` : "Mi puesto PSICO"}
          </h2>
          <div className="p-4 rounded border min-h-[180px] flex flex-col gap-3">
            {/* BOX */}
            {stage === "BOX" && myCalledBox && (
              <>
                <div className="text-xs opacity-60">Llamando…</div>
                <div className="text-lg font-semibold">
                  {myCalledBox.nombre || "—"}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={attendBox}
                    className="px-3 py-1 rounded bg-blue-600 text-white"
                  >
                    Atender
                  </button>
                  <button
                    onClick={cancelBox}
                    className="px-3 py-1 rounded bg-gray-300"
                  >
                    Cancelar llamado
                  </button>
                </div>
              </>
            )}
            {stage === "BOX" && myAttBox && (
              <>
                <div className="text-xs opacity-60">Atendiendo…</div>
                <div className="text-lg font-semibold">
                  {myAttBox.nombre || "—"}
                </div>
                <button
                  onClick={finishBox}
                  className="self-start px-3 py-1 rounded bg-indigo-600 text-white"
                >
                  Finalizar
                </button>
              </>
            )}

            {/* PSICO */}
            {stage === "PSICO" && myCalledPsy && (
              <>
                <div className="text-xs opacity-60">Llamando…</div>
                <div className="text-lg font-semibold">
                  {myCalledPsy.nombre || "—"}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={attendPsy}
                    className="px-3 py-1 rounded bg-blue-600 text-white"
                  >
                    Atender
                  </button>
                  <button
                    onClick={cancelPsy}
                    className="px-3 py-1 rounded bg-gray-300"
                  >
                    Cancelar llamado
                  </button>
                </div>
              </>
            )}
            {stage === "PSICO" && myAttPsy && (
              <>
                <div className="text-xs opacity-60">Atendiendo…</div>
                <div className="text-lg font-semibold">
                  {myAttPsy.nombre || "—"}
                </div>
                <button
                  onClick={finishPsy}
                  className="self-start px-3 py-1 rounded bg-indigo-600 text-white"
                >
                  Finalizar (a Retiro)
                </button>
              </>
            )}

            {!myCalledBox && !myAttBox && !myCalledPsy && !myAttPsy && (
              <div className="text-gray-400">— libre —</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
