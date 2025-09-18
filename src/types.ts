// Roles que vienen en el JWT (ALINEADOS con backend)
export type Role = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT' | 'CASHIER_AGENT';

// Lo que decodificamos del JWT (claims)
export type UserMe = {
  id: string;
  email: string;
  name?: string;
  role?: Role;
  boxNumber?: number | null;
  iat?: number;
  exp?: number;
};

export type Etapa = 'RECEPCION' | 'BOX' | 'PSICO' | 'FINAL' | 'CAJERO';
export type Estado = 'EN_COLA' | 'EN_ATENCION' | 'DERIVADO' | 'FINALIZADO' | 'CANCELADO';
export type TicketStatus = Estado;

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
