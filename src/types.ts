// src/types.ts

// Roles que vienen en el JWT
export type Role = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT' | 'CAJERO';

// Lo que decodificamos del JWT (claims)
export type UserMe = {
  id: string;
  email: string;
  name?: string;
  role?: 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT' | 'CAJERO';
  boxNumber?: number | null;
  iat?: number;
  exp?: number;
};
export type Etapa = 'RECEPCION' | 'BOX' | 'PSICO' | 'FINAL'| 'CAJERO';
export type Estado = 'EN_COLA' | 'EN_ATENCION' | 'DERIVADO' | 'FINALIZADO' | 'CANCELADO';
export type TicketStatus = 'EN_COLA' | 'EN_ATENCION' | 'DERIVADO' | 'FINALIZADO' | 'CANCELADO';

// Modelo de ticket que devuelve el backend

export type Turno = {
  id: string;
  nombre: string | null;
  status: Estado;
  stage: Etapa;
  date: string; 
  assignedBox: number | null;
  assignedUserId: string | null;
  calledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SnapshotDia = {
  date: string;
  colas: Record<Etapa, Turno[]>;
  nowServing: Turno | null;
};
