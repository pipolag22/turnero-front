export type TicketRow = {
  id: string;
  queueNumber: number;
  fullName?: string | null;
  assignedBox?: number | null;
  createdAt?: string; // opcional
  stage: 'LIC_DOCS_IN_SERVICE' | 'WAITING_PSY' | 'PSY_IN_SERVICE' | 'WAITING_LIC_RETURN' | string;
};

export function upsert(list: TicketRow[], t: TicketRow) {
  const i = list.findIndex(x => x.id === t.id);
  if (i >= 0) { 
    const copy = [...list]; 
    copy[i] = t; 
    return copy; 
  }
  return [t, ...list];
}

export function removeById(list: TicketRow[], id: string) {
  return list.filter(x => x.id !== id);
}

export function prettyHour(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-AR', { hour12: false });
  } catch {
    return iso;
  }
}
