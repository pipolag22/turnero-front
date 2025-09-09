import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { TicketCreateDto } from '../types';
import QueueList from '../components/QueueList';

export default function Intake() {
  const [fullName, setFullName] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: TicketCreateDto = { fullName, stage: 'LIC_DOCS_IN_SERVICE' };
    await api.post('/tickets', payload);
    setFullName('');
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ingreso de Personas</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border p-4 flex gap-3 mb-6">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Nombre y apellido"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <button className="px-4 py-2 bg-black text-white rounded">Agregar a cola LIC</button>
      </form>

      <QueueList stage="LIC_DOCS_IN_SERVICE" title="Documentación en Box" />
    </div>
  );
}
