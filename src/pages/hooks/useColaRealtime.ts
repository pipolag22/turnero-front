import { useEffect, useMemo, useState } from "react";
import type { Etapa, SnapshotDia, Turno } from "../../types";
import { hoyISO } from "../../lib/date";
import { TicketsApi } from "../../lib/api";
import { socket } from "../../lib/realtime";

export function useColaRealtime() {
  const date = useMemo(hoyISO, []);
  const [snap, setSnap] = useState<SnapshotDia | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const s = await TicketsApi.snapshot(date);
      if (mounted) setSnap(s);
    };
    load();

    const onSnapshot = (s: SnapshotDia) => {
      if (mounted) setSnap(s);
    };

    const onCreated = (t: Turno) => {
      if (!mounted) return;
      setSnap((prev) => {
        if (!prev) return prev;
        const n: SnapshotDia = { ...prev, colas: { ...prev.colas } };
        if (t.status !== "FINALIZADO" && t.status !== "CANCELADO") {
          const key = t.stage as Etapa;
          const arr = (n.colas[key] ?? []).filter((x) => x.id !== t.id);
          n.colas[key] = [t, ...arr];
        }
        return n;
      });
    };

    const onUpdated = (t: Turno) => {
      if (!mounted) return;
      setSnap((prev) => {
        if (!prev) return prev;
        const n: SnapshotDia = {
          ...prev,
          colas: { ...prev.colas },
          nowServing: prev.nowServing,
        };

        // quitar de todas las colas
        (Object.keys(n.colas) as Etapa[]).forEach((k) => {
          n.colas[k] = (n.colas[k] ?? []).filter((x) => x.id !== t.id);
        });

        // reinsertar si no finalizó/canceló
        if (t.status !== "FINALIZADO" && t.status !== "CANCELADO") {
          const key = t.stage as Etapa;
          n.colas[key] = [...(n.colas[key] ?? []), t];
        }

        // now serving
        if (t.status === "EN_ATENCION") n.nowServing = t;
        else if (n.nowServing?.id === t.id) n.nowServing = null;

        return n;
      });
    };

    // Snapshot completo
    socket.on("queue.snapshot", onSnapshot);

    // Eventos en inglés
    socket.on("ticket.created", onCreated);
    socket.on("ticket.updated", onUpdated);
    socket.on("ticket.called", load);
    socket.on("ticket.finished", load);
    socket.on("now.serving", load);

    // Compat castellano
    socket.on("turno.created", onCreated);
    socket.on("turno.updated", onUpdated);
    socket.on("puesto.nowServing", load);

    return () => {
      mounted = false;
      socket.off("queue.snapshot", onSnapshot);

      socket.off("ticket.created", onCreated);
      socket.off("ticket.updated", onUpdated);
      socket.off("ticket.called", load);
      socket.off("ticket.finished", load);
      socket.off("now.serving", load);

      socket.off("turno.created", onCreated);
      socket.off("turno.updated", onUpdated);
      socket.off("puesto.nowServing", load);
    };
  }, [date]);

  return { snap, date };
}
