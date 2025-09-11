// src/lib/realtime.ts
import { io, Socket } from "socket.io-client";

export const socket: Socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});

// Rooms públicas por etapa en el modelo nuevo
export function joinPublicRooms() {
  socket.emit("subscribe", {
    rooms: [
      "public:stage:RECEPCION",
      "public:stage:BOX",
      "public:stage:PSICO",
      "public:stage:FINAL",
      "public:tv",
    ],
  });
}
