import type { Profile } from '@/lib/profile-api';
import { IdCardIcon } from '@/components/icons/IdCardIcon';
import { SettingsCard } from './SettingsCard';

function DataRow({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      title={disabled ? 'Пока недоступно' : undefined}
    >
      <span className="text-body-s text-muted">{label}</span>
      <span
        className={`truncate text-body-s font-medium text-foreground ${disabled ? 'opacity-40' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Карточка «Данные профиля» (см. .pen node dxqdN «Card — Данные»). Роль и email
 * — реальные данные; часовой пояс/дата регистрации/последний вход задизейблены
 * («—») — API не отдаёт эти поля (Profile содержит только email/name/avatarUrl,
 * см. profile-api.ts), в отличие от макета.
 */
export function AccountDataCard({ profile }: { profile: Profile }) {
  return (
    <SettingsCard icon={<IdCardIcon width={14} height={14} />} title="Данные профиля">
      <div className="flex flex-col divide-y divide-border">
        <DataRow label="Email" value={profile.email} />
        <DataRow label="Роль" value="Организатор встреч" />
        <DataRow label="Часовой пояс" value="—" disabled />
        <DataRow label="В системе с" value="—" disabled />
        <DataRow label="Последний вход" value="—" disabled />
      </div>
    </SettingsCard>
  );
}
