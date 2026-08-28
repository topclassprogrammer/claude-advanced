/** Таймкод (см. .pen «Статус и идентичность», ТАЙМКОД). */
export function TimestampChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-chip bg-surface-secondary px-1.5 py-0.5 text-meta text-muted">
      {children}
    </span>
  );
}
