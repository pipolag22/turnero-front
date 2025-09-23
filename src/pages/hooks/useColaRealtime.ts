import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TicketsApi } from "@/lib/api";
import { socket, joinPublicRooms } from "@/lib/realtime";
import { hoyISO } from "@/lib/date";
import type { Etapa, Turno } from "@/types";

export type Snapshot = {
  date: string;
  colas: Record<Etapa, Turno[]>;
  nowServing: Turno | null;
};

export function useColaRealtime() {
  const date = useMemo(hoyISO, []);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- refetch con protección (último gana)
  const inFlight = useRef<Promise<any> | null>(null);
  const refetch = useCallback(async () => {
    const p = TicketsApi.snapshot(date)
      .then((s) => setSnap(s as any))
      .finally(() => {
        if (inFlight.current === p) inFlight.current = null;
      });
    inFlight.current = p;
    await p;
    setLoading(false);
  }, [date]);

  // ---- debounce de eventos socket
  const debTimer = useRef<number | null>(null);
  const debouncedRefetch = useCallback(
    (ms = 250) => {
      if (debTimer.current) window.clearTimeout(debTimer.current);
      debTimer.current = window.setTimeout(() => {
        refetch();
        debTimer.current = null;
      }, ms);
    },
    [refetch]
  );

  // ---- polling cuando no hay socket
  const pollId = useRef<number | null>(null);
  const startPolling = useCallback(() => {
    if (pollId.current) return;
    pollId.current = window.setInterval(() => {
      if (!socket.connected) refetch();
    }, 2000) as unknown as number;
  }, [refetch]);
  const stopPolling = useCallback(() => {
    if (pollId.current) {
      window.clearInterval(pollId.current);
      pollId.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1) primera carga
    refetch().catch(() => {});

    // 2) entrar a rooms
    joinPublicRooms();

    // 3) listeners socket
    const onSnapshot = (s: Snapshot) => {
      if (!mounted) return;
      setSnap(s);
      setLoading(false);
    };
    const onChange = () => debouncedRefetch(200);
    const onCalled = () => debouncedRefetch(50);

    socket.on("queue.snapshot", onSnapshot);
    socket.on("ticket.created", onChange);
    socket.on("ticket.updated", onChange);
    socket.on("ticket.finished", onChange);
    socket.on("ticket.called", onCalled);
    socket.on("now.serving", onCalled);
    socket.on("puesto.nowServing", onCalled);

    // 4) (des)conexión + polling
    const onConnect = () => stopPolling();
    const onDisconnect = () => startPolling();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (!socket.connected) startPolling();

    return () => {
      mounted = false;
      socket.off("queue.snapshot", onSnapshot);
      socket.off("ticket.created", onChange);
      socket.off("ticket.updated", onChange);
      socket.off("ticket.finished", onChange);
      socket.off("ticket.called", onCalled);
      socket.off("now.serving", onCalled);
      socket.off("puesto.nowServing", onCalled);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);

      stopPolling();
      if (debTimer.current) window.clearTimeout(debTimer.current);
    };
  }, [refetch, debouncedRefetch, startPolling, stopPolling]);

  return { snap, date, loading, refetch };
}
