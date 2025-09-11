// src/pages/TVBoard.tsx
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
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2>TV — cargando…</h2>
      </div>
    );
  }

  // helpers para separar EN_ATENCION y EN_COLA por etapa
  function split(stage: Etapa) {
    const list = snap.colas[stage] || [];
    const enAtencion = list.find((t) => t.status === "EN_ATENCION") || null;
    const enCola = list.filter((t) => t.status === "EN_COLA");
    return { enAtencion, enCola };
  }

  const rec = split("RECEPCION");
  const box = split("BOX");
  const psy = split("PSICO");
  const fin = split("FINAL");

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Panel TV — {snap.date}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        {/* RECEPCION */}
        <ColumnaEtapa etapa="RECEPCION" titulo={TITULOS.RECEPCION}>
          <PanelActual titulo="Ahora atendiendo" actual={rec.enAtencion} />
          <Lista titulo={`Siguientes (${rec.enCola.length})`} items={rec.enCola} />
        </ColumnaEtapa>

        {/* BOX + espera intermedia a PSICO */}
        <ColumnaEtapa etapa="BOX" titulo={TITULOS.BOX}>
          <PanelActual titulo="Ahora atendiendo" actual={box.enAtencion} />
          <Lista titulo={`Siguientes (${box.enCola.length})`} items={box.enCola} />
          <Divider />
          <Lista
            titulo={`Esperando para Psicofísico (${psy.enCola.length})`}
            items={psy.enCola}
          />
        </ColumnaEtapa>

        {/* PSICO + espera intermedia a FINAL */}
        <ColumnaEtapa etapa="PSICO" titulo={TITULOS.PSICO}>
          <PanelActual titulo="Ahora atendiendo" actual={psy.enAtencion} />
          <Lista titulo={`Siguientes (${psy.enCola.length})`} items={psy.enCola} />
          <Divider />
          <Lista
            titulo={`Esperando para Retiro (${fin.enCola.length})`}
            items={fin.enCola}
          />
        </ColumnaEtapa>

        {/* FINAL (solo muestra la espera para retorno a Licencia) */}
        <ColumnaEtapa etapa="FINAL" titulo={TITULOS.FINAL}>
          <PanelActual titulo="Ahora atendiendo" actual={fin.enAtencion} />
          <Lista
            titulo={`En espera de retorno a Licencia (${fin.enCola.length})`}
            items={fin.enCola}
          />
        </ColumnaEtapa>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function ColumnaEtapa({
  etapa,
  titulo,
  children,
}: {
  etapa: Etapa;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        minHeight: 320,
        background: "#fff",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 14,
            opacity: 0.7,
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          {etapa}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{titulo}</div>
      </div>
      {children}
    </div>
  );
}

function PanelActual({ titulo, actual }: { titulo: string; actual: Turno | null }) {
  return (
    <div
      style={{
        background: "#f3f4f6",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
        {actual?.nombre?.trim() || "—"}
      </div>
    </div>
  );
}

function Lista({ titulo, items }: { titulo: string; items: Turno[] }) {
  return (
    <div>
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
              background: "#fff",
              fontWeight: 600,
            }}
          >
            {t.nombre?.trim() || "—"}
          </li>
        ))}
        {items.length === 0 && (
          <li
            style={{
              opacity: 0.6,
              fontStyle: "italic",
              padding: "8px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            — vacío —
          </li>
        )}
      </ul>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 10 }} />;
}
