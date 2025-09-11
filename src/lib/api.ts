// src/lib/api.ts
import axios, { AxiosHeaders } from "axios";
import type { Etapa, SnapshotDia, Turno } from "@/types";
import type { Role } from "@/types";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = new AxiosHeaders();
  const h = config.headers as AxiosHeaders;

  h.set("Content-Type", "application/json");
  h.set("Cache-Control", "no-cache");
  h.set("Pragma", "no-cache");
  h.set("Expires", "0");

  const token = localStorage.getItem("token");
  if (token) h.set("Authorization", `Bearer ${token}`);
  return config;
});

// ---------- AUTH ----------
export async function loginApi(email: string, password: string) {
  try {
    const { data } = await api.post<{ accessToken: string }>("/auth/login", {
      email,
      password,
    });
    return data;
  } catch (err: any) {
    console.error("LOGIN ERROR:", {
      baseURL: api.defaults.baseURL,
      url: "/auth/login",
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
    const msg =
      typeof err?.response?.data === "string"
        ? err.response.data
        : err?.response?.data?.message ?? "Login fallido";
    throw new Error(msg);
  }
}

// ---------- TICKETS ----------
export const TicketsApi = {
  async snapshot(date: string) {
    const { data } = await api.get<SnapshotDia>("/tickets/snapshot", {
      params: { date },
    });
    return data;
  },
  async create(nombre: string, date: string) {
    const { data } = await api.post<Turno>("/tickets", { nombre, date });
    return data;
  },
  async patch(
    id: string,
    patch: Partial<Pick<Turno, "nombre" | "status" | "stage">>
  ) {
    const { data } = await api.patch<Turno>(`/tickets/${id}`, patch);
    return data;
  },
  // Compat con tu código existente (si lo seguís usando)
  async next(stage: Etapa, date: string) {
    const { data } = await api.post<Turno | undefined>("/tickets/next", {
      stage,
      date,
    });
    return data;
  },
};

// ---------- OPS (acciones de Box/Psico) ----------
export const OpsApi = {
  // Llamar próximo desde RECEPCION (documentación en BOX)
  callNextDocs(date: string) {
    return api.post("/ops/call-next-docs", { date }).then(r => r.data);
  },
  // Llamar próximo desde FINAL (retiro/retorno)
  callNextRet(date: string) {
    return api.post("/ops/call-next-ret", { date }).then(r => r.data);
  },
  // Marcar que el ticket llamado pasó a "EN_ATENCION"
  attend(ticketId: string, box: number) {
    return api.post("/ops/attend", { ticketId, box }).then(r => r.data);
  },
  // Finalizar: en BOX deriva a PSICO; en FINAL cierra
  finish(ticketId: string, box: number) {
    return api.post("/ops/finish", { ticketId, box }).then(r => r.data);
  },
};

// ---------- USERS (admin de operadores/boxes) ----------
export const UsersApi = {
  async list() {
    const { data } = await api.get('/users');
    return data as Array<{ id: string; email: string; name: string; role: Role; boxNumber: number | null }>;
  },
  async create(u: { email: string; name: string; password: string; role: Role; boxNumber?: number | null }) {
    const { data } = await api.post('/users', u);
    return data;
  },
  async update(id: string, patch: Partial<{ name: string; role: Role; boxNumber: number | null }>) {
    const { data } = await api.patch(`/users/${id}`, patch);
    return data;
  },
  async remove(id: string) {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};
