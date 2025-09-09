import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Stage, TicketRow } from '../types';

type Action = {
  label: string;
  onClick: (t: TicketRow) => void | Promise<void>;
  show?: (t: TicketRow) => boolean; // si querés condicionar por stage/propietario
};

type Props = {
  stage: Stage;
  title?: string;
  refreshMs?: number;
  big?: boolean;
  limit?: number;
  actions?: Action[]; // 👈 botones por fila
};

export default function QueueList({ stage, title, refreshMs = 4000, big = false, limit = 12, actions = [] }: Props) {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<TicketRow[]>('/public/queue', { params: { stage } });
      setRows(data.slice(0, limit));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [stage, refreshMs]);

  return (
    <div className={`bg-white rounded-xl border shadow-sm ${big ? 'p-4' : 'p-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`${big ? 'text-xl' : 'text-base'} font-semibold`}>
          {title ?? stage}
        </h2>
        <button onClick={load} className="text-xs px-2 py-1 border rounded">Refrescar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-gray-500">
            <tr className={`${big ? 'text-lg' : 'text-xs'}`}>
              <th className="py-1 pr-2">N°</th>
              <th className="py-1 pr-2">Nombre</th>
              <th className="py-1 pr-2">Box</th>
              <th className="py-1 pr-2">Hora</th>
              {actions.length > 0 && <th className="py-1">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={actions.length ? 5 : 4} className={`${big ? 'py-6' : 'py-4'} text-center text-gray-500`}>Cargando…</td></tr>
            )}
            {!loading && rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className={`${big ? 'py-3' : 'py-2'} pr-2 font-mono ${big ? 'text-2xl' : ''}`}>{r.queueNumber}</td>
                <td className={`${big ? 'py-3' : 'py-2'} pr-2 ${big ? 'text-xl' : ''}`}>{r.displayName ?? '—'}</td>
                <td className={`${big ? 'py-3' : 'py-2'} pr-2 ${big ? 'text-xl' : ''}`}>{r.assignedBox ?? '—'}</td>
                <td className={`${big ? 'py-3' : 'py-2'} pr-2 ${big ? 'text-xl' : ''}`}>{new Date(r.createdAt).toLocaleTimeString()}</td>
                {actions.length > 0 && (
                  <td className={`${big ? 'py-3' : 'py-2'}`}>
                    <div className="flex flex-wrap gap-2">
                      {actions.map((a, i) =>
                        (a.show?.(r) ?? true) && (
                          <button key={i}
                                  onClick={() => a.onClick(r)}
                                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                            {a.label}
                          </button>
                        )
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={actions.length ? 5 : 4} className={`${big ? 'py-6' : 'py-4'} text-center text-gray-400`}>Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
