import { useEffect, useMemo, useState } from "react";
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
};

export default function TVBoard() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const date = useMemo(hoyISO, []);

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
    return <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}><h2>TV — cargando…</h2></div>;
  }

  // llamando = EN_COLA y reservado (assignedBox o assignedUserId)
  function split(stage: Etapa) {
    const list = snap.colas[stage] || [];
    const llamando   = list.filter(t => t.status === "EN_COLA" && (t.assignedBox != null || t.assignedUserId != null));
    const atendiendo = list.filter(t => t.status === "EN_ATENCION");
    const enCola     = list.filter(t => t.status === "EN_COLA" && (t.assignedBox == null && t.assignedUserId == null));
    return { llamando, atendiendo, enCola };
  }

  const rec = split("RECEPCION");
  const box = split("BOX");
  const psy = split("PSICO");
  const fin = split("FINAL");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Panel TV — {snap.date}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {/* RECEPCION */}
        <Columna etapa="RECEPCION" titulo={TITULOS.RECEPCION}>
          <ListaSimple titulo={`Siguientes (${rec.enCola.length})`} items={rec.enCola} />
        </Columna>

        {/* BOX */}
        <Columna etapa="BOX" titulo={TITULOS.BOX}>
          <ListaConBox titulo={`Llamando (${box.llamando.length})`} items={box.llamando} highlight />
          <ListaConBox titulo={`Atendiendo (${box.atendiendo.length})`} items={box.atendiendo} />
          <Divider />
          <ListaSimple titulo={`Esperando para Psicofísico (${psy.enCola.length})`} items={psy.enCola} />
        </Columna>

        {/* PSICO */}
        <Columna etapa="PSICO" titulo={TITULOS.PSICO}>
          <ListaConBox titulo={`Llamando (${psy.llamando.length})`} items={psy.llamando} highlight />
          <ListaConBox titulo={`Atendiendo (${psy.atendiendo.length})`} items={psy.atendiendo} />
          <Divider />
          <ListaSimple titulo={`Esperando para Retiro (${fin.enCola.length})`} items={fin.enCola} />
        </Columna>

        {/* FINAL */}
        <Columna etapa="FINAL" titulo={TITULOS.FINAL}>
          <ListaConBox titulo={`Llamando (${fin.llamando.length})`} items={fin.llamando} highlight />
          <ListaConBox titulo={`Atendiendo (${fin.atendiendo.length})`} items={fin.atendiendo} />
        </Columna>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function Columna({ etapa, titulo, children }: { etapa: Etapa; titulo: string; children: React.ReactNode; }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, minHeight: 320, background: "#fff" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>{etapa}</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{titulo}</div>
      </div>
      {children}
    </div>
  );
}

function ListaSimple({ titulo, items }: { titulo: string; items: Turno[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{titulo}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.slice(0, 6).map((t) => (
          <li key={t.id} style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 8, background: "#fff", fontWeight: 600 }}>
            {t.nombre?.trim() || "—"}
          </li>
        ))}
        {items.length === 0 && (
          <li style={{ opacity: 0.6, fontStyle: "italic", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
            — vacío —
          </li>
        )}
      </ul>
    </div>
  );
}

function ListaConBox({ titulo, items, highlight = false }: { titulo: string; items: Turno[]; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{titulo}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.slice(0, 6).map((t) => (
          <li
            key={t.id}
            style={{
              padding: "8px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 8,
              background: highlight ? "#fef3c7" : "#fff", // amber-100
              fontWeight: highlight ? 700 : 600,
            }}
          >
            <div>{t.nombre?.trim() || "—"}</div>
            {t.assignedBox != null && <div style={{ fontSize: 12, opacity: 0.7 }}>Box {t.assignedBox}</div>}
          </li>
        ))}
        {items.length === 0 && (
          <li style={{ opacity: 0.6, fontStyle: "italic", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}>
            — vacío —
          </li>
        )}
      </ul>
    </div>
  );
}

function Divider() { return <div style={{ height: 10 }} />; }
