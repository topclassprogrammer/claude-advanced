/** Пункт навигации сайдбара (см. .pen «Ввод и навигация», ПУНКТ НАВИГАЦИИ). */
export function NavItem({
  icon,
  label,
  active = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 ${
        active ? 'bg-[#1b2029]' : 'bg-transparent'
      }`}
    >
      <span className={active ? 'text-white' : 'text-text-tertiary'}>{icon}</span>
      <span
        className={`flex-1 truncate text-body-s ${
          active ? 'font-semibold text-white' : 'text-[#b4bcc7]'
        }`}
      >
        {label}
      </span>
      {badge && (
        <span className="shrink-0 rounded-full bg-panel-secondary px-1.5 py-0.5 text-label text-accent">
          {badge}
        </span>
      )}
    </div>
  );
}
