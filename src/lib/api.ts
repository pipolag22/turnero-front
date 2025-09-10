import axios, { AxiosHeaders } from "axios";
import type { Etapa, SnapshotDia, Turno } from "../types";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = new AxiosHeaders();
  const h = config.headers as AxiosHeaders;

 
  h.set("Cache-Control", "no-cache");
  h.set("Pragma", "no-cache");
  h.set("Expires", "0");
  h.set("Content-Type", "application/json");

  
  const token = localStorage.getItem("token");
  if (token) h.set("Authorization", `Bearer ${token}`);

  return config;
});

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
    patch: Partial<Pick<Turno, "nombre" | "estado" | "etapa">>
  ) {
    const { data } = await api.patch<Turno>(`/tickets/${id}`, patch);
    return data;
  },
  async next(stage: Etapa, date: string) {
    const { data } = await api.post<Turno | undefined>("/tickets/next", {
      stage,
      date,
    });
    return data;
  },
};
