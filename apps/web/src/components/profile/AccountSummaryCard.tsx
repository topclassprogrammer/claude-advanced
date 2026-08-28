import type { Profile } from '@/lib/profile-api';
import { Avatar } from '@/components/Avatar';
import { ShieldCheckIcon } from '@/components/icons/ShieldCheckIcon';
import { SettingsCard } from './SettingsCard';
import { UserRoundIcon } from '@/components/icons/UserRoundIcon';

function Stat({
  value,
  label,
  disabled,
}: {
  value: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-0.5 ${disabled ? 'opacity-40' : ''}`}
      title={disabled ? 'Скоро' : undefined}
    >
      <span className="text-heading-m text-foreground">{value}</span>
      <span className="text-meta text-muted">{label}</span>
    </div>
  );
}

/**
 * Сводная карточка «Аккаунт» (см. .pen node OHLRU «Card — Аккаунт»): аватар,
 * имя/email, роль и три показателя. «Встреч» — реальное число (длина списка
 * GET /meetings), «Записи»/«Хранилище» задизейблены — отдельного понятия
 * записей и квоты хранилища в API нет (см. AppSidebar).
 */
export function AccountSummaryCard({
  profile,
  meetingsCount,
  avatarVersion,
}: {
  profile: Profile;
  meetingsCount: number | null;
  /** Меняется при загрузке/удалении аватара, чтобы форсировать перерисовку Avatar (см. Avatar.tsx). */
  avatarVersion?: number;
}) {
  return (
    <SettingsCard icon={<UserRoundIcon width={15} height={15} />} title="Учётная запись">
      <div className="flex flex-col items-center gap-3">
        <Avatar
          key={`${profile.avatarUrl}-${avatarVersion}`}
          avatarUrl={profile.avatarUrl}
          name={profile.name}
          size="lg"
        />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-heading-m text-foreground">{profile.name}</span>
          <span className="text-body-s text-muted">{profile.email}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-chip bg-accent-soft px-2.5 py-1 text-label text-accent">
          <ShieldCheckIcon width={13} height={13} />
          Организатор встреч
        </span>
      </div>

      <div className="border-t border-border" />

      <div className="flex w-full">
        <Stat value={meetingsCount === null ? '—' : String(meetingsCount)} label="Встреч" />
        <Stat value="—" label="Записи" disabled />
        <Stat value="—" label="Хранилище" disabled />
      </div>
    </SettingsCard>
  );
}
