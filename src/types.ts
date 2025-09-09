export type Stage =
  | 'LIC_DOCS_IN_SERVICE'
  | 'WAITING_PSY'
  | 'PSY_IN_SERVICE'
  | 'WAITING_LIC_RETURN'
  | 'COMPLETED'
  | 'CANCELLED';

export type TicketRow = {
  id: string;
  queueNumber: number;
  displayName: string | null;
  stage: Stage;
  assignedBox: number | null;
  createdAt: string;
};

export type Me = {
  sub: string;
  role: 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';
  boxNumber?: number | null;
  office?: string | null;
};

export type UserCreateDto = {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';
  office?: string;
  boxNumber?: number;
};

export type TicketCreateDto = {
  fullName: string;
  stage: Stage;
  assignedBox?: number;
  assignedUserId?: string;
};
export type Role = 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT';

export interface UserMe {
  id: string;
  email: string;
  name: string;
  role: Role;
  office?: string | null;
  boxNumber?: number | null;
  createdAt: string;
}