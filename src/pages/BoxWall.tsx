import QueueList from '../components/QueueList';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function BoxWall() {
  const { me } = useAuth();

  async function callNextLic() { await api.post('/ops/call-next-lic'); }
  async function callNextPsy() { await api.post('/ops/call-next-psy'); }

  async function advance(id: string, to: string) {
    await api.patch(`/tickets/${id}/advance`, null, { params: { to } });
  }

  const actionsLic = me?.role === 'BOX_AGENT'
    ? [{ label: '→ Psico', onClick: (t: any) => advance(t.id, 'WAITING_PSY') }]
    : [];

  const actionsWaitPsy = me?.role === 'PSYCHO_AGENT'
    ? [{ label: 'Llamar PSY', onClick: () => callNextPsy() }]
    : [];

  const actionsPsyInService = me?.role === 'PSYCHO_AGENT'
    ? [{ label: 'Finalizar → Volver a Lic', onClick: (t: any) => advance(t.id, 'WAITING_LIC_RETURN') }]
    : [];

  const actionsLicReturn = me?.role === 'BOX_AGENT'
    ? [{ label: 'Finalizar', onClick: (t: any) => advance(t.id, 'COMPLETED') }]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-7xl mx-auto mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Panel</h1>
        {me?.role === 'BOX_AGENT' && (
          <button onClick={callNextLic} className="ml-auto px-4 py-2 rounded bg-black text-white">
            Llamar siguiente (LIC)
          </button>
        )}
        {me?.role === 'PSYCHO_AGENT' && (
          <button onClick={callNextPsy} className="ml-auto px-4 py-2 rounded bg-black text-white">
            Llamar siguiente (PSY)
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto grid gap-4 lg:grid-cols-4">
        <QueueList stage="LIC_DOCS_IN_SERVICE" title="Documentación en Box" actions={actionsLic}/>
        <QueueList stage="WAITING_PSY"          title="Esperando Psico"   actions={actionsWaitPsy}/>
        <QueueList stage="PSY_IN_SERVICE"       title="En Psico"          actions={actionsPsyInService}/>
        <QueueList stage="WAITING_LIC_RETURN"   title="Regreso a Lic"     actions={actionsLicReturn}/>
      </main>
    </div>
  );
}
