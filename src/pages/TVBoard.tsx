// src/pages/TVBoard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { TicketsApi } from "@/lib/api";
import { socket, joinPublicRooms } from "@/lib/realtime";
import { hoyISO } from "@/lib/date";
import type { Etapa, Turno } from "@/types";

type Snapshot = {
  date: string;
  colas: Record<Etapa, Turno[]>;
  nowServing: Turno | null;
};


const TITULOS: Record<Etapa, string> = {
  RECEPCION: "Esperando (Recepción)",
  BOX: "Cargando documentación (Box)",
  PSICO: "Psicofísico",
  FINAL: "Retiro / Final",
  CAJERO: "Retiro / Final",
};

export default function TVBoard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const date = useMemo(hoyISO, []);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );

  // reloj
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // fullscreen helpers
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

  // snapshot + realtime
  async function refresh() {
    try {
      const s = await TicketsApi.snapshot(date);
      setSnap(s as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    joinPublicRooms();
    const onSnapshot = (s: Snapshot) => setSnap(s);
    const onChange = () => refresh();

    socket.on("queue.snapshot", onSnapshot);
    socket.on("ticket.created", onChange);
    socket.on("ticket.updated", onChange);
    socket.on("ticket.called", onChange);
    socket.on("ticket.finished", onChange);
    socket.on("now.serving", onChange);
    socket.on("turno.created", onChange);
    socket.on("turno.updated", onChange);
    socket.on("puesto.nowServing", onChange);

    return () => {
      socket.off("queue.snapshot", onSnapshot);
      socket.off("ticket.created", onChange);
      socket.off("ticket.updated", onChange);
      socket.off("ticket.called", onChange);
      socket.off("ticket.finished", onChange);
      socket.off("now.serving", onChange);
      socket.off("turno.created", onChange);
      socket.off("turno.updated", onChange);
      socket.off("puesto.nowServing", onChange);
    };
  }, [date]);

  if (loading || !snap) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2>TV — cargando…</h2>
      </div>
    );
  }

  // helper: separar estados
  function split(stage: Etapa) {
    const list = snap.colas[stage] || [];
    const llamando = list.filter(
      (t) => t.status === "EN_COLA" && (t.assignedBox != null || t.assignedUserId != null)
    );
    const atendiendo = list.filter((t) => t.status === "EN_ATENCION");
    const enCola = list.filter(
      (t) => t.status === "EN_COLA" && t.assignedBox == null && t.assignedUserId == null
    );
    return { llamando, atendiendo, enCola };
  }

  const rec = split("RECEPCION");
  const box = split("BOX");
  const psy = split("PSICO");
  const fin = split("FINAL");

  return (
    <div ref={rootRef} className="tv-root">
      {/* estilos embebidos */}
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
        .fsbtn{
          background:transparent; color:#fff;
          border:1px solid rgba(255,255,255,.3);
          border-radius:10px; padding:6px 10px;
          cursor:pointer; display:inline-flex; align-items:center; gap:8px;
        }
        .fsbtn svg{ width:18px; height:18px; }

        /* Nueva variante: flotante abajo a la derecha */
        .fsfab{
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 1000;
          border-radius: 999px;
          padding: 10px 12px;
          background: rgba(15,26,42,.95);   /* fondo oscuro del header */
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(0,0,0,.25);
        }
        .fsfab:hover{ background:#0b1524; }

        .brand{ display:flex; align-items:center; gap:12px; overflow:hidden; }
        .brand img{ width:36px; height:36px; object-fit:contain; border-radius:999px; background:#0b2a4a; }
        .brand .tit{ font-weight:700; white-space:nowrap; }
        .brand .sub{ font-size:12px; opacity:.9; margin-top:2px; }

        .clock{ font-weight:800; font-size:40px; letter-spacing:1px; display:flex; align-items:baseline; gap:8px; }
        .clock span{ font-size:14px; font-weight:600; opacity:.9 }
        .right{ text-align:right; white-space:nowrap; font-weight:600; }
        .right small{ display:block; font-size:12px; opacity:.8; font-weight:500 }

        .tv-content{ height: calc(100vh - var(--header-h) - var(--bottom-h)); padding: 20px; overflow:hidden; }
        .grid{ height:100%; display:grid; grid-template-columns: repeat(4, 1fr); gap: var(--gap); }
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
        .tipline{ font-size:16px; text-align:center; line-height:1.4; }
        .llamando-pill{ background:var(--accent-pill); color:#1f2937; font-weight:800; padding:6px 12px; border-radius:10px; }
        .footer-mini{ text-align:center; font-size:12px; opacity:.85; }
      `}</style>

      {/* HEADER */}
      <header className="tv-header">
        <div className="brand">
          <img src="images/gb_tu_ciudad.svg" alt="Granadero Baigorria" />
          <div>
            <div className="tit">Municipalidad de Granadero Baigorria</div>
            <div className="sub">Provincia de Santa Fe</div>
          </div>
        </div>

        <div className="clock">
          {clock} <span>Hs</span>
        </div>

        <div className="right">
          Centro Licencias de Conducir
          <small>Dpto. Tránsito</small>
        </div>

       {/* FAB Pantalla completa — abajo derecha */}
        <button
          className="fsbtn fsfab"
          onClick={toggleFullscreen}
          title={isFs ? "Salir de pantalla completa (Esc)" : "Pantalla completa (F)"}
          aria-label={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFs ? (
            // icono minimizar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M14 10h6V4m0 6-6-6M10 14H4v6m6-6-6 6" />
            </svg>
          ) : (
            // icono maximizar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M14 4h6v6M10 20H4v-6m10 0h6v6M10 4H4v6" />
            </svg>
          )}
        </button>
      </header>

      {/* CONTENIDO */}
      <main className="tv-content">
        <div style={{ marginBottom: 8, color: "#667085" }}>
          TURNOS LICENCIA DE CONDUCIR — {snap.date}
        </div>

        <div className="grid">
          {/* RECEPCION */}
          <Columna etapa="RECEPCION" titulo={TITULOS.RECEPCION}>
            <Bloque titulo={`Siguientes (${rec.enCola.length})`}>
              <ListaSimple items={rec.enCola} />
            </Bloque>
          </Columna>

          {/* BOX */}
          <Columna etapa="BOX" titulo={TITULOS.BOX}>
            <Bloque titulo={`Llamando (${box.llamando.length})`}>
              <ListaConBox items={box.llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${box.atendiendo.length})`}>
              <ListaConBox items={box.atendiendo} />
            </Bloque>
            <Bloque titulo={`Esperando para Psicofísico (${psy.enCola.length})`}>
              <ListaSimple items={psy.enCola} />
            </Bloque>
          </Columna>

          {/* PSICO */}
          <Columna etapa="PSICO" titulo={TITULOS.PSICO}>
            <Bloque titulo={`Llamando (${psy.llamando.length})`}>
              <ListaConBox items={psy.llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${psy.atendiendo.length})`}>
              <ListaConBox items={psy.atendiendo} />
            </Bloque>
            <Bloque titulo={`Esperando para Retiro (${fin.enCola.length})`}>
              <ListaSimple items={fin.enCola} />
            </Bloque>
          </Columna>

          {/* FINAL */}
          <Columna etapa="FINAL" titulo={TITULOS.FINAL}>
            <Bloque titulo={`Llamando (${fin.llamando.length})`}>
              <ListaConBox items={fin.llamando} highlight />
            </Bloque>
            <Bloque titulo={`Atendiendo (${fin.atendiendo.length})`}>
              <ListaConBox items={fin.atendiendo} />
            </Bloque>
          </Columna>
        </div>
      </main>

      {/* BOTTOM */}
      <footer className="bottom">
        <div className="tipline">
          <strong>Tip:</strong> Mirá tu nombre en la columna correspondiente.
          Cuando aparezca en <span className="llamando-pill">Llamando</span>,
          acercate al Box indicado.
        </div>
        <div className="footer-mini">
          desarrollado por Oficina de Cómputo de Granadero Baigorria
        </div>
      </footer>
    </div>
  );
}

/* ---------- UI helpers ---------- */

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

function ListaConBox({ items, highlight = false }: { items: Turno[]; highlight?: boolean; }) {
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
