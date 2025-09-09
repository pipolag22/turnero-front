import QueueList from '../components/QueueList';
import type { Stage } from '../types';

const COLS: { stage: Stage; title: string }[] = [
  { stage: 'LIC_DOCS_IN_SERVICE', title: 'Documentación' },
  { stage: 'WAITING_PSY',          title: 'Esperando Psico' },
  { stage: 'PSY_IN_SERVICE',       title: 'En Psico' },
  { stage: 'WAITING_LIC_RETURN',   title: 'Regreso a Lic' },
];

export default function TVBoard() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
      <header className="max-w-7xl mx-auto mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Turnero • Pantalla</h1>
        <p className="text-zinc-400">Actualiza cada ~4s</p>
      </header>

      <main className="max-w-7xl mx-auto grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map(c => (
          <div key={c.stage} className="bg-zinc-800 p-2 rounded-2xl">
            <QueueList stage={c.stage} title={c.title} big refreshMs={4000} limit={15}/>
          </div>
        ))}
      </main>
    </div>
  );
}
