import { useEffect, useState } from "react";
import { UsersApi } from "@/lib/api";
import type { Role } from "@/types";

type UserRow = { id: string; email: string; name: string; role: Role; boxNumber: number | null };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "BOX_AGENT" as Role, boxNumber: "" });

  async function load() { setUsers(await UsersApi.list()); }
  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await UsersApi.create({
      email: form.email.trim(),
      name: form.name.trim() || form.email.trim(),
      password: form.password,
      role: form.role,
      boxNumber: form.boxNumber ? Number(form.boxNumber) : null,
    });
    setForm({ email: "", name: "", password: "", role: "BOX_AGENT", boxNumber: "" });
    await load();
  }

  async function saveRow(u: UserRow) {
    await UsersApi.update(u.id, { role: u.role, boxNumber: u.boxNumber });
    await load();
  }

  async function del(u: UserRow) {
    if (!confirm(`Eliminar ${u.email}?`)) return;
    await UsersApi.remove(u.id);
    await load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Usuarios</h1>

      <form onSubmit={onCreate} className="mb-6 grid grid-cols-5 gap-2 items-end">
        <input className="border rounded px-2 py-1" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="border rounded px-2 py-1" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="border rounded px-2 py-1" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
        <select className="border rounded px-2 py-1" value={form.role} onChange={e=>setForm({...form, role: e.target.value as Role})}>
          <option value="ADMIN">ADMIN</option>
          <option value="BOX_AGENT">BOX_AGENT</option>
          <option value="PSYCHO_AGENT">PSYCHO_AGENT</option>
        </select>
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 w-24" placeholder="Box Nº" value={form.boxNumber} onChange={e=>setForm({...form, boxNumber: e.target.value})}/>
          <button className="px-3 py-1 rounded bg-indigo-600 text-white" type="submit">Crear</button>
        </div>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Email</th><th>Nombre</th><th>Rol</th><th>Box Nº</th><th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td>{u.name}</td>
              <td>
                <select value={u.role} onChange={e => setUsers(prev => prev.map(x => x.id===u.id ? {...x, role: e.target.value as Role} : x))}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="BOX_AGENT">BOX_AGENT</option>
                  <option value="PSYCHO_AGENT">PSYCHO_AGENT</option>
                </select>
              </td>
              <td>
                <input
                  className="border rounded px-2 py-1 w-24"
                  type="number"
                  value={u.boxNumber ?? ""}
                  onChange={e => {
                    const v = e.target.value;
                    setUsers(prev => prev.map(x => x.id===u.id ? {...x, boxNumber: v==="" ? null : Number(v)} : x));
                  }}
                />
              </td>
              <td className="space-x-2">
                <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={() => saveRow(u)}>Guardar</button>
                <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={() => del(u)}>Borrar</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && <tr><td className="py-4 opacity-60" colSpan={5}>Sin usuarios</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
