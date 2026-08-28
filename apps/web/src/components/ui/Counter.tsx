/** Счётчик-пилюля (см. .pen «Статус и идентичность», БЕЙДЖИ И СЧЁТЧИКИ — Counter). */
export function Counter({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-label text-accent-foreground">
      {children}
    </span>
  );
}
