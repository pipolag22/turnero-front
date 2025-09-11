// src/pages/AdminPage.tsx
import { useState } from 'react';
import { TicketsApi } from '@/lib/api';
import type { Etapa } from '@/types';
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
      <h1 className="text-2xl font-bold mb-4">
        Administración del día {date}
      </h1>

      <div className="mb-6 flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo…"
          className="border rounded px-2 py-1 flex-1"
        />
        <button onClick={crear} className="px-4 py-2 rounded bg-blue-600 text-white">
          Crear turno
        </button>
      </div>

      {/* AHORA 4 columnas: RECEPCION, BOX, PSICO y FINAL */}
      <div className="grid grid-cols-4 gap-6">
        {(["RECEPCION","BOX","PSICO","FINAL"] as Etapa[]).map(et => (
          <div key={et} className="border rounded p-3">
            <h2 className="font-semibold mb-2">Cola {et}</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {(snap.colas[et] || []).map((t, i) => (
                <li key={t.id}>{t.nombre || "—"}</li>
              ))}
              {(snap.colas[et] || []).length === 0 && (
                <div className="italic opacity-60">— vacío —</div>
              )}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
