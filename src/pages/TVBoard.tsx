import { useEffect, useRef, useState } from "react";
import { TicketsApi, AdminApi } from "@/lib/api";
import { socket, joinPublicRooms } from "@/lib/realtime";
import type { Etapa, Turno } from "@/types";

// Importaciones de los nuevos archivos
import styles from '../components/tvboard/TVBoard.module.css';
import { useClock } from './hooks/useClock';
import { useSoundQueue } from './hooks/useSoundQueue';
import { StatusIndicator } from '../components/tvboard/StatusIndicator';
import { Columna } from '../components/tvboard/Columna';
import { Bloque } from '../components/tvboard/Bloque';
import { ListaSimple } from '../components/tvboard/ListaSimple';
import { ListaConBox } from '../components/tvboard/ListaConBox';
import { ListaConUser } from '../components/tvboard/ListaConUser';


// Tipos y Constantes específicas de esta página
type SystemStatus = {
  alertaEnabled: boolean;
  alertaText: string;
  teoricoStatus: "ACTIVO" | "INACTIVO";
  practicoStatus: "INACTIVO" | "CIRCUITO_AUTOS" | "CIRCUITO_MOTOS" | "SUSPENDIDO_LLUVIA";
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

export default function TVBoard() {
  // --- Refs y Estado ---
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isFs, setIsFs] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [tipIdx, setTipIdx] = useState(0);

  // --- Lógica extraída en Hooks ---
  const clock = useClock();
  const { enqueueDing } = useSoundQueue(audioRef);

  // --- Efectos de Ciclo de Vida (useEffect) ---

  // Efecto para el carrusel de Tips
  useEffect(() => {
    const tipId = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(tipId);
  }, []);

  // Efecto para cargar el estado del sistema (teórico/práctico)
  useEffect(() => {
    const onStatusUpdate = (newStatus: SystemStatus) => setStatus(newStatus);
    socket.on('system.status', onStatusUpdate);
    //const onConnect = () => AdminApi.getStatus().then(setStatus).catch(() => {});
    const onConnect = () => AdminApi.getPublicStatus().then(setStatus).catch(() => {});
    
    
    //AdminApi.getStatus().then(setStatus).catch(() => {});
    AdminApi.getPublicStatus().then(setStatus).catch(() => {});
    socket.on("connect", onConnect);

    return () => {
      socket.off('system.status', onStatusUpdate);
      socket.off("connect", onConnect);
    };
  }, []);

  // Efecto para manejar el modo de pantalla completa
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
  
  // Efecto para desbloquear el audio con la interacción del usuario
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

  // Efecto principal para carga de datos y eventos de socket
  useEffect(() => {
    const refresh = async () => {
      try {
        const s = await TicketsApi.getTvboardSnapshot();
        setSnap(s as any);
      } finally {
        setLoading(false);
      }
    }
    refresh();

    const doJoin = () => { try { joinPublicRooms(); } catch {} };
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

    const onConnect = () => { doJoin(); refresh(); };
    socket.on("connect", onConnect);

    const fallback = window.setInterval(refresh, 4000);

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
  }, [enqueueDing]);

  // --- Funciones de Ayuda ---
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
  function split(stage: Etapa) {
    const list = snap!.colas[stage] || [];
    const llamando = list.filter((t) => t.status === "EN_COLA" && (t.assignedBox != null || t.assignedUserId != null));
    const atendiendo = list.filter((t) => t.status === "EN_ATENCION");
    const enCola = list.filter((t) => t.status === "EN_COLA" && t.assignedBox == null && t.assignedUserId == null);
    return { llamando, atendiendo, enCola };
  }

  // --- Renderizado ---
  if (loading || !snap || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h2>TV — cargando…</h2>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${styles.tvRoot} tv-dark-theme ${isFs ? styles.isFs : ""}`}>
      <audio ref={audioRef} src="/sounds/call.mp3" preload="auto" />
      
      <header className={styles.tvHeader}>
         <div className="flex items-center gap-4">
           <div className={styles.brand}>
             <img src="/images/gb_tu_ciudad.svg" alt="Granadero Baigorria" />
             <div>
               <div className={styles.tit}>Municipalidad de Granadero Baigorria</div>
               <div className={styles.sub}>Provincia de Santa Fe</div>
             </div>
           </div>
           {status.teoricoStatus && <StatusIndicator label="Teóricos" status={status.teoricoStatus} />}
         </div>
         <div className={styles.clock}>{clock} <span>Hs</span></div>
         <div className="flex items-center justify-end gap-4">
           {status.practicoStatus && <StatusIndicator label="Prácticos" status={status.practicoStatus} activeColor="bg-blue-500" />}
           <div className={styles.right}>
             Centro Licencias de Conducir
             <small>Dpto. Tránsito</small>
           </div>
         </div>
         <button className={`${styles.fsbtn} ${styles.fsfab}`} onClick={toggleFullscreen} title={isFs ? "Salir de pantalla completa (Esc)" : "Pantalla completa (F)"}>
           {isFs ? <svg viewBox="0 0 24 24"><path d="M14 10h6V4m0 6-6-6M10 14H4v6m6-6-6 6" /></svg> : <svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6m10 0h6v6M10 4H4v6" /></svg>}
         </button>
         <button className={styles.loginfab} onClick={goLogin} title="Ir al login de operadores">Login</button>
       </header>

      <main className={styles.tvContent}>
        <div className={styles.titleline}>TURNOS LICENCIA DE CONDUCIR — {snap.date}</div>
        <div className={styles.grid}>
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

      <footer className={styles.bottom}>
        <div className={styles.tipline}>{TIPS[tipIdx]}</div>
        <div className={styles.footerMini}>desarrollado por Oficina de Cómputo de Granadero Baigorria</div>
      </footer>

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