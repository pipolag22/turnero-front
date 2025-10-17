import type { Turno } from "@/types";
import styles from './TVBoard.module.css';

export function ListaConUser({ items, highlight = false }: { items: Turno[]; highlight?: boolean }) {
  return (
    <ul className={styles.list}>
      {items.slice(0, 8).map((t) => (
        <li key={t.id} className={`${styles.pill} ${highlight ? styles.calling : ""}`}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <strong>{t.nombre?.trim() || "—"}</strong>
          </div>
        </li>
      ))}
      {items.length === 0 && <li className={`${styles.pill} ${styles.empty}`}>— vacío —</li>}
    </ul>
  );
}