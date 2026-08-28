import { getFileIcon } from '@/lib/file-icon';

/**
 * Строка файла (см. .pen «Составные блоки», СТРОКА ФАЙЛА).
 * Презентационный компонент — заготовка компактной вёрстки файла, отличной
 * от текущей детальной строки в `FileCard.tsx`.
 */
export function FileRow({
  name,
  meta,
  mimeType,
}: {
  name: string;
  meta: string;
  mimeType: string;
}) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-block border border-border bg-surface p-2.5">
      <span className="shrink-0 text-muted">{getFileIcon(mimeType, { width: 18, height: 18 })}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-s font-medium text-foreground">{name}</span>
        <span className="text-meta text-muted">{meta}</span>
      </div>
    </div>
  );
}
