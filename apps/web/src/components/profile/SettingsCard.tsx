import { EllipsisIcon } from '@/components/icons/EllipsisIcon';

/**
 * Карточка настроек профиля (см. design/VideoMeeting.pen, компонент wV0go «Card»,
 * используется на node snVvB «App — Профиль»): иконка + заголовок + опциональное
 * кебаб-действие в шапке, контент — произвольные дети. Кебаб-действие всегда
 * задизейблено — карточкам профиля не нужно контекстное меню, элемент оставлен
 * только для визуального соответствия макету (см. паттерн задизейбленных
 * элементов в AppTopbar/AppSidebar).
 */
export function SettingsCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex w-full items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
          {icon}
        </div>
        <h2 className="min-w-0 flex-1 truncate text-heading-s text-foreground">
          {title}
        </h2>
        <button
          type="button"
          disabled
          aria-label="Действия"
          title="Скоро"
          className="flex size-7 shrink-0 items-center justify-center rounded-control border border-border text-muted opacity-50"
        >
          <EllipsisIcon width={14} height={14} />
        </button>
      </div>

      {children}
    </section>
  );
}
