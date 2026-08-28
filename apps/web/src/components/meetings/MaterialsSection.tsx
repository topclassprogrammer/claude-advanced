import type { MeetingFile } from '@/lib/meeting-file-api';
import { FileCard } from '@/components/FileCard';
import { FileUploadForm } from '@/components/FileUploadForm';
import { PaperclipIcon } from '@/components/icons/PaperclipIcon';

/**
 * Материалы встречи — существующие `FileCard`/`FileUploadForm` (compact,
 * без собственной обёртки Card) внутри карточки в стиле макета (см. .pen
 * node o5xFBj, «Materials Card»). Единственное место на экране, где рендерится
 * FileCard — общий для боковой колонки вкладки «Обзор» и вкладки «Материалы».
 */
export function MaterialsSection({
  meetingId,
  files,
  canDelete,
  onDownload,
  onDelete,
  onUploaded,
}: {
  meetingId: string;
  files: MeetingFile[];
  canDelete: boolean;
  onDownload: (file: MeetingFile) => Promise<void>;
  onDelete: (file: MeetingFile) => Promise<void>;
  onUploaded: (file: MeetingFile) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <PaperclipIcon width={16} height={16} className="text-muted" />
        <span className="text-heading-s text-foreground">Материалы</span>
        <span className="text-meta text-muted">{files.length}</span>
      </div>

      {files.length === 0 ? (
        <p className="text-body-s text-muted">К этой встрече файлы не прикреплены.</p>
      ) : (
        <FileCard files={files} canDelete={canDelete} onDownload={onDownload} onDelete={onDelete} compact />
      )}

      <FileUploadForm meetingId={meetingId} filesCount={files.length} onUploaded={onUploaded} compact />
    </div>
  );
}
