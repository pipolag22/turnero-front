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


const ROLES: Role[] = ["ADMIN", "BOX_AGENT", "PSYCHO_AGENT", "CASHIER_AGENT"];

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
      boxNumber: nRole === "BOX_AGENT" ? (nBox === "" ? null : Number(nBox) || null) : null,
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
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="h-16 bg-[#0f1a2a] text-white">
        <div className="h-full max-w-6xl mx-auto px-6 flex items-center gap-3">
          <button
            onClick={() => nav("/admin")}
            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
            title="Volver a Administración"
          >
            ← Volver
          </button>
          <div className="ml-2">
            <div className="font-bold leading-tight">Administración de usuarios</div>
            <div className="text-xs opacity-80">Crear, editar y borrar operadores</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <img
              src="/images/gb_tu_ciudad.svg"
              alt="Granadero Baigorria"
              className="w-8 h-8 rounded-full bg-[#0b2a4a] object-contain"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Crear */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <header className="mb-3">
            <h2 className="text-lg font-bold text-slate-800">Crear usuario</h2>
            <p className="text-sm text-slate-500">Completá los datos y asigná el rol correspondiente.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
            <input
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Email"
              value={nEmail}
              onChange={(e) => setNEmail(e.target.value)}
            />
            <input
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Nombre"
              value={nName}
              onChange={(e) => setNName(e.target.value)}
            />
            <input
              type="password"
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Password"
              value={nPass}
              onChange={(e) => setNPass(e.target.value)}
            />
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={nRole}
              onChange={(e) => setNRole(e.target.value as Role)}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
              placeholder="Box #"
              value={nBox}
              onChange={(e) => setNBox(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={nRole !== "BOX_AGENT"}
            />
          </div>

          <div className="mt-4">
            <button
              onClick={create}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              Crear usuario
            </button>
          </div>
        </section>

        {/* Lista */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <header className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Usuarios existentes</h2>
              <p className="text-sm text-slate-500">Editá nombre/rol/box o eliminá registros.</p>
            </div>
            <button
              onClick={load}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              title="Recargar listado"
            >
              Recargar
            </button>
          </header>

          {loading ? (
            <div className="text-slate-500">Cargando…</div>
          ) : list.length === 0 ? (
            <div className="italic text-slate-400">— vacío —</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px] grid grid-cols-12 gap-2 text-xs uppercase tracking-wide text-slate-500 pb-2 border-b">
                <div className="col-span-4">Email</div>
                <div className="col-span-3">Nombre</div>
                <div className="col-span-2">Rol</div>
                <div className="col-span-1">Box</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              <div className="divide-y">
                {list.map((u) => (
                  <div key={u.id} className="grid grid-cols-12 gap-2 items-center py-3">
                    <div className="col-span-4 truncate">{u.email}</div>

                    <div className="col-span-3">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5"
                        value={u.name || ""}
                        onChange={(e) =>
                          setList(prev => prev.map(p => p.id === u.id ? { ...p, name: e.target.value } : p))
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5"
                        value={u.role}
                        onChange={(e) =>
                          setList(prev => prev.map(p => p.id === u.id ? { ...p, role: e.target.value as Role } : p))
                        }
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <input
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 disabled:opacity-50"
                        placeholder="Box #"
                        value={u.boxNumber ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          setList(prev => prev.map(p => p.id === u.id ? { ...p, boxNumber: v as any } : p));
                        }}
                        disabled={u.role !== "BOX_AGENT"}
                      />
                    </div>

                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => save(u)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => remove(u.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
