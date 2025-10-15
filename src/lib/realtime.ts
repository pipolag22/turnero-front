// front/src/lib/realtime.ts
import { io } from "socket.io-client";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (location.port === "5173" ? "http://localhost:3000" : window.location.origin);

export const socket = io(WS_URL, {
  path: "/socket.io",
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});

export function joinPublicRooms() {
  try {
    socket.emit("join.public");
  } catch {}
}


socket.on("connect", () => {
  joinPublicRooms();
});
