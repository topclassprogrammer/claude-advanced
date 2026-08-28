export type DetailTab = 'overview' | 'transcript' | 'materials' | 'participants';

const TABS: { value: DetailTab; label: string }[] = [
  { value: 'overview', label: 'Обзор' },
  { value: 'transcript', label: 'Транскрипт' },
  { value: 'materials', label: 'Материалы' },
  { value: 'participants', label: 'Участники' },
];

/**
 * Таб-бар деталь-колонки (см. .pen node o5xFBj, «Tabs»). «Задачи» задизейблена —
 * у Task нет REST-эндпоинтов (см. план). Использует role="tab"/"tablist", а не
 * обычные кнопки, чтобы не пересекаться по accessible name с триггером
 * дисклоужера «Транскрипт» внутри FileCard (см. e2e meeting-file-transcription.spec.ts).
 */
export function MeetingDetailTabs({
  active,
  onChange,
}: {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-6 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={`border-b-2 pb-2.5 text-label ${
            active === tab.value
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <button
        type="button"
        role="tab"
        aria-disabled="true"
        disabled
        title="Скоро"
        className="border-b-2 border-transparent pb-2.5 text-label text-muted opacity-50"
      >
        Задачи
      </button>
    </div>
  );
}
