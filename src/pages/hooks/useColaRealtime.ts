import { useEffect, useState } from "react";
import { TicketsApi } from "@/lib/api";
import { hoyISO } from "@/lib/date";
import { socket } from "@/lib/realtime";
import { SnapshotDia, Turno, Etapa } from "@/types";

export function useColaRealtime() {
  const [date] = useState(hoyISO());
  const [snap, setSnap] = useState<SnapshotDia | null>(null);

  useEffect(() => {
    let mounted = true;

    TicketsApi.snapshot(date).then(s => {
      if (!mounted) return;
      setSnap(s);
    });

    function onSnapshot(s: SnapshotDia) { if (mounted) setSnap(s); }
    function onCreated(t: Turno) {
      if (!mounted) return;
      setSnap(prev => {
        if (!prev) return prev;
        const n: SnapshotDia = { ...prev, colas: { ...prev.colas } };
        n.colas[t.etapa] = [t, ...(n.colas[t.etapa] || []).filter(x => x.id !== t.id)];
        return n;
      });
    }
    function onUpdated(t: Turno) {
      if (!mounted) return;
      setSnap(prev => {
        if (!prev) return prev;
        const n: SnapshotDia = { ...prev, colas: { ...prev.colas }, nowServing: prev.nowServing };
        // quitar de todas las colas
        (Object.keys(n.colas) as Etapa[]).forEach(k => {
          n.colas[k] = (n.colas[k] || []).filter(x => x.id !== t.id);
        });
        // si no finalizó/canceló, reinsertar en su etapa
        if (t.estado !== "FINALIZADO" && t.estado !== "CANCELADO") {
          n.colas[t.etapa] = [ ...(n.colas[t.etapa] || []), t ];
        }
        if (t.estado === "EN_ATENCION") n.nowServing = t;
        return n;
      });
    }

    socket.on("queue.snapshot", onSnapshot);
    socket.on("turno.created", onCreated);
    socket.on("turno.updated", onUpdated);

    return () => {
      mounted = false;
      socket.off("queue.snapshot", onSnapshot);
      socket.off("turno.created", onCreated);
      socket.off("turno.updated", onUpdated);
    };
  }, [date]);

  return { snap, date };
}
