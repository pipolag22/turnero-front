// src/lib/realtime.ts
import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

export const socket: Socket = io(API_URL, {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});


export function joinPublicRooms() {
  socket.emit("subscribe", {
    rooms: [
      "public:stage:LIC_DOCS_IN_SERVICE",
      "public:stage:WAITING_PSY",
      "public:stage:PSY_IN_SERVICE",
      "public:stage:WAITING_LIC_RETURN",
    ],
  });
}
