import { UsersIcon } from '@/components/icons/UsersIcon';

/**
 * Строка встречи (см. .pen «Составные блоки», ЭЛЕМЕНТ СПИСКА ВСТРЕЧ).
 * Презентационный компонент — не подключён к реальным данным (см. существующий
 * `home/MeetingRow.tsx`), заготовка для будущей замены вёрстки списка встреч.
 */
export function MeetingListItem({
  title,
  date,
  participantsCount,
  selected = false,
}: {
  title: string;
  date: string;
  participantsCount: number;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex w-80 flex-col gap-2.5 rounded-block border bg-surface p-3.5 ${
        selected ? 'border-accent border-[1.5px] shadow-[0_0_0_3px_var(--accent-soft)]' : 'border-border'
      }`}
    >
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-heading-s text-foreground">{title}</span>
      </div>
      <span className="text-meta text-muted">{date}</span>
      <div className="flex w-full items-center gap-1.5 text-meta text-muted">
        <UsersIcon width={14} height={14} />
        {participantsCount}
      </div>
    </div>
  );
}
