import { useState, useEffect } from 'react';

export function useClock() {
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );

  useEffect(() => {
    const clockId = setInterval(() => {
      setClock(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 1000);

    return () => clearInterval(clockId);
  }, []);

  return clock;
}