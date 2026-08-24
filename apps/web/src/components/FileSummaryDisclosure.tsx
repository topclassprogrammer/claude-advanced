'use client';

import { Disclosure } from '@heroui/react';
import type { MeetingFileSummary } from '@/lib/meeting-file-api';

/** Разворачиваемый блок с содержимым выжимки (summary/пункты действий/решения) — используется в FileCard, когда summary.status COMPLETED. */
export function FileSummaryDisclosure({
  summary,
}: {
  summary: MeetingFileSummary;
}) {
  return (
    <Disclosure.Root className="rounded-xl bg-default px-4">
      <Disclosure.Heading>
        <Disclosure.Trigger>
          Выжимка
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <div className="flex flex-col gap-4">
            {summary.summary ? (
              <p
                className="whitespace-pre-wrap text-sm text-foreground"
                data-testid="summary-text"
              >
                {summary.summary}
              </p>
            ) : null}

            <div>
              <p className="text-sm font-semibold text-foreground">
                Пункты действий
              </p>
              {summary.actionItems.length > 0 ? (
                <ul
                  className="mt-1 list-inside list-disc text-sm text-foreground"
                  data-testid="summary-action-items"
                >
                  {summary.actionItems.map((item, index) => (
                    <li key={index}>
                      {item.text}
                      {item.assignee ? ` — ${item.assignee}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="mt-1 text-sm text-muted"
                  data-testid="summary-action-items-empty"
                >
                  Нет пунктов
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Принятые решения
              </p>
              {summary.decisions.length > 0 ? (
                <ul
                  className="mt-1 list-inside list-disc text-sm text-foreground"
                  data-testid="summary-decisions"
                >
                  {summary.decisions.map((decision, index) => (
                    <li key={index}>{decision}</li>
                  ))}
                </ul>
              ) : (
                <p
                  className="mt-1 text-sm text-muted"
                  data-testid="summary-decisions-empty"
                >
                  Нет пунктов
                </p>
              )}
            </div>
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure.Root>
  );
}
