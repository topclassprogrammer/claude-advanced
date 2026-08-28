/** Бейдж (см. .pen «Статус и идентичность», БЕЙДЖИ И СЧЁТЧИКИ — Team/AI). */
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-chip bg-accent-soft px-2 py-0.5 text-label text-accent-soft-foreground">
      {children}
    </span>
  );
}
