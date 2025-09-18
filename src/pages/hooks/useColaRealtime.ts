import { useEffect, useMemo, useState, useCallback } from "react";
import type { Etapa, SnapshotDia, Turno } from "../../types";
import { hoyISO } from "../../lib/date";
import { TicketsApi } from "../../lib/api";
import { socket } from "../../lib/realtime";

export function useColaRealtime() {
  const date = useMemo(hoyISO, []);
  const [snap, setSnap] = useState<SnapshotDia | null>(null);

  const refetch = useCallback(async () => {
    const s = await TicketsApi.snapshot(date);
    setSnap(s);
  }, [date]);

  useEffect(() => {
    let mounted = true;

    refetch();

    const onSnapshot = (s: SnapshotDia) => { if (mounted) setSnap(s); };

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
        const n: SnapshotDia = { ...prev, colas: { ...prev.colas }, nowServing: prev.nowServing };

        (Object.keys(n.colas) as Etapa[]).forEach((k) => {
          n.colas[k] = (n.colas[k] ?? []).filter((x) => x.id !== t.id);
        });
        if (t.status !== "FINALIZADO" && t.status !== "CANCELADO") {
          const key = t.stage as Etapa;
          n.colas[key] = [...(n.colas[key] ?? []), t];
        }

        if (t.status === "EN_ATENCION") n.nowServing = t;
        else if (n.nowServing?.id === t.id) n.nowServing = null;

        return n;
      });
    };

    socket.on("queue.snapshot", onSnapshot);
    socket.on("ticket.created", onCreated);
    socket.on("ticket.updated", onUpdated);
    socket.on("ticket.called", refetch);
    socket.on("ticket.finished", refetch);
    socket.on("now.serving", refetch);

    // compat ES
    socket.on("turno.created", onCreated);
    socket.on("turno.updated", onUpdated);
    socket.on("puesto.nowServing", refetch);

    return () => {
      mounted = false;
      socket.off("queue.snapshot", onSnapshot);

      socket.off("ticket.created", onCreated);
      socket.off("ticket.updated", onUpdated);
      socket.off("ticket.called", refetch);
      socket.off("ticket.finished", refetch);
      socket.off("now.serving", refetch);

      socket.off("turno.created", onCreated);
      socket.off("turno.updated", onUpdated);
      socket.off("puesto.nowServing", refetch);
    };
  }, [refetch, date]);

  return { snap, date, refetch };
}
