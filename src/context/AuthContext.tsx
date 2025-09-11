// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { UserMe } from "@/types";
import { loginApi } from "@/lib/api";

type AuthCtx = {
  token: string | null;
  me: UserMe | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );

  const me = useMemo<UserMe | null>(() => {
    if (!token) return null;
    try {
      return jwtDecode<UserMe>(token);
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  async function login(email: string, password: string) {
    const { accessToken } = await loginApi(email, password);
    setToken(accessToken);
  }

  function logout() {
    setToken(null);
  }

  return (
    <Ctx.Provider value={{ token, me, login, logout }}>{children}</Ctx.Provider>
  );
}
