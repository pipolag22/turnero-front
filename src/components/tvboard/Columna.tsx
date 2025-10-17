import type { Etapa } from "@/types";
import styles from './TVBoard.module.css';

export function Columna({ etapa, titulo, children }: { etapa: Etapa; titulo: string; children: React.ReactNode; }) {
  return (
    <section className={styles.col}>
      <div className={styles.header}>
        <div className={styles.et}>{etapa}</div>
        <div className={styles.ti}>{titulo}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}