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

  // ============= Hooks de Efecto (Reloj, Tips, Fullscreen, etc.) =============
  useEffect(() => {
    const clockId = setInterval(() => {
      setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 1000);
    const tipId = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => {
      clearInterval(clockId);
      clearInterval(tipId);
    };
  }, []);

  // Carga de Estado y Realtime
  useEffect(() => {
    const onStatusUpdate = (newStatus: SystemStatus) => setStatus(newStatus);
    socket.on('system.status', onStatusUpdate);
    
    const onConnect = () => {
        AdminApi.getStatus().then(setStatus);
        joinPublicRooms();
    };

    AdminApi.getStatus().then(setStatus);
    socket.on("connect", onConnect);

    return () => {
      socket.off('system.status', onStatusUpdate);
      socket.off("connect", onConnect);
    };
  }, []);

  // Fullscreen
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

  // Desbloqueo de audio
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

  // Realtime de turnos + fallback
  useEffect(() => {
    async function refresh() {
      try {
        const s = await TicketsApi.snapshot(date);
        setSnap(s as any);
      } finally {
        setLoading(false);
      }
    }
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

  return (
    <div ref={rootRef} className={`tv-root ${isFs ? "is-fs" : ""}`}>
      <audio ref={audioRef} src="/sounds/call.mp3" preload="auto" />
      <style>{`
        /* ... (Todos tus estilos CSS largos se mantienen exactamente igual) ... */
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
            {/* ... SVG de fullscreen ... */}
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
            {(["RECEPCION", "BOX", "PSICO", "CAJERO", "FINAL"] as Etapa[]).map((etapa) => (
                <Columna key={etapa} etapa={etapa} titulo={TITULOS[etapa]}>
                    <Bloque titulo={`Llamando (${split(etapa).llamando.length})`}>
                        <ListaConBox items={split(etapa).llamando} highlight />
                    </Bloque>
                    <Bloque titulo={`Atendiendo (${split(etapa).atendiendo.length})`}>
                        <ListaConBox items={split(etapa).atendiendo} />
                    </Bloque>
                    <Bloque titulo={`Siguientes (${split(etapa).enCola.length})`}>
                        <ListaSimple items={split(etapa).enCola} />
                    </Bloque>
                </Columna>
            ))}
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