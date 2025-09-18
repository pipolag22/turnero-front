import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useColaRealtime } from "./hooks/useColaRealtime";
import type { Etapa, Turno, Role } from "@/types";
import { OpsApi, TicketsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { decodeJwt } from "@/lib/decodeJwt";

type Buckets = {
  waitingRecep: Turno[];
  waitingRetiro: Turno[];
  myCalled: Turno | null;
  myAttending: Turno | null;
};

export default function PuestoPage() {
  const { me, logout } = useAuth() as any;
  const nav = useNavigate();
  const { snap, date, refetch } = useColaRealtime();

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const jwt = decodeJwt(token);

  const role: Role =
    (me?.role as Role | undefined) ??
    ((jwt?.role as Role) || (Array.isArray(jwt?.roles) ? (jwt?.roles[0] as Role) : undefined)) ??
    "BOX_AGENT";

  const myUserId: string | null =
    me?.id ?? me?.userId ?? me?.sub ?? jwt?.id ?? jwt?.userId ?? jwt?.uid ?? jwt?.sub ?? null;

  const myBox: number | null =
    (me?.boxNumber as number | null | undefined) ??
    (typeof jwt?.boxNumber === "number" ? jwt.boxNumber : null);

  const buckets: Buckets = useMemo(() => {
    const colas = (snap?.colas ?? {}) as Record<Etapa, Turno[]>;

    if (role === "BOX_AGENT") {
      const waitingRecep  = (colas.RECEPCION ?? []).filter(t => t.status === "EN_COLA");
      const waitingRetiro = (colas.FINAL      ?? []).filter(t => t.status === "EN_COLA");
      const pool = [...(colas.BOX ?? []), ...(colas.FINAL ?? [])];
      const myCalled =
        pool.find(t => t.assignedBox === myBox && t.status === "EN_COLA") ?? null;
      const myAttending =
        pool.find(t => t.assignedBox === myBox && t.status === "EN_ATENCION") ?? null;
      return { waitingRecep, waitingRetiro, myCalled, myAttending };
    }

    if (role === "PSYCHO_AGENT") {
      const ps = colas.PSICO ?? [];
      const waitingRecep: Turno[] = [];
      const waitingRetiro: Turno[] = [];
      const myCalled =
        ps.find(t => t.assignedUserId === myUserId && t.status === "EN_COLA") ?? null;
      const myAttending =
        ps.find(t => t.assignedUserId === myUserId && t.status === "EN_ATENCION") ?? null;
      return { waitingRecep, waitingRetiro, myCalled, myAttending };
    }

    // CASHIER_AGENT
    const cj = colas.CAJERO ?? [];
    const waitingRecep: Turno[] = [];
    const waitingRetiro: Turno[] = [];
    const myCalled =
      cj.find(t => t.assignedUserId === myUserId && t.status === "EN_COLA") ?? null;
    const myAttending =
      cj.find(t => t.assignedUserId === myUserId && t.status === "EN_ATENCION") ?? null;
    return { waitingRecep, waitingRetiro, myCalled, myAttending };
  }, [snap, role, myBox, myUserId]);

  if (!snap) return <div className="p-6">Cargando…</div>;

  const openTV = () => window.open(new URL("/tv", window.location.origin).toString(), "_blank", "noopener,noreferrer");
  const doLogout = () => { try { logout?.(); } catch {} localStorage.removeItem("token"); nav("/login"); };

  const guardarNombre = async (t: Turno, nombre: string) => {
    const nuevo = (nombre || "").trim();
    if ((t.nombre || "") === nuevo) return;
    await TicketsApi.patch(t.id, { nombre: nuevo });
    await refetch();
  };

  const withSync = (fn: () => Promise<any>) => async () => {
    try { await fn(); }
    catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || "Error";
      alert(msg);
      console.warn("Acción fallida:", { msg, e });
    }
    finally { await refetch(); }
  };

  const actions = {
    // BOX
    callRecepcion: withSync(async () => { if (role === "BOX_AGENT") await OpsApi.callNextLic(date); }),
    callRetorno:   withSync(async () => { if (role === "BOX_AGENT") await OpsApi.callNextRet(date); }),
    attendBox:     withSync(async () => { if (role === "BOX_AGENT" && buckets.myCalled) await OpsApi.attend(buckets.myCalled.id); }),
    cancelBox:     withSync(async () => { if (role === "BOX_AGENT" && buckets.myCalled) await OpsApi.cancel(buckets.myCalled.id); }),

    // ⚠️ nombre correcto: deriveTo
    deriveTo: (to: 'PSICO'|'CAJERO'|'FINAL') => withSync(async () => {
      if (role !== "BOX_AGENT" || !buckets.myAttending) return;
      await OpsApi.boxDerive(buckets.myAttending.id, to);
    })(),

    // finalizar desde BOX (si está atendiendo en BOX o FINAL)
    finishFromBox: withSync(async () => {
      if (role !== "BOX_AGENT" || !buckets.myAttending) return;
      await OpsApi.boxFinish(buckets.myAttending.id);
    }),

    // PSICO
    callPsy:   withSync(async () => { if (role === "PSYCHO_AGENT") await OpsApi.callNextPsy(date); }),
    psyAttend: withSync(async () => { if (role === "PSYCHO_AGENT" && buckets.myCalled) await OpsApi.psyAttend(buckets.myCalled.id); }),
    psyCancel: withSync(async () => { if (role === "PSYCHO_AGENT" && buckets.myCalled) await OpsApi.psyCancel(buckets.myCalled.id); }),
    psyFinish: withSync(async () => { if (role === "PSYCHO_AGENT" && buckets.myAttending) await OpsApi.psyFinish(buckets.myAttending.id); }),

    // CAJERO
    callCash:   withSync(async () => { if (role === "CASHIER_AGENT") await OpsApi.callNextCashier(date); }),
    cashAttend: withSync(async () => { if (role === "CASHIER_AGENT" && buckets.myCalled) await OpsApi.cashierAttend(buckets.myCalled.id); }),
    cashCancel: withSync(async () => { if (role === "CASHIER_AGENT" && buckets.myCalled) await OpsApi.cashierCancel(buckets.myCalled.id); }),
    cashFinish: withSync(async () => { if (role === "CASHIER_AGENT" && buckets.myAttending) await OpsApi.cashierFinish(buckets.myAttending.id); }),
  };

  const header =
    role === "BOX_AGENT" ? { label: "BOX", cls: "bg-blue-600" } :
    role === "PSYCHO_AGENT" ? { label: "PSICO", cls: "bg-indigo-600" } :
    { label: "CAJERO", cls: "bg-amber-600" };

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-2 rounded text-white select-none ${header.cls}`}>{header.label}</span>

        <div className="ml-auto flex items-center gap-2">
          {role === "BOX_AGENT" && (
            <>
              <button onClick={actions.callRecepcion} className="px-4 py-2 rounded bg-emerald-600 text-white"
                disabled={!!(buckets.myCalled || buckets.myAttending)}>
                Llamar recepción
              </button>
              <button onClick={actions.callRetorno} className="px-4 py-2 rounded bg-teal-600 text-white"
                disabled={!!(buckets.myCalled || buckets.myAttending)}>
                Llamar retorno
              </button>
            </>
          )}
          {role === "PSYCHO_AGENT" && (
            <button onClick={actions.callPsy} className="px-4 py-2 rounded bg-emerald-600 text-white"
              disabled={!!(buckets.myCalled || buckets.myAttending)}>
              Llamar PSICO
            </button>
          )}
          {role === "CASHIER_AGENT" && (
            <button onClick={actions.callCash} className="px-4 py-2 rounded bg-emerald-600 text-white"
              disabled={!!(buckets.myCalled || buckets.myAttending)}>
              Llamar CAJERO
            </button>
          )}
          <button onClick={openTV} className="px-3 py-2 rounded bg-slate-600 text-white">Ver TV</button>
          <button onClick={doLogout} className="px-3 py-2 rounded bg-slate-700 text-white">Cerrar sesión</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* IZQUIERDA: listados de espera */}
        <div className="col-span-2 space-y-8">
          {role === "BOX_AGENT" ? (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-2">Recepción (esperando)</h2>
                <ul className="space-y-2">
                  {(snap.colas?.RECEPCION ?? []).filter(t => t.status === "EN_COLA").map(t => (
                    <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                      <input
                        defaultValue={t.nombre || ""}
                        placeholder="Nombre completo…"
                        onBlur={(e) => guardarNombre(t, e.currentTarget.value)}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <span className="text-xs opacity-60">{t.stage}</span>
                    </li>
                  ))}
                  {((snap.colas?.RECEPCION ?? []).filter(t => t.status === "EN_COLA").length === 0) && (
                    <li className="opacity-60 italic p-3 rounded border">— vacío —</li>
                  )}
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">Retiro (esperando)</h2>
                <ul className="space-y-2">
                  {(snap.colas?.FINAL ?? []).filter(t => t.status === "EN_COLA" && !t.assignedBox).map(t => (
                    <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                      <input
                        defaultValue={t.nombre || ""}
                        placeholder="Nombre completo…"
                        onBlur={(e) => guardarNombre(t, e.currentTarget.value)}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <span className="text-xs opacity-60">{t.stage}</span>
                    </li>
                  ))}
                  {((snap.colas?.FINAL ?? []).filter(t => t.status === "EN_COLA" && !t.assignedBox).length === 0) && (
                    <li className="opacity-60 italic p-3 rounded border">— vacío —</li>
                  )}
                </ul>
              </section>
            </>
          ) : (
            <section>
              <h2 className="text-lg font-semibold mb-2">
                {role === "PSYCHO_AGENT" ? "Psicofísico (esperando)" : "Cajero (esperando)"}
              </h2>
              <ul className="space-y-2">
                {(role === "PSYCHO_AGENT" ? (snap.colas?.PSICO ?? []) : (snap.colas?.CAJERO ?? []))
                  .filter(t => t.status === "EN_COLA")
                  .map(t => (
                    <li key={t.id} className="p-3 rounded border flex items-center gap-2">
                      <input
                        defaultValue={t.nombre || ""}
                        placeholder="Nombre completo…"
                        onBlur={(e) => guardarNombre(t, e.currentTarget.value)}
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <span className="text-xs opacity-60">{t.stage}</span>
                    </li>
                ))}
                {((role === "PSYCHO_AGENT" ? (snap.colas?.PSICO ?? []) : (snap.colas?.CAJERO ?? []))
                  .filter(t => t.status === "EN_COLA").length === 0) && (
                  <li className="opacity-60 italic p-3 rounded border">— vacío —</li>
                )}
              </ul>
            </section>
          )}
        </div>

        {/* DERECHA: mi puesto */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            {role === "BOX_AGENT" ? `Mi puesto BOX ${myBox ?? "—"}` :
             role === "PSYCHO_AGENT" ? "Mi puesto PSICO" : "Mi puesto CAJERO"}
          </h2>

          <div className="p-4 rounded border min-h-[220px] flex flex-col gap-3">
            {buckets.myCalled && (
              <>
                <div className="text-xs opacity-60">Llamando…</div>
                <div className="text-lg font-semibold">{buckets.myCalled.nombre || "—"}</div>
                <div className="flex gap-2">
                  {role === "BOX_AGENT" && (
                    <>
                      <button onClick={actions.attendBox} className="px-3 py-1 rounded bg-blue-600 text-white">Atender</button>
                      <button onClick={actions.cancelBox} className="px-3 py-1 rounded bg-gray-300">Cancelar llamado</button>
                    </>
                  )}
                  {role === "PSYCHO_AGENT" && (
                    <>
                      <button onClick={actions.psyAttend} className="px-3 py-1 rounded bg-blue-600 text-white">Atender</button>
                      <button onClick={actions.psyCancel} className="px-3 py-1 rounded bg-gray-300">Cancelar llamado</button>
                    </>
                  )}
                  {role === "CASHIER_AGENT" && (
                    <>
                      <button onClick={actions.cashAttend} className="px-3 py-1 rounded bg-blue-600 text-white">Atender</button>
                      <button onClick={actions.cashCancel} className="px-3 py-1 rounded bg-gray-300">Cancelar llamado</button>
                    </>
                  )}
                </div>
              </>
            )}

            {buckets.myAttending && (
              <>
                <div className="text-xs opacity-60">Atendiendo…</div>
                <div className="text-lg font-semibold">{buckets.myAttending.nombre || "—"}</div>

                {role === "BOX_AGENT" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm mb-1 opacity-70">Derivar a:</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => actions.deriveTo("PSICO")} className="px-3 py-1 rounded bg-indigo-600 text-white">PSICO</button>
                      <button onClick={() => actions.deriveTo("CAJERO")} className="px-3 py-1 rounded bg-amber-600 text-white">CAJERO</button>
                      <button onClick={() => actions.deriveTo("FINAL")} className="px-3 py-1 rounded bg-emerald-700 text-white">FINAL</button>
                    </div>
                    <div className="pt-2">
                      <button onClick={actions.finishFromBox} className="px-3 py-1 rounded bg-emerald-700 text-white">
                        Finalizar (desde BOX)
                      </button>
                    </div>
                  </div>
                ) : role === "PSYCHO_AGENT" ? (
                  <div className="mt-2">
                    <button onClick={actions.psyFinish} className="px-3 py-1 rounded bg-emerald-700 text-white">Finalizar (a FINAL)</button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button onClick={actions.cashFinish} className="px-3 py-1 rounded bg-emerald-700 text-white">Finalizar (a FINAL)</button>
                  </div>
                )}
              </>
            )}

            {!buckets.myCalled && !buckets.myAttending && (
              <div className="text-gray-400">— libre —</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
