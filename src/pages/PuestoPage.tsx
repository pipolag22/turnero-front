import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useColaRealtime } from "./hooks/useColaRealtime";
import type { Etapa, Turno, Role } from "@/types";
import { OpsApi, TicketsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { decodeJwt } from "@/lib/decodeJwt";

/* ---------- tipos auxiliares ---------- */
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

  if (!snap) return (
    <div className="min-h-screen bg-slate-50">
      <Topbar role={role} myBox={myBox} date={date} onTV={() => openTV()} onLogout={() => doLogout(nav, logout)} />
      <div className="max-w-6xl mx-auto px-6 py-10 text-slate-600">Cargando…</div>
    </div>
  );

  const openTV = () =>
    window.open(new URL("/tv", window.location.origin).toString(), "_blank", "noopener,noreferrer");
  const doLogout = (n: ReturnType<typeof useNavigate>, lo?: () => void) => {
    try { lo?.(); } catch {}
    localStorage.removeItem("token");
    n("/login");
  };

  const guardarNombre = async (t: Turno, nombre: string) => {
    const nuevo = (nombre || "").trim();
    if ((t.nombre || "") === nuevo) return;
    await TicketsApi.patch(t.id, { nombre: nuevo });
    await refetch();
  };

  /* ----- helpers de flujo (confirm + sync) ----- */
  const withSync = (fn: () => Promise<any>) => async () => {
    try { await fn(); }
    catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || "Error";
      alert(msg);
      console.warn("Acción fallida:", { msg, e });
    }
    finally { await refetch(); }
  };

  const confirmThen = (question: string, fn: () => Promise<any>) =>
    withSync(async () => { if (!window.confirm(question)) return; await fn(); });

  /* ----- NUEVO: llamar un ticket puntual ----- */
  const callSpecific = (t: Turno) =>
    withSync(async () => {
      if (role === "BOX_AGENT")     await OpsApi.boxCall(t.id);
      else if (role === "PSYCHO_AGENT")  await OpsApi.psyCall(t.id);
      else                           await OpsApi.cashierCall(t.id);
    })();

  const actions = {
    // BOX
    callRecepcion: withSync(async () => { if (role === "BOX_AGENT") await OpsApi.callNextLic(date); }),
    callRetorno:   withSync(async () => { if (role === "BOX_AGENT") await OpsApi.callNextRet(date); }),
    attendBox:     withSync(async () => { if (role === "BOX_AGENT" && buckets.myCalled) await OpsApi.attend(buckets.myCalled.id); }),
    cancelBox:     confirmThen("¿Cancelar el llamado actual?", async () => {
                      if (role === "BOX_AGENT" && buckets.myCalled) await OpsApi.cancel(buckets.myCalled.id);
                    }),

    deriveTo: (to: "PSICO" | "CAJERO") =>
      confirmThen(`¿Derivar a ${to === "PSICO" ? "Psicofísico" : "Caja"}?`, async () => {
        if (role !== "BOX_AGENT" || !buckets.myAttending) return;
        await OpsApi.boxDerive(buckets.myAttending.id, to);
      })(),

    finishFromBox: confirmThen("¿Finalizar el trámite?", async () => {
      if (role !== "BOX_AGENT" || !buckets.myAttending) return;
      await OpsApi.boxFinish(buckets.myAttending.id);
    }),

    // PSICO
    callPsy:   withSync(async () => { if (role === "PSYCHO_AGENT") await OpsApi.callNextPsy(date); }),
    psyAttend: withSync(async () => { if (role === "PSYCHO_AGENT" && buckets.myCalled) await OpsApi.psyAttend(buckets.myCalled.id); }),
    psyCancel: confirmThen("¿Cancelar el llamado actual en PSICO?", async () => {
      if (role === "PSYCHO_AGENT" && buckets.myCalled) await OpsApi.psyCancel(buckets.myCalled.id);
    }),
    psyFinish: confirmThen("¿Finalizar en PSICO?", async () => {
      if (role === "PSYCHO_AGENT" && buckets.myAttending) await OpsApi.psyFinish(buckets.myAttending.id);
    }),

    // CAJERO
    callCash:   withSync(async () => { if (role === "CASHIER_AGENT") await OpsApi.callNextCashier(date); }),
    cashAttend: withSync(async () => { if (role === "CASHIER_AGENT" && buckets.myCalled) await OpsApi.cashierAttend(buckets.myCalled.id); }),
    cashCancel: confirmThen("¿Cancelar el llamado actual en CAJERO?", async () => {
      if (role === "CASHIER_AGENT" && buckets.myCalled) await OpsApi.cashierCancel(buckets.myCalled.id);
    }),
    cashFinish: confirmThen("¿Finalizar en CAJERO?", async () => {
      if (role === "CASHIER_AGENT" && buckets.myAttending) await OpsApi.cashierFinish(buckets.myAttending.id);
    }),
  };

  const header =
    role === "BOX_AGENT" ? { label: "BOX", cls: "bg-blue-600" } :
    role === "PSYCHO_AGENT" ? { label: "PSICO", cls: "bg-indigo-600" } :
    { label: "CAJERO", cls: "bg-amber-600" };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "system-ui, sans-serif" }}>
      <Topbar role={role} myBox={myBox} date={date} onTV={openTV} onLogout={() => doLogout(nav, logout)} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className={`px-3 py-2 rounded-lg text-white font-semibold ${header.cls}`}>{header.label}</span>
          <div className="text-sm text-slate-500">
            Fecha: <strong className="text-slate-700">{date}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {role === "BOX_AGENT" && (
              <>
                <button onClick={actions.callRecepcion} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                  disabled={!!(buckets.myCalled || buckets.myAttending)}>
                  Llamar recepción
                </button>
                <button onClick={actions.callRetorno} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-60"
                  disabled={!!(buckets.myCalled || buckets.myAttending)}>
                  Llamar retorno
                </button>
              </>
            )}
            {role === "PSYCHO_AGENT" && (
              <button onClick={actions.callPsy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                disabled={!!(buckets.myCalled || buckets.myAttending)}>
                Llamar PSICO
              </button>
            )}
            {role === "CASHIER_AGENT" && (
              <button onClick={actions.callCash} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                disabled={!!(buckets.myCalled || buckets.myAttending)}>
                Llamar CAJERO
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* IZQUIERDA: listados de espera (con botón “Llamar este”) */}
          <div className="lg:col-span-2 space-y-6">
            {role === "BOX_AGENT" ? (
              <>
                <WaitList
                  title="Recepción (esperando)"
                  items={(snap.colas?.RECEPCION ?? []).filter(t => t.status === "EN_COLA")}
                  onBlurName={guardarNombre}
                  onCall={callSpecific}
                  callDisabled={!!(buckets.myCalled || buckets.myAttending)}
                />
                <WaitList
                  title="Retiro (esperando)"
                  items={(snap.colas?.FINAL ?? []).filter(t => t.status === "EN_COLA" && !t.assignedBox)}
                  onBlurName={guardarNombre}
                  onCall={callSpecific}
                  callDisabled={!!(buckets.myCalled || buckets.myAttending)}
                />
              </>
            ) : (
              <WaitList
                title={role === "PSYCHO_AGENT" ? "Psicofísico (esperando)" : "Cajero (esperando)"}
                items={(role === "PSYCHO_AGENT" ? (snap.colas?.PSICO ?? []) : (snap.colas?.CAJERO ?? []))
                  .filter(t => t.status === "EN_COLA")}
                onBlurName={guardarNombre}
                onCall={callSpecific}
                callDisabled={!!(buckets.myCalled || buckets.myAttending)}
              />
            )}
          </div>

          {/* DERECHA: mi puesto (igual que antes) */}
          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-3">
                {role === "BOX_AGENT" ? `Mi puesto BOX ${myBox ?? "—"}` :
                 role === "PSYCHO_AGENT" ? "Mi puesto PSICO" : "Mi puesto CAJERO"}
              </h2>

              <div className="min-h-[220px] flex flex-col gap-3">
                {buckets.myCalled && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <div className="text-xs text-amber-700">Llamando…</div>
                    <div className="text-lg font-semibold">{buckets.myCalled.nombre || "—"}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {role === "BOX_AGENT" && (
                        <>
                          <button onClick={actions.attendBox} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Atender</button>
                          <button onClick={actions.cancelBox} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300">Cancelar llamado</button>
                        </>
                      )}
                      {role === "PSYCHO_AGENT" && (
                        <>
                          <button onClick={actions.psyAttend} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Atender</button>
                          <button onClick={actions.psyCancel} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300">Cancelar llamado</button>
                        </>
                      )}
                      {role === "CASHIER_AGENT" && (
                        <>
                          <button onClick={actions.cashAttend} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Atender</button>
                          <button onClick={actions.cashCancel} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300">Cancelar llamado</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {buckets.myAttending && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                    <div className="text-xs text-emerald-700">Atendiendo…</div>
                    <div className="text-lg font-semibold">{buckets.myAttending.nombre || "—"}</div>

                    {role === "BOX_AGENT" ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-slate-600">Derivar a:</p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => actions.deriveTo("PSICO")} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">PSICO</button>
                          <button onClick={() => actions.deriveTo("CAJERO")} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white">CAJERO</button>
                        </div>
                        <button onClick={actions.finishFromBox} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">
                          Finalizar
                        </button>
                      </div>
                    ) : role === "PSYCHO_AGENT" ? (
                      <div className="mt-3">
                        <button onClick={actions.psyFinish} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">Finalizar</button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <button onClick={actions.cashFinish} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">Finalizar</button>
                      </div>
                    )}
                  </div>
                )}

                {!buckets.myCalled && !buckets.myAttending && (
                  <div className="text-slate-400">— libre —</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------- UI helpers --------- */

function Topbar({
  role,
  myBox,
  date,
  onTV,
  onLogout,
}: {
  role: Role;
  myBox: number | null;
  date: string;
  onTV: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="h-16 bg-[#0f1a2a] text-white">
      <div className="h-full max-w-6xl mx-auto px-6 flex items-center gap-3">
        <img
          src="/images/gb_tu_ciudad.svg"
          alt="Granadero Baigorria"
          className="w-9 h-9 rounded-full bg-[#0b2a4a] object-contain"
        />
        <div className="leading-tight">
          <div className="font-bold">Puesto de atención</div>
          <div className="text-xs opacity-80">
            {role === "BOX_AGENT" ? `BOX ${myBox ?? "—"}` : role === "PSYCHO_AGENT" ? "PSICO" : "CAJERO"} — {date}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onTV} className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white">Ver TV</button>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}

function WaitList({
  title,
  items,
  onBlurName,
  onCall,
  callDisabled = false,
}: {
  title: string;
  items: Turno[];
  onBlurName: (t: Turno, name: string) => void;
  onCall?: (t: Turno) => void;
  callDisabled?: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center gap-2">
            <input
              defaultValue={t.nombre || ""}
              placeholder="Nombre completo…"
              onBlur={(e) => onBlurName(t, e.currentTarget.value)}
              className="border border-slate-300 rounded-lg px-2 py-1 flex-1"
            />
            <span className="text-xs opacity-60">{t.stage}</span>
            {onCall && (
              <button
                onClick={() => onCall(t)}
                disabled={callDisabled}
                className="ml-2 px-3 py-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 disabled:opacity-60"
                title={callDisabled ? "Ya estás llamando/atendiendo" : "Llamar este"}
              >
                Llamar este
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="opacity-60 italic p-3 rounded-lg border border-slate-200 bg-white">— vacío —</li>
        )}
      </ul>
    </section>
  );
}
