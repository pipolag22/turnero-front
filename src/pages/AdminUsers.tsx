import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { UserCreateDto } from '../types';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  office?: string | null;
  boxNumber?: number | null;
  createdAt: string;
};

export default function AdminUsers() {
  const [list, setList] = useState<UserRow[]>([]);
  const [form, setForm] = useState<UserCreateDto>({
    email: '', name: '', password: '',
    role: 'BOX_AGENT', office: '', boxNumber: 1,
  });

  async function load() {
    const { data } = await api.get<UserRow[]>('/users');
    setList(data);
  }
  useEffect(() => { load(); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/users', form);
    setForm({ email: '', name: '', password: '', role: 'BOX_AGENT', office: '', boxNumber: 1 });
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Administración de Usuarios</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Email"
               value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
        <input className="border rounded px-3 py-2" placeholder="Nombre"
               value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
        <input className="border rounded px-3 py-2" placeholder="Password"
               value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>
        <select className="border rounded px-3 py-2"
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value as any})}>
          <option value="BOX_AGENT">BOX_AGENT</option>
          <option value="PSYCHO_AGENT">PSYCHO_AGENT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input className="border rounded px-3 py-2" placeholder="Oficina (opcional)"
               value={form.office ?? ''} onChange={e => setForm({...form, office: e.target.value})}/>
        <input className="border rounded px-3 py-2 w-28" placeholder="Box #"
               type="number" value={form.boxNumber ?? 1}
               onChange={e => setForm({...form, boxNumber: Number(e.target.value)})}/>
        <button className="ml-auto px-4 py-2 bg-black text-white rounded">Crear</button>
      </form>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Nombre</th>
              <th className="py-2 px-3">Rol</th>
              <th className="py-2 px-3">Oficina</th>
              <th className="py-2 px-3">Box</th>
              <th className="py-2 px-3">Creado</th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="border-t">
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3">{u.name}</td>
                <td className="py-2 px-3">{u.role}</td>
                <td className="py-2 px-3">{u.office ?? '—'}</td>
                <td className="py-2 px-3">{u.boxNumber ?? '—'}</td>
                <td className="py-2 px-3">{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="py-6 text-center text-gray-500" colSpan={6}>Sin usuarios</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
