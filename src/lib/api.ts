import axios, { AxiosHeaders } from "axios";
import type { Etapa, SnapshotDia, Turno, Role } from "@/types";

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
  const { data } = await api.post<{ accessToken: string }>("/auth/login", { email, password });
  return data;
}

// ---------- TICKETS ----------
export const TicketsApi = {

  async getTvboardSnapshot() {
    const { data } = await api.get<SnapshotDia>("/public/tvboard");
    return data;
  },
  async snapshot(date: string) {
    const { data } = await api.get<SnapshotDia>("/tickets/snapshot", { params: { date } });
    return data;
  },
  async create(nombre: string, date: string) {
    const { data } = await api.post<Turno>("/tickets", { nombre, date });
    return data;
  },
  async patch(id: string, patch: Partial<Pick<Turno, "nombre" | "status" | "stage">>) {
    const { data } = await api.patch<Turno>(`/tickets/${id}`, patch);
    return data;
  },
  async next(stage: Etapa, date: string) {
    const { data } = await api.post<Turno | undefined>("/tickets/next", { stage, date });
    return data;
  },
};

// ---------- OPS ----------
export const OpsApi = {
  // --- BOX / FINAL ---
  callNextLic(date: string) {
    return api.post("/ops/call-next-lic", { date }).then(r => r.data);
  },
  callNextRet(date: string) {
    return api.post("/ops/call-next-ret", { date }).then(r => r.data);
  },
 
  boxCall(ticketId: string) {
    return api.post("/ops/box/call", { ticketId }).then(r => r.data);
  },

  attend(ticketId: string) {
    return api.post("/ops/attending", { ticketId }).then(r => r.data);
  },
  cancel(ticketId: string) {
    return api.post("/ops/cancel", { ticketId }).then(r => r.data);
  },

  boxDerive(ticketId: string, to: 'PSICO' | 'CAJERO' | 'FINAL') {
    return api.post("/ops/box/derive", { ticketId, to }).then(r => r.data);
  },
  boxFinish(ticketId: string) {
    return api.post("/ops/box/finish", { ticketId }).then(r => r.data);
  },

  // --- PSICO ---
  callNextPsy(date: string) {
    return api.post("/ops/call-next-psy", { date }).then(r => r.data);
  },
 
  psyCall(ticketId: string) {
    return api.post("/ops/psy/call", { ticketId }).then(r => r.data);
  },
  psyAttend(ticketId: string) {
    return api.post("/ops/psy/attend", { ticketId }).then(r => r.data);
  },
  psyFinish(ticketId: string) {
    return api.post("/ops/psy/finish", { ticketId }).then(r => r.data);
  },
  psyCancel(ticketId: string) {
    return api.post("/ops/psy/cancel", { ticketId }).then(r => r.data);
  },

  // --- CAJERO ---
  callNextCashier(date: string) {
    return api.post("/ops/cashier/call-next", { date }).then(r => r.data);
  },
 
  cashierCall(ticketId: string) {
    return api.post("/ops/cashier/call", { ticketId }).then(r => r.data);
  },
  cashierAttend(ticketId: string) {
    return api.post("/ops/cashier/attend", { ticketId }).then(r => r.data);
  },
  cashierCancel(ticketId: string) {
    return api.post("/ops/cashier/cancel", { ticketId }).then(r => r.data);
  },
  cashierFinish(ticketId: string) {
    return api.post("/ops/cashier/finish", { ticketId }).then(r => r.data);
  },


  boxFinishReturn(ticketId: string) {
    return api.post("/ops/box/finish-return", { ticketId }).then(r => r.data);
  },
};

// ---------- USERS ----------
export const UsersApi = {
  async list() {
    const { data } = await api.get('/users');
    return data as Array<{ id: string; email: string; name: string; role: Role; boxNumber: number | null }>;
  },

  async create(u: { email: string; name: string; password: string; role: Role; boxNumber?: number | '' | null }) {
    const body: any = {
      email: u.email,
      name: u.name,
      password: u.password,
      role: u.role,
    };

    if (u.role === 'BOX_AGENT') {
      const parsed = u.boxNumber === '' || u.boxNumber == null ? NaN : Number(u.boxNumber);
      if (!Number.isNaN(parsed)) body.boxNumber = parsed;
    }

    const { data } = await api.post('/users', body);
    return data;
  },

  async update(
    id: string,
    patch: Partial<{ name: string; role: Role; boxNumber: number | '' | null }>
  ) {
    const body: any = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.role !== undefined) body.role = patch.role;

    if (patch.role === 'BOX_AGENT') {
      const parsed =
        patch.boxNumber === '' || patch.boxNumber == null ? NaN : Number(patch.boxNumber);
      if (!Number.isNaN(parsed)) body.boxNumber = parsed;
    } else if (patch.boxNumber !== undefined) {
      // si cambia a otro rol, limpiamos boxNumber
      body.boxNumber = null;
    }

    const { data } = await api.patch(`/users/${id}`, body);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};

// ---------- ADMIN ----------
export type TvAlert = { enabled: boolean; text: string };

export const AdminApi = {
  // Obtenemos el objeto de estado completo
  async getStatus() {
    const { data } = await api.get("/admin/status");
    return data;
  },
  // Enviamos el objeto de estado completo
  async setStatus(payload: any) {
    const { data } = await api.post("/admin/status", payload);
    return data;
  },
  async getPublicStatus() {
    const { data } = await api.get("/public/status");
    return data;
  },
};
