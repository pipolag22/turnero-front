import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { TicketRow } from '../lib/ticket-helpers';
import { prettyHour } from '../lib/ticket-helpers';

type Col = {
  key: 'LIC_DOCS_IN_SERVICE' | 'WAITING_PSY' | 'PSY_IN_SERVICE' | 'WAITING_LIC_RETURN';
  title: string;
  canName?: boolean;
};

const COLS: Col[] = [
  { key: 'LIC_DOCS_IN_SERVICE', title: 'Documentación en Box', canName: true },
  { key: 'WAITING_PSY', title: 'Esperando Psico' },
  { key: 'PSY_IN_SERVICE', title: 'En Psico' },
  { key: 'WAITING_LIC_RETURN', title: 'Regreso a Lic' },
];

export default function BoxPanel() {
  const [rows, setRows] = useState<Record<string, TicketRow[]>>({});
  const [loading, setLoading] = useState(false);

  const stages = useMemo(() => COLS.map(c => c.key), []);

  async function fetchStage(stage: string) {
    const { data } = await api.get<TicketRow[]>(`/public/queue?stage=${stage}`);
    return data ?? [];
  }

  async function refreshAll() {
    setLoading(true);
    try {
      const out: Record<string, TicketRow[]> = {};
      for (const s of stages) {
        out[s] = await fetchStage(s);
      }
      setRows(out);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 4000);
    return () => clearInterval(id);
  }, []); 

  async function nameTicket(ticketId: string) {
    const fullName = prompt('Nombre y apellido de la persona:')?.trim();
    if (!fullName) return;
    await api.patch(`/tickets/${ticketId}`, { fullName });
    await refreshAll();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel</h1>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando…' : 'Refrescar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6">
        {COLS.map(col => {
          const list = rows[col.key] ?? [];
          return (
            <div key={col.key} className="bg-white rounded-xl shadow-sm border">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="font-semibold">{col.title}</h2>
                <button
                  onClick={refreshAll}
                  className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
                >
                  Refrescar
                </button>
              </div>

              <div className="p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-2 px-2 w-12">N°</th>
                      <th className="text-left py-2 px-2">Nombre</th>
                      <th className="text-left py-2 px-2 w-16">Box</th>
                      <th className="text-left py-2 px-2 w-28">Hora</th>
                      {col.canName && <th className="text-left py-2 px-2 w-28">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={col.canName ? 5 : 4} className="py-8 text-center text-gray-400">
                          Sin datos
                        </td>
                      </tr>
                    )}
                    {list.map(t => (
                      <tr key={t.id} className="border-t">
                        <td className="py-2 px-2">{t.queueNumber}</td>
                        <td className="py-2 px-2">{t.fullName ?? '—'}</td>
                        <td className="py-2 px-2">{t.assignedBox ?? '—'}</td>
                        <td className="py-2 px-2">{t.createdAt ? prettyHour(t.createdAt) : '—'}</td>
                        {col.canName && (
                          <td className="py-2 px-2">
                            <button
                              onClick={() => nameTicket(t.id)}
                              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Nombrar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
