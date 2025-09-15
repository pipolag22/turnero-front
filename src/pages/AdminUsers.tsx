// src/pages/AdminUsers.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersApi } from "@/lib/api";
import type { Role } from "@/types";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  boxNumber: number | null;
};

const ROLES: Role[] = ["ADMIN", "BOX_AGENT", "PSYCHO_AGENT"];

export default function AdminUsers() {
  const nav = useNavigate();
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Crear nuevo
  const [nEmail, setNEmail] = useState("");
  const [nName, setNName] = useState("");
  const [nPass, setNPass] = useState("");
  const [nRole, setNRole] = useState<Role>("BOX_AGENT");
  const [nBox, setNBox] = useState<number | "">(1);

  async function load() {
    setLoading(true);
    try {
      const data = await UsersApi.list();
      setList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!nEmail.trim() || !nName.trim() || !nPass.trim()) return;
    await UsersApi.create({
      email: nEmail.trim(),
      name: nName.trim(),
      password: nPass,
      role: nRole,
      boxNumber: nRole === "BOX_AGENT" ? Number(nBox) || null : null,
    });
    setNEmail(""); setNName(""); setNPass("");
    setNRole("BOX_AGENT"); setNBox(1);
    await load();
  }

  async function save(u: User) {
    await UsersApi.update(u.id, {
      name: u.name,
      role: u.role,
      boxNumber: u.role === "BOX_AGENT" ? (u.boxNumber ?? null) : null,
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar usuario?")) return;
    await UsersApi.remove(id);
    await load();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Administración de usuarios</h1>
        <div className="ml-auto">
          <button
            onClick={() => nav("/admin")}
            className="px-3 py-2 rounded bg-slate-700 text-white"
          >
            ← Volver a Administración
          </button>
        </div>
      </div>

      {/* Crear */}
      <div className="border rounded p-3 mb-6">
        <h2 className="font-semibold mb-3">Crear usuario</h2>
        <div className="grid grid-cols-5 gap-2 items-center">
          <input className="border rounded px-2 py-1" placeholder="Email"
            value={nEmail} onChange={(e) => setNEmail(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Nombre"
            value={nName} onChange={(e) => setNName(e.target.value)} />
          <input type="password" className="border rounded px-2 py-1" placeholder="Password"
            value={nPass} onChange={(e) => setNPass(e.target.value)} />
          <select className="border rounded px-2 py-1"
            value={nRole} onChange={(e) => setNRole(e.target.value as Role)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="border rounded px-2 py-1" placeholder="Box #"
            value={nBox} onChange={(e) => setNBox(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={nRole !== "BOX_AGENT"} />
        </div>
        <div className="mt-3">
          <button onClick={create} className="px-3 py-2 rounded bg-blue-600 text-white">Crear</button>
        </div>
      </div>

      {/* Lista */}
      <div className="border rounded p-3">
        <h2 className="font-semibold mb-3">Usuarios existentes</h2>
        {loading ? (
          <div>Cargando…</div>
        ) : list.length === 0 ? (
          <div className="italic opacity-60">— vacío —</div>
        ) : (
          <div className="space-y-3">
            {list.map((u) => (
              <div key={u.id} className="grid grid-cols-6 gap-2 items-center">
                <div className="truncate">{u.email}</div>
                <input
                  className="border rounded px-2 py-1"
                  value={u.name || ""}
                  onChange={(e) => setList(prev => prev.map(p => p.id === u.id ? { ...p, name: e.target.value } : p))}
                />
                <select
                  className="border rounded px-2 py-1"
                  value={u.role}
                  onChange={(e) => setList(prev => prev.map(p => p.id === u.id ? { ...p, role: e.target.value as Role } : p))}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Box #"
                  value={u.boxNumber ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setList(prev => prev.map(p => p.id === u.id ? { ...p, boxNumber: v as any } : p));
                  }}
                  disabled={u.role !== "BOX_AGENT"}
                />
                <button onClick={() => save(u)} className="px-3 py-2 rounded bg-emerald-600 text-white">
                  Guardar
                </button>
                <button onClick={() => remove(u.id)} className="px-3 py-2 rounded bg-rose-600 text-white">
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
