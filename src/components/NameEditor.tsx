import { useState } from 'react';
import { api } from '../lib/api';

type Props = {
  id: string;
  current?: string | null;
  onSaved: (newName: string) => void;
  disabled?: boolean;
};

export default function NameEditor({ id, current, onSaved, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? '');
  const [loading, setLoading] = useState(false);
  const open = () => { setValue(current ?? ''); setEditing(true); };

  async function save() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      await api.patch(`/tickets/${id}/name`, { fullName: value.trim() });
      onSaved(value.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="px-2 py-1 text-sm rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
        onClick={open}
        disabled={disabled}
        title={current ? `Editar nombre (${current})` : 'Asignar nombre'}
      >
        {current ? 'Editar' : 'Nombrar'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nombre y apellido"
        autoFocus
      />
      <button
        className="px-2 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        onClick={save}
        disabled={loading || !value.trim()}
      >
        Guardar
      </button>
      <button
        className="px-2 py-1 text-sm rounded border"
        onClick={() => setEditing(false)}
        disabled={loading}
      >
        Cancelar
      </button>
    </div>
  );
}
