import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Stage, TicketRow } from '../types';
import { Link } from 'react-router-dom';

const STAGES: Stage[] = [
  'LIC_DOCS_IN_SERVICE',
  'WAITING_PSY',
  'PSY_IN_SERVICE',
];

export default function PublicQueue() {
  const [stage, setStage] = useState<Stage>('LIC_DOCS_IN_SERVICE');
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchQueue(s: Stage) {
    setLoading(true);
    try {
      const { data } = await api.get<TicketRow[]>('/public/queue', { params: { stage: s } });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchQueue(stage); }, [stage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="px-4 py-3 border-b bg-white flex items-center gap-4">
        <span className="font-semibold">Turnero</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link className="underline" to="/login">Login</Link>
          <Link className="underline" to="/box">Panel Box</Link>
          <Link className="underline" to="/admin/users">Admin</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-4">
          {STAGES.map(s => (
            <button key={s}
              onClick={() => setStage(s)}
              className={`px-3 py-1 rounded border ${stage===s?'bg-black text-white':'bg-white'}`}>
              {s}
            </button>
          ))}
          <button onClick={() => fetchQueue(stage)} className="ml-auto px-3 py-1 rounded border">Refrescar</button>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">N°</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Box</th>
                <th className="px-3 py-2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-3 py-6 text-center">Cargando…</td></tr>}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.queueNumber}</td>
                  <td className="px-3 py-2">{r.displayName ?? '—'}</td>
                  <td className="px-3 py-2">{r.assignedBox ?? '—'}</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
              {!loading && rows.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
