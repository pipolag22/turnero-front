import {  useState } from 'react';
import {  TicketsApi } from '../lib/api';
import type { Etapa } from '../types';
import { useColaRealtime } from './hooks/useColaRealtime';

export default function AdminPage() {
  const { snap, date } = useColaRealtime();
  const [nombre, setNombre] = useState("");

  if (!snap) return <div className="p-6">Cargando…</div>;

  async function crear() {
    const n = nombre.trim();
    if (!n) return;
    await TicketsApi.create(n, date);
    setNombre("");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Administración del día {date}</h1>

      <div className="mb-6 flex gap-2">
        <input
          value={nombre}
          onChange={(e)=>setNombre(e.target.value)}
          placeholder="Nombre completo…"
          className="border rounded px-2 py-1 flex-1"
        />
        <button onClick={crear} className="px-4 py-2 rounded bg-blue-600 text-white">
          Crear turno
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {(["RECEPCION","BOX","PSICO"] as Etapa[]).map(et => (
          <div key={et} className="border rounded p-3">
            <h2 className="font-semibold mb-2">Cola {et}</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {(snap.colas[et] || []).map(t => (
                <li key={t.id}>{t.nombre || "—"}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}