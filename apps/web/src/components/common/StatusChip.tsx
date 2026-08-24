'use client';

import { Chip } from '@heroui/react';

/** Общий статус процесса транскрибации/генерации выжимки (одинаковый набор значений у обоих). */
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const STATUS_LABEL: Record<ProcessingStatus, string> = {
  PENDING: 'В процессе',
  PROCESSING: 'В процессе',
  COMPLETED: 'Готово',
  FAILED: 'Ошибка',
};

const STATUS_COLOR: Record<ProcessingStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
};

/** Статус-чип HeroUI для транскрипта/выжимки файла встречи — используется в FileCard. */
export function StatusChip({
  prefix,
  status,
  testId,
}: {
  prefix: string;
  status: ProcessingStatus;
  testId: string;
}) {
  return (
    <div aria-live="polite">
      <Chip color={STATUS_COLOR[status]} variant="soft" size="sm" data-testid={testId}>
        {prefix}: {STATUS_LABEL[status]}
      </Chip>
    </div>
  );
}
