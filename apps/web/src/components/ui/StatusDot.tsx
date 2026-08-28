const TONE_CLASSES = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  muted: 'bg-text-tertiary',
} as const;

/** Точка состояния (см. .pen «Статус и идентичность», ТОЧКИ СОСТОЯНИЯ). */
export function StatusDot({
  tone,
  label,
}: {
  tone: keyof typeof TONE_CLASSES;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-s text-muted">
      <span aria-hidden="true" className={`size-[7px] shrink-0 rounded-full ${TONE_CLASSES[tone]}`} />
      {label}
    </span>
  );
}
