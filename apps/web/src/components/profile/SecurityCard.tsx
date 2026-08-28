import { LockKeyholeIcon } from '@/components/icons/LockKeyholeIcon';
import { MonitorSmartphoneIcon } from '@/components/icons/MonitorSmartphoneIcon';
import { ShieldPlusIcon } from '@/components/icons/ShieldPlusIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { SettingsCard } from './SettingsCard';

function SecurityRow({
  title,
  subtitle,
  actionIcon,
  actionLabel,
  danger,
}: {
  title: string;
  subtitle: string;
  actionIcon: React.ReactNode;
  actionLabel: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body-s font-medium text-foreground">{title}</span>
        <span className="truncate text-meta text-muted">{subtitle}</span>
      </div>
      <button
        type="button"
        disabled
        title="Скоро"
        className={`flex shrink-0 items-center gap-1.5 rounded-control border border-border px-3 py-2 text-label opacity-50 ${
          danger ? 'text-danger' : 'text-muted'
        }`}
      >
        {actionIcon}
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Карточка «Безопасность» (см. .pen node qUYIR «Card — Безопасность»). Все три
 * действия задизейблены — двухфакторной аутентификации, списка активных сессий
 * и удаления аккаунта в API нет (см. apps/api/CLAUDE.md).
 */
export function SecurityCard() {
  return (
    <SettingsCard icon={<LockKeyholeIcon width={14} height={14} />} title="Безопасность">
      <div className="flex flex-col divide-y divide-border">
        <SecurityRow
          title="Двухфакторная аутентификация"
          subtitle="Дополнительная защита при входе"
          actionIcon={<ShieldPlusIcon width={14} height={14} />}
          actionLabel="Включить"
        />
        <SecurityRow
          title="Активные сессии"
          subtitle="Список устройств пока недоступен"
          actionIcon={<MonitorSmartphoneIcon width={14} height={14} />}
          actionLabel="Показать"
        />
        <SecurityRow
          title="Удаление аккаунта"
          subtitle="Действие необратимо"
          actionIcon={<TrashIcon width={14} height={14} />}
          actionLabel="Удалить"
          danger
        />
      </div>
    </SettingsCard>
  );
}
