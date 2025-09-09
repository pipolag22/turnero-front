import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { socket, joinPublicRooms } from '../lib/realtime';
import { upsert, removeById } from '../lib/ticket-helpers';
import type { TicketRow } from '../lib/ticket-helpers';

export default function PsyPanel() {
  const [waitPsy, setWaitPsy] = useState<TicketRow[]>([]);
  const [inPsy, setInPsy] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [calling, setCalling] = useState(false);

  async function fetchQueues() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get<TicketRow[]>('/public/queue', { params: { stage: 'WAITING_PSY' } }),
        api.get<TicketRow[]>('/public/queue', { params: { stage: 'PSY_IN_SERVICE' } }),
      ]);
      setWaitPsy(a.data);
      setInPsy(b.data);
    } finally {
      setLoading(false);
    }
  }

  async function callNextPsy() {
    setCalling(true);
    try {
      const { data } = await api.post<TicketRow>('/ops/call-next-psy'); // requiere login PSY
      // lo agrega directo a “En Psico”
      setInPsy(prev => upsert(prev, data));
      setWaitPsy(prev => removeById(prev, data.id));
    } finally {
      setCalling(false);
    }
  }

  async function finish(t: TicketRow) {
    // ejemplo: pasar a COMPLETED o retorno a LIC:
    await api.patch(`/tickets/${t.id}/advance`, null, { params: { to: 'WAITING_LIC_RETURN' } });
    // el realtime lo moverá; hacemos optimista:
    setInPsy(prev => removeById(prev, t.id));
  }

  useEffect(() => {
    fetchQueues();
    const iv = setInterval(fetchQueues, 4000);
    joinPublicRooms();

    function onUpdated(u: TicketRow) {
      setWaitPsy(prev => u.stage === 'WAITING_PSY' ? upsert(prev, u) : removeById(prev, u.id));
      setInPsy(prev => u.stage === 'PSY_IN_SERVICE' ? upsert(prev, u) : removeById(prev, u.id));
    }
    function onTransitioned(p: { ticket: TicketRow }) { onUpdated(p.ticket); }

    socket.on('ticket.updated', onUpdated);
    socket.on('ticket.transitioned', onTransitioned);
    return () => {
      clearInterval(iv);
      socket.off('ticket.updated', onUpdated);
      socket.off('ticket.transitioned', onTransitioned);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel Psicofísico</h1>
        <button
          onClick={callNextPsy}
          disabled={calling}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {calling ? 'Tomando…' : 'Llamar siguiente (PSY)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Esperando Psico" onRefresh={fetchQueues} loading={loading}>
          <Table rows={waitPsy} />
        </Card>
        <Card title="En Psico" onRefresh={fetchQueues} loading={loading}>
          <Table rows={inPsy} renderActions={(t) => (
            <button
              onClick={() => finish(t)}
              className="px-3 py-1 rounded border bg-gray-50 hover:bg-gray-100"
            >
              Finalizar / Volver a LIC
            </button>
          )}/>
        </Card>
      </div>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode; onRefresh?: () => void; loading?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold">{props.title}</h2>
        <button
          className="text-sm px-3 py-1 rounded border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
          onClick={props.onRefresh}
          disabled={props.loading}
        >
          {props.loading ? '...' : 'Refrescar'}
        </button>
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

function Table(p: {
  rows: TicketRow[];
  renderActions?: (t: TicketRow) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2 pr-2">N°</th>
            <th className="py-2 pr-2">Nombre</th>
            <th className="py-2 pr-2">Box</th>
            <th className="py-2 pr-2">Hora</th>
            {p.renderActions && <th className="py-2 pr-2">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {p.rows.length === 0 && (
            <tr><td colSpan={p.renderActions ? 5 : 4} className="py-6 text-center text-gray-400">Sin datos</td></tr>
          )}
          {p.rows.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="py-2 pr-2 font-medium">{t.queueNumber}</td>
              <td className="py-2 pr-2">{t.fullName ?? '—'}</td>
              <td className="py-2 pr-2">{t.assignedBox ?? '—'}</td>
              <td className="py-2 pr-2">
                {t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '—'}
              </td>
              {p.renderActions && <td className="py-2 pr-2">{p.renderActions(t)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
