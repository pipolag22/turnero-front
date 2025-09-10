import { useColaRealtime } from "./hooks/useColaRealtime";


export default function TVBoard() {
  const { snap } = useColaRealtime();
  if (!snap) return null;

  const ahora = snap.nowServing;
  const nextFrom =
    (snap.colas.BOX && snap.colas.BOX[0]) ||
    (snap.colas.PSICO && snap.colas.PSICO[0]) ||
    null;

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-8">
      <div className="text-5xl font-bold">Ahora atendiendo</div>
      <div className="text-7xl">{ahora?.nombre ?? "—"}</div>
      <div className="text-3xl opacity-70">Siguiente: {nextFrom?.nombre ?? "—"}</div>
    </div>
  );
}
