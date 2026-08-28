'use client';

/** Сегментированный контрол (см. .pen «Ввод и навигация», СЕГМЕНТИРОВАННЫЙ КОНТРОЛ). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-block bg-[#ebedf1] p-0.5">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-[7px] px-3 py-1.5 text-label transition-colors ${
              isActive ? 'bg-surface text-foreground shadow-sm' : 'text-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
