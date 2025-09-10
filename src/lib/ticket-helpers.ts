import { socket, joinPublicRooms } from "./realtime";

export { socket, joinPublicRooms };



export function subscribeQueueSnapshot(handler: (payload: any) => void) {
  socket.on("queue.snapshot", handler);
  return () => socket.off("queue.snapshot", handler);
}

export function subscribeTurnoCreated(handler: (payload: any) => void) {
  socket.on("turno.created", handler);
  return () => socket.off("turno.created", handler);
}

export function subscribeTurnoUpdated(handler: (payload: any) => void) {
  socket.on("turno.updated", handler);
  return () => socket.off("turno.updated", handler);
}
