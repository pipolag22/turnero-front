import styles from './TVBoard.module.css';

export function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className={styles.block}>
      <div className={styles.bt}>{titulo}</div>
      {children}
    </div>
  );
}