import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav('/'); // vuelve a inicio
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'Error de login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Iniciar sesión</h1>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <label className="block text-sm font-medium">Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="w-full border rounded px-3 py-2 mb-3" />

        <label className="block text-sm font-medium">Password</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="w-full border rounded px-3 py-2 mb-4" />

        <button disabled={loading} className="w-full bg-black text-white rounded py-2">
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="text-xs text-gray-500 mt-3">
          Tip: admin@demo.local / admin123
        </p>
      </form>
    </div>
  );
}
