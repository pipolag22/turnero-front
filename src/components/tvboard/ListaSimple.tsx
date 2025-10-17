import type { Turno } from "@/types";
import styles from './TVBoard.module.css';

export function ListaSimple({ items }: { items: Turno[] }) {
  return (
    <ul className={styles.list}>
      {items.slice(0, 10).map((t) => (
        <li key={t.id} className={styles.pill}>{t.nombre?.trim() || "—"}</li>
      ))}
      {items.length === 0 && <li className={`${styles.pill} ${styles.empty}`}>— vacío —</li>}
    </ul>
  );
}