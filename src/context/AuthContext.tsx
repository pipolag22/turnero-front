import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { UserMe } from "@/types";
import { loginApi } from "@/lib/api";

type AuthCtx = {
  token: string | null;
  me: UserMe | null;
  isLoading: boolean; // <-- NUEVA PROPIEDAD
  login: (email: string, password: string) => Promise<UserMe>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // <-- NUEVO ESTADO

  const me = useMemo<UserMe | null>(() => {
    if (!token) return null;
    try {
      return jwtDecode<UserMe>(token);
    } catch {
      return null;
    }
  }, [token]);

  // Este useEffect se ejecuta UNA SOLA VEZ al iniciar la app
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      }
    } finally {
      // Marcamos que la carga inicial terminó, haya o no token
      setIsLoading(false);
    }
  }, []); // El array vacío [] asegura que solo se ejecute una vez

  // Este useEffect se encarga de guardar el token cuando cambia
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  async function login(email: string, password: string): Promise<UserMe> {
    const { accessToken } = await loginApi(email, password);
    setToken(accessToken);
    const decoded = jwtDecode<UserMe>(accessToken);
    return decoded;
  }

  function logout() {
    try {
      localStorage.removeItem("token");
      sessionStorage.clear();
    } catch {}
    setToken(null);
  }

  return (
    <Ctx.Provider value={{ token, me, isLoading, login, logout }}> {/* <-- AÑADIMOS isLoading */}
      {children}
    </Ctx.Provider>
  );
}