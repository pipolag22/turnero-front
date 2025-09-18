// Decodifica un JWT sin verificar firma (solo para leer claims en el cliente)
export type DecodedJwt = {
  sub?: string;
  role?: string;
  roles?: string[];   // a veces viene como array
  boxNumber?: number; // si lo incluyes en el token
  [k: string]: any;
};

export function decodeJwt(token: string | null): DecodedJwt | null {
  try {
    if (!token) return null;
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
