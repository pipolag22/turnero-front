import { useEffect, useMemo, useRef, useState } from "react";
import { TicketsApi, AdminApi } from "@/lib/api";
import { socket, joinPublicRooms } from "@/lib/realtime";
import { hoyISO } from "@/lib/date";
import type { Etapa, Turno } from "@/types";

// Tipos de datos para el estado del sistema
type SystemStatus = {
  alertaEnabled: boolean;
  alertaText: string;
  teoricoStatus: "ACTIVO" | "INACTIVO";
  practicoStatus: "NINGUNA" | "PISTA_CHICA" | "PISTA_GRANDE" | "AMBAS";
};

type Snapshot = {
  date: string;
  colas: Record<Etapa, Turno[]>;
  nowServing: Turno | null;
};

const TITULOS: Record<Etapa, string> = {
  RECEPCION: "Esperando (Recepción)",
  BOX: "Cargando documentación (Box)",
  PSICO: "Psicofísico",
  CAJERO: "Caja",
  FINAL: "Retiro / Final",
};

const TIPS = [
  "Tips: Mirá tu nombre en la columna correspondiente. Cuando veas Llamando, acercate al Box indicado.",
  "Tips: Traé tu DNI y toda la documentación.",
  "Tips: Si debes rendir examen teórico, practicá el simulador de examen de la provincia de Santa Fe",
  "Tips: Consultas generales: acercate primero a Recepción.",
];

// --- NUEVO COMPONENTE AUXILIAR para los indicadores del header ---
function StatusIndicator({ label, status, activeColor = 'bg-green-500' }: { label: string; status: string; activeColor?: string }) {
  const isActive = status !== 'INACTIVO' && status !== 'NINGUNA';
  return (
    <div className="hidden lg:flex items-center gap-2 text-white px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
      <span className={`w-3 h-3 rounded-full ${isActive ? activeColor : 'bg-red-500'}`}></span>
      <div className="text-sm font-semibold">
        <div className="leading-tight">{label}</div>
        <div className="text-xs opacity-80 font-medium leading-tight">{status.replace('_', ' ')}</div>
      </div>
    </div>
  );
}

export default function TVBoard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isFs, setIsFs] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const date = useMemo(hoyISO, []);

  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );

  // Un solo estado para todo (alerta y exámenes)
  const [status, setStatus] = useState<SystemStatus | null>(null);
  
  // ====== SONIDO: 2 dings por evento, con cola y coalescing ======
  const dingPending = useRef(0);
  const dingPlaying = useRef(false);
  const lastEnqueueAt = useRef(0);

  function wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }
  function playOnce(): Promise<void> {
    return new Promise((resolve) => {
      const a = audioRef.current;
      if (!a) return resolve();
      const onEnd = () => {
        a.removeEventListener("ended", onEnd);
        resolve();
      };
      a.currentTime = 0;
      a.volume = 1;
      a.play()
        .then(() => a.addEventListener("ended", onEnd))
        .catch(() => setTimeout(resolve, 1200)); // si el navegador bloquea, no trabar la cola
    });
  }
  async function runDingLoop() {
    dingPlaying.current = true;
    while (dingPending.current > 0) {
      dingPending.current--;       // 1 paquete = 2 dings
      await playOnce();
      await wait(200);
      await playOnce();
      await wait(300);
    }
    dingPlaying.current = false;
  }
  function enqueueDing() {
    const now = Date.now();
    // coalesce: ignorar eventos demasiado seguidos
    if (now - lastEnqueueAt.current < 500) return;
    lastEnqueueAt.current = now;

    dingPending.current = Math.min(dingPending.current + 1, 3); // cap en cola
    if (!dingPlaying.current) runDingLoop();
  }

  // 📝 índice del tip actual
  const [tipIdx, setTipIdx] = useState(0);

  // ============= Reloj =============
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ============= Rotación de TIPs ============
  useEffect(() => {
    if (TIPS.length <= 1) return;
    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  // ============= Carga de Estado y Realtime ============
  useEffect(() => {
    // Escucha el nuevo evento de socket que creamos en el backend
    const onStatusUpdate = (newStatus: SystemStatus) => setStatus(newStatus);
    socket.on('system.status', onStatusUpdate);
    
    // Pide el estado inicial al cargar la página
    AdminApi.getStatus().then(setStatus).catch(() => {});

    // Al reconectar, también pide el estado
    const onConnect = () => AdminApi.getStatus().then(setStatus).catch(() => {});
    socket.on("connect", onConnect);

    return () => {
      socket.off('system.status', onStatusUpdate);
      socket.off("connect", onConnect);
    };
  }, []);

  // ============= Fullscreen helpers =============
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function enterFullscreen() {
    const el: any = rootRef.current;
    if (!el) return;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  }
  function exitFullscreen() {
    const doc: any = document;
    (doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen)?.call(doc);
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) exitFullscreen();
    else enterFullscreen();
  }

  function goLogin() {
    if (document.fullscreenElement) {
      exitFullscreen();
      setTimeout(() => (window.location.href = "/login"), 80);
    } else {
      window.location.href = "/login";
    }
  }

  // ============= Data =============
  async function refresh() {
    try {
      const s = await TicketsApi.snapshot(date);
      setSnap(s as any);
    } finally {
      setLoading(false);
    }
  }

  // Desbloquear audio tras primera interacción del usuario
  useEffect(() => {
    const unlock = () => {
      const a = audioRef.current;
      if (!a) return;
      a.volume = 1;
      a.play().then(() => a.pause()).catch(() => {});
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Realtime + fallback
  useEffect(() => {
    refresh();

    const doJoin = () => {
      try { joinPublicRooms(); } catch {}
    };
    doJoin();
    
    const onSnapshot = (s: Snapshot) => setSnap(s);
    const onChange = () => refresh();
    const onCalled = () => { enqueueDing(); refresh(); };

    socket.on("queue.snapshot", onSnapshot);
    socket.on("ticket.created", onChange);
    socket.on("ticket.updated", onChange);
    socket.on("ticket.called", onCalled);
    socket.on("ticket.finished", onChange);
    socket.on("now.serving", onCalled);
    socket.on("puesto.nowServing", onCalled);

    const onConnect = () => {
      doJoin();
      refresh();
    };
    socket.on("connect", onConnect);

    const fallback = window.setInterval(() => refresh(), 4000);

    return () => {
      socket.off("queue.snapshot", onSnapshot);
      socket.off("ticket.created", onChange);
      socket.off("ticket.updated", onChange);
      socket.off("ticket.called", onCalled);
      socket.off("ticket.finished", onChange);
      socket.off("now.serving", onCalled);
      socket.off("puesto.nowServing", onCalled);
      socket.off("connect", onConnect);
      window.clearInterval(fallback);
    };
  }, [date]);

  // ---------- guardia de carga ----------
  if (loading || !snap || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h2>TV — cargando…</h2>
      </div>
    );
  }

  // ---------- helpers de render ----------
  function split(stage: Etapa) {
    const list = snap!.colas[stage] || [];
    const llamando = list.filter((t) => t.status === "EN_COLA" && (t.assignedBox != null || t.assignedUserId != null));
    const atendiendo = list.filter((t) => t.status === "EN_ATENCION");
    const enCola = list.filter((t) => t.status === "EN_COLA" && t.assignedBox == null && t.assignedUserId == null);
    return { llamando, atendiendo, enCola };
  }

  return (
    <div ref={rootRef} className={`tv-root ${isFs ? "is-fs" : ""}`}>
      <audio ref={audioRef} src="/sounds/call.mp3" preload="auto" />

      {/* --- ESTILOS ORIGINALES RESTAURADOS --- */}
      <style>{`
        :root{
          --bg:#0f1a2a;
          --brand:#0e1a2a;
          --panel:#f7f9fc;
          --card:#ffffff;
          --muted:#667085;
          --border:#e5e7eb;
          --accent:#f5e6a7;
          --accent-2:#fde68a;
          --accent-pill:#facc15;
          --text:#0b1324;
          --header-h:72px;
          --bottom-h:88px;
          --gap:16px;
        }
        *{box-sizing:border-box}
        html, body, #root { height:100%; background:var(--panel); margin:0; }
        body { overflow:hidden; }
        .tv-root{ height:100%; display:flex; flex-direction:column; font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:var(--text); }
        .tv-header{
          position:relative;
          height:var(--header-h);
          background:var(--bg);
          color:#fff;
          display:grid;
          grid-template-columns: 1fr auto 1fr;
          align-items:center;
          padding:0 20px;
          gap:12px;
        }
        .is-fs .tv-header{ box-shadow: inset 0 -1px 0 rgba(255,255,255,.12); }
        .fsbtn{
          background:transparent; color:#fff;
          border:1px solid rgba(255,255,255,.3);
          border-radius:10px; padding:6px 10px;
          cursor:pointer; display:inline-flex; align-items:center; gap:8px;
        }
        .fsbtn svg{ width:18px; height:18px; }
        .fsfab{
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 1000;
          border-radius: 999px;
          background: rgba(15,26,42,.95);
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(0,0,0,.25);
        }
        .fsfab:hover{ background:#0b1524; }
        .loginfab{
          position: fixed;
          left: 20px;
          bottom: 20px;
          z-index: 1000;
          border-radius: 999px;
          background: #334155;
          color:#fff;
          border: none;
        }
        .loginfab:hover{ background:#475569; }
        .is-fs .loginfab{ display:none; }
        .brand{ display:flex; align-items:center; gap:12px; overflow:hidden; }
        .brand img{ width:36px; height:36px; object-fit:contain; border-radius:999px; background:#0b2a4a; }
        .brand .tit{ font-weight:700; white-space:nowrap; }
        .brand .sub{ font-size:12px; opacity:.9; margin-top:2px; }
        .clock{ font-weight:800; font-size:40px; letter-spacing:1px; display:flex; align-items:baseline; gap:8px; }
        .is-fs .clock{ font-size:56px; }
        .clock span{ font-size:14px; font-weight:600; opacity:.9 }
        .right{ text-align:right; white-space:nowrap; font-weight:600; }
        .right small{ display:block; font-size:12px; opacity:.85; font-weight:500 }
        .tv-content{ height: calc(100vh - var(--header-h) - var(--bottom-h)); padding: 20px; overflow:hidden; }
        .titleline{ margin-bottom:8px; color:#667085; font-weight:600; }
        .is-fs .titleline{ color:#e5e7eb; filter:drop-shadow(0 1px 0 rgba(0,0,0,.5)); font-size:18px; }
        .grid{ height:100%; display:grid; grid-template-columns: repeat(5, 1fr); gap: var(--gap); }
        .col{ background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
        .col .header{ margin-bottom:8px; }
        .col .et{ font-size:12px; text-transform:uppercase; color:var(--muted); }
        .col .ti{ font-size:18px; font-weight:700; }
        .block{ margin-top:10px; }
        .block .bt{ font-size:12px; color:var(--muted); margin-bottom:6px; }
        ul.list { list-style:none; margin:0; padding:0; overflow:auto; max-height:28vh; }
        .pill{ padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:#fff; font-weight:600; margin-bottom:8px; }
        .empty{ color:#98a2b3; font-style:italic; }
        .calling{
          background:var(--accent);
          border:1px solid #f2d783;
          animation:blink 1.15s ease-in-out infinite;
          font-size:26px;
          display:flex; align-items:center; gap:10px;
        }
        .calling .box{ font-size:12px; color:#534c2f; font-weight:700; margin-top:4px }
        .calling strong{ font-weight:800; letter-spacing:0.3px }
        @keyframes blink{ 0%,100% { background:var(--accent); } 50% { background:var(--accent-2); } }
        .bottom{ height:var(--bottom-h); background:var(--bg); color:#fff; display:flex; flex-direction:column; justify-content:center; gap:8px; padding: 10px 20px; }
        .tipline{ font-size:16px; text-align:center; line-height:1.4; transition: opacity .5s; }
        .is-fs .tipline{ font-size:18px; }
        .llamando-pill{ background:var(--accent-pill); color:#1f2937; font-weight:800; padding:6px 12px; border-radius:10px; }
        .footer-mini{ text-align:center; font-size:12px; opacity:.85; }
      `}</style>

      {/* --- HEADER MODIFICADO --- */}
      <header className="tv-header">
        <div className="flex items-center gap-4">
          <div className="brand">
            <img src="images/gb_tu_ciudad.svg" alt="Granadero Baigorria" />
            <div>
              <div className="tit">Municipalidad de Granadero Baigorria</div>
              <div className="sub">Provincia de Santa Fe</div>
            </div>
          </div>
          {status.teoricoStatus && (
            <StatusIndicator label="Teóricos" status={status.teoricoStatus} />
          )}
        </div>

        <div className="clock">
          {clock} <span>Hs</span>
        </div>

        <div className="flex items-center justify-end gap-4">
          {status.practicoStatus && (
            <StatusIndicator label="Prácticos" status={status.practicoStatus} activeColor="bg-blue-500" />
          )}
          <div className="right">
            Centro Licencias de Conducir
            <small>Dpto. Tránsito</small>
          </div>
        </div>
        
        <button className="fsbtn fsfab" onClick={toggleFullscreen} title={isFs ? "Salir de pantalla completa (Esc)" : "Pantalla completa (F)"} aria-label={isFs ? "Salir de pantalla completa" : "Pantalla completa"}>
          {isFs ? <svg viewBox="0 0 24 24"><path d="M14 10h6V4m0 6-6-6M10 14H4v6m6-6-6 6" /></svg> : <svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6m10 0h6v6M10 4H4v6" /></svg>}
        </button>
        <button className="loginfab" onClick={goLogin} title="Ir al login de operadores" aria-label="Ir al login">
          Login
        </button>
      </header>
      
      <main className="tv-content">
        <div className="titleline">
          TURNOS LICENCIA DE CONDUCIR — {snap.date}
        </div>
        <div className="grid">
          <Columna etapa="RECEPCION" titulo={TITULOS.RECEPCION}>
            <Bloque titulo={`Siguientes (${(split("RECEPCION").enCola).length})`}>
              <ListaSimple items={split("RECEPCION").enCola} />
            </Bloque>
          </Columna>
          <Columna etapa="BOX" titulo={TITULOS.BOX}>
            <Bloque titulo={`Llamando (${split("BOX").llamando.length})`}>
              <ListaConBox items={split("BOX").llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${split("BOX").atendiendo.length})`}>
              <ListaConBox items={split("BOX").atendiendo} />
            </Bloque>
            <Bloque titulo={`Esperando para Psicofísico (${split("PSICO").enCola.length})`}>
              <ListaSimple items={split("PSICO").enCola} />
            </Bloque>
          </Columna>
          <Columna etapa="PSICO" titulo={TITULOS.PSICO}>
            <Bloque titulo={`Llamando (${split("PSICO").llamando.length})`}>
              <ListaConBox items={split("PSICO").llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${split("PSICO").atendiendo.length})`}>
              <ListaConBox items={split("PSICO").atendiendo} />
            </Bloque>
            <Bloque titulo={`Esperando para Caja (${split("CAJERO").enCola.length})`}>
              <ListaSimple items={split("CAJERO").enCola} />
            </Bloque>
          </Columna>
          <Columna etapa="CAJERO" titulo={TITULOS.CAJERO}>
            <Bloque titulo={`Llamando (${split("CAJERO").llamando.length})`}>
              <ListaConUser items={split("CAJERO").llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${split("CAJERO").atendiendo.length})`}>
              <ListaConUser items={split("CAJERO").atendiendo} />
            </Bloque>
            <Bloque titulo={`Esperando para Retiro (${split("FINAL").enCola.length})`}>
              <ListaSimple items={split("FINAL").enCola} />
            </Bloque>
          </Columna>
          <Columna etapa="FINAL" titulo={TITULOS.FINAL}>
            <Bloque titulo={`Llamando (${split("FINAL").llamando.length})`}>
              <ListaConBox items={split("FINAL").llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${split("FINAL").atendiendo.length})`}>
              <ListaConBox items={split("FINAL").atendiendo} />
            </Bloque>
          </Columna>
        </div>
      </main>

      <footer className="bottom">
        <div className="tipline">{TIPS[tipIdx]}</div>
        <div className="footer-mini">desarrollado por Oficina de Cómputo de Granadero Baigorria</div>
      </footer>

      {/* Tu overlay de alerta general ahora lee del objeto 'status' */}
      {status.alertaEnabled && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "relative", width: "min(820px, 90vw)", height: "min(1060px, 88vh)", background: `url(/images/alerta.png) center/contain no-repeat` }}>
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: "8%", width: "84%", textAlign: "center", fontFamily: "system-ui, sans-serif", fontSize: "clamp(18px, 3.4vw, 34px)", fontWeight: 800, color: "#0b1324", textShadow: "0 1px 0 #fff", lineHeight: 1.25 }}>
              {status.alertaText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- COMPONENTES AUXILIARES ----------

function Columna({ etapa, titulo, children }: { etapa: Etapa; titulo: string; children: React.ReactNode; }) {
  return (
    <section className="col">
      <div className="header">
        <div className="et">{etapa}</div>
        <div className="ti">{titulo}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <div className="bt">{titulo}</div>
      {children}
    </div>
  );
}

function ListaSimple({ items }: { items: Turno[] }) {
  return (
    <ul className="list">
      {items.slice(0, 10).map((t) => (
        <li key={t.id} className="pill">{t.nombre?.trim() || "—"}</li>
      ))}
      {items.length === 0 && <li className="pill empty">— vacío —</li>}
    </ul>
  );
}

function ListaConBox({ items, highlight = false }: { items: Turno[]; highlight?: boolean }) {
  return (
    <ul className="list">
      {items.slice(0, 8).map((t) => (
        <li key={t.id} className={`pill ${highlight ? "calling" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <strong>{t.nombre?.trim() || "—"}</strong>
            {t.assignedBox != null && <span className="box">Box {t.assignedBox}</span>}
          </div>
        </li>
      ))}
      {items.length === 0 && <li className="pill empty">— vacío —</li>}
    </ul>
  );
}

function ListaConUser({ items, highlight = false }: { items: Turno[]; highlight?: boolean }) {
  return (
    <ul className="list">
      {items.slice(0, 8).map((t) => (
        <li key={t.id} className={`pill ${highlight ? "calling" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <strong>{t.nombre?.trim() || "—"}</strong>
          </div>
        </li>
      ))}
      {items.length === 0 && <li className="pill empty">— vacío —</li>}
    </ul>
  );
}