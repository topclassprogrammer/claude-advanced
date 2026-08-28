const TONE_CLASSES = {
  empty: 'border border-border bg-surface',
  processing: 'bg-warning-soft',
  error: 'bg-danger-soft',
} as const;

const TEXT_TONE_CLASSES = {
  empty: 'text-muted',
  processing: 'text-warning-soft-foreground',
  error: 'text-danger-soft-foreground',
} as const;

/** Состояние данных: пусто / в обработке / ошибка (см. .pen «Составные блоки», СОСТОЯНИЯ ДАННЫХ). */
export function InlineStateBanner({
  tone,
  icon,
  title,
  text,
}: {
  tone: keyof typeof TONE_CLASSES;
  icon?: React.ReactNode;
  title?: string;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-block p-3 ${TONE_CLASSES[tone]} ${TEXT_TONE_CLASSES[tone]}`}
    >
      {icon}
      <div className="flex flex-col gap-0.5">
        {title && <span className="text-heading-s text-foreground">{title}</span>}
        <span className="text-body-s">{text}</span>
      </div>
    </div>
  );
}
