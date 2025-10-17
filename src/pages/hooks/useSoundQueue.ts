import { useRef } from 'react';

// Helper para esperar un tiempo determinado
function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function useSoundQueue(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const dingPending = useRef(0);
  const dingPlaying = useRef(false);
  const lastEnqueueAt = useRef(0);

  // Reproduce el sonido una vez
  const playOnce = (): Promise<void> => {
    return new Promise((resolve) => {
      const a = audioRef.current;
      if (!a) return resolve();
      
      const onEnd = () => {
        a.removeEventListener("ended", onEnd);
        resolve();
      };

      a.currentTime = 0;
      a.volume = 1;
      a.play()
        .then(() => a.addEventListener("ended", onEnd))
        .catch(() => setTimeout(resolve, 1200)); // Si el navegador bloquea, no trabar la cola
    });
  }

  // Bucle que reproduce los sonidos en cola
  const runDingLoop = async () => {
    dingPlaying.current = true;
    while (dingPending.current > 0) {
      dingPending.current--; 
      await playOnce();
      await wait(200);
      await playOnce();
      await wait(300);
    }
    dingPlaying.current = false;
  }

  // Función para agregar un sonido a la cola
  const enqueueDing = () => {
    const now = Date.now();
    // Ignorar eventos demasiado seguidos para no saturar
    if (now - lastEnqueueAt.current < 500) return;
    lastEnqueueAt.current = now;

    dingPending.current = Math.min(dingPending.current + 1, 3); 
    if (!dingPlaying.current) runDingLoop();
  }

  return { enqueueDing };
}