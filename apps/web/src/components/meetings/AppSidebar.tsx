'use client';

import type { Meeting } from '@/lib/meeting-api';
import type { Profile } from '@/lib/profile-api';
import { Avatar } from '@/components/Avatar';
import { BrandIcon } from '@/components/BrandIcon';
import { CreateMeetingModal } from '@/components/CreateMeetingModal';
import { NavItem } from '@/components/ui/NavItem';
import { CalendarDaysIcon } from '@/components/icons/CalendarDaysIcon';
import { CircleCheckIcon } from '@/components/icons/CircleCheckIcon';
import { FileTextIcon } from '@/components/icons/FileTextIcon';
import { HardDriveIcon } from '@/components/icons/HardDriveIcon';
import { LogOutIcon } from '@/components/icons/LogOutIcon';
import { MicIcon } from '@/components/icons/MicIcon';
import { UsersIcon } from '@/components/icons/UsersIcon';

/**
 * Тёмный сайдбар главного экрана (см. .pen node o5xFBj «App — Встречи»).
 * Разделы «Записи/Транскрипты/Задачи/Участники» и индикатор хранилища
 * задизейблены — под ними нет бэкенда (см. план и apps/api/CLAUDE.md).
 */
export function AppSidebar({
  email,
  profile,
  avatarVersion,
  onMeetingCreated,
  onLogout,
}: {
  email: string;
  profile: Profile | null;
  /** Меняется при загрузке/удалении аватара на /profile, чтобы форсировать перерисовку Avatar (см. Avatar.tsx). */
  avatarVersion?: number;
  onMeetingCreated: (meeting: Meeting) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="hidden h-full w-[248px] shrink-0 flex-col gap-5 bg-sidebar p-4 lg:flex">
      <div className="flex items-center gap-3 px-1">
        <BrandIcon size="sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body-s font-semibold text-white">Видеовстречи</span>
          <span className="truncate text-meta text-text-tertiary">Рабочее пространство</span>
        </div>
      </div>

      <CreateMeetingModal onCreated={onMeetingCreated} className="w-full justify-center" />

      <nav className="flex flex-col gap-1">
        <span className="px-2.5 pb-1 text-overline text-text-tertiary">Навигация</span>
        <NavItem icon={<CalendarDaysIcon width={16} height={16} />} label="Все встречи" active />
        <NavItem icon={<MicIcon width={16} height={16} />} label="Записи" />
        <NavItem icon={<FileTextIcon width={16} height={16} />} label="Транскрипты" />
        <NavItem icon={<CircleCheckIcon width={16} height={16} />} label="Задачи" />
        <NavItem icon={<UsersIcon width={16} height={16} />} label="Участники" />
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 rounded-block bg-panel-secondary p-3">
        <div className="flex items-center gap-2 text-text-tertiary">
          <HardDriveIcon width={14} height={14} />
          <span className="text-label text-white">Хранилище</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-panel-tertiary">
          <div className="h-full w-0 rounded-full bg-accent" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-[#1e242d] pt-4">
        <Avatar
          key={`${profile?.avatarUrl}-${avatarVersion}`}
          avatarUrl={profile?.avatarUrl ?? null}
          name={profile?.name ?? email}
          size="sm"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-label text-white">{profile?.name}</span>
          <span className="truncate text-meta text-text-tertiary">{email}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Выйти"
          className="shrink-0 text-text-tertiary hover:text-white"
        >
          <LogOutIcon width={16} height={16} />
        </button>
      </div>
    </aside>
  );
}
