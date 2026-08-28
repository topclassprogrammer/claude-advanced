/** Строка задачи (см. .pen «Составные блоки», СТРОКА ЗАДАЧИ). */
export function TaskRow({
  text,
  assignee,
  done = false,
}: {
  text: string;
  assignee?: string;
  done?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-[9px] border border-border bg-surface p-2">
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${
          done ? 'border-accent bg-accent' : 'border-border-secondary bg-surface'
        }`}
      >
        {done && (
          <svg viewBox="0 0 16 16" width={10} height={10} fill="none" stroke="var(--surface)" strokeWidth={2}>
            <path d="M3 8l3 3 7-7" />
          </svg>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`truncate text-body-s ${done ? 'text-muted line-through' : 'text-foreground'}`}>
          {text}
        </span>
        {assignee && <span className="text-meta text-muted">{assignee}</span>}
      </div>
    </div>
  );
}
