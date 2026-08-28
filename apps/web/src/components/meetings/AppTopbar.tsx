import type { Meeting } from '@/lib/meeting-api';
import { BrandIcon } from '@/components/BrandIcon';
import { CreateMeetingModal } from '@/components/CreateMeetingModal';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { SlidersIcon } from '@/components/icons/SlidersIcon';
import { BellIcon } from '@/components/icons/BellIcon';
import { UploadIcon } from '@/components/icons/UploadIcon';
import { LogOutIcon } from '@/components/icons/LogOutIcon';

/**
 * Топбар главного экрана (см. .pen node o5xFBj). Поиск/фильтры/уведомления/
 * загрузка задизейблены — глобального поиска, фильтров, уведомлений и
 * загрузки файла без встречи в приложении нет (см. план). На узких экранах,
 * где сайдбар (AppSidebar) скрыт, сюда дублируются его единственные рабочие
 * действия — создание встречи и выход.
 */
export function AppTopbar({
  title,
  subtitle,
  onMeetingCreated,
  onLogout,
}: {
  title: string;
  subtitle?: string;
  onMeetingCreated: (meeting: Meeting) => void;
  onLogout: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2.5 lg:hidden">
        <BrandIcon size="sm" />
      </div>

      <div className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate text-heading-m text-foreground">{title}</span>
        {subtitle ? <span className="truncate text-meta text-muted">{subtitle}</span> : null}
      </div>

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-control border border-border bg-default px-3 py-2 text-muted opacity-60 md:flex">
        <SearchIcon width={15} height={15} />
        <span className="text-body-s">Поиск по встречам</span>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        disabled
        aria-label="Фильтры"
        title="Скоро"
        className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-muted opacity-50"
      >
        <SlidersIcon width={16} height={16} />
      </button>
      <button
        type="button"
        disabled
        aria-label="Уведомления"
        title="Скоро"
        className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-muted opacity-50"
      >
        <BellIcon width={16} height={16} />
      </button>
      <button
        type="button"
        disabled
        title="Скоро"
        className="hidden shrink-0 items-center gap-1.5 rounded-control bg-default px-3 py-2 text-label text-muted opacity-50 sm:flex"
      >
        <UploadIcon width={16} height={16} />
        Загрузить
      </button>

      <CreateMeetingModal onCreated={onMeetingCreated} className="lg:hidden" iconOnly />
      <button
        type="button"
        onClick={onLogout}
        aria-label="Выйти"
        className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-muted lg:hidden"
      >
        <LogOutIcon width={16} height={16} />
      </button>
    </header>
  );
}
