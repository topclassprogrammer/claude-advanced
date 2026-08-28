/**
 * Каркас экрана (см. .pen «Каркас экрана»): несворачиваемый тёмный сайдбар
 * 248px + топбар 64px + рабочая область. Не применяется к текущим маршрутам —
 * заготовка для будущих экранов.
 */
export function AppShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-[248px] shrink-0 flex-col gap-1 bg-sidebar p-2.5">{sidebar}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-6">
          {topbar}
        </header>
        <main className="flex-1 overflow-auto px-6 pt-5 pb-6">{children}</main>
      </div>
    </div>
  );
}
