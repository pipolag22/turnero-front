import { io, Socket } from "socket.io-client";

export const socket: Socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: false,
});

// Rooms públicas por etapa 
export function joinPublicRooms() {
  socket.emit("subscribe", {
    rooms: [
      "public:stage:RECEPCION",
      "public:stage:BOX",
      "public:stage:PSICO",
      "public:stage:CAJERO",
      "public:stage:FINAL",
      "public:tv",
    ],
  });
}
