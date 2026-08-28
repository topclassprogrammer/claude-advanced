import type { MeetingFile } from '@/lib/meeting-file-api';
import { StatusChip } from '@/components/common/StatusChip';
import { MaterialsSection } from '@/components/meetings/MaterialsSection';
import { ListChecksIcon } from '@/components/icons/ListChecksIcon';
import { MicIcon } from '@/components/icons/MicIcon';
import { SparklesIcon } from '@/components/icons/SparklesIcon';

/**
 * Тело вкладки «Обзор» (см. .pen node o5xFBj, Body Main/Body Side): превью
 * выжимки и транскрипта в основной колонке, задачи (задизейблено) и материалы
 * в боковой. Полные транскрипт/выжимка — во вкладке «Транскрипт»/через
 * дисклоужер в «Материалы» (см. FileCard) — здесь только превью без
 * фабрикации структуры (в макете «ключевые моменты» с таймкодами, которых
 * нет в реальных данных Whisper/Claude).
 */
export function MeetingOverviewBody({
  meetingId,
  files,
  canDelete,
  onDownload,
  onDelete,
  onUploaded,
  onShowFullTranscript,
}: {
  meetingId: string;
  files: MeetingFile[];
  canDelete: boolean;
  onDownload: (file: MeetingFile) => Promise<void>;
  onDelete: (file: MeetingFile) => Promise<void>;
  onUploaded: (file: MeetingFile) => void;
  onShowFullTranscript: () => void;
}) {
  const summaryFile = files.find((file) => file.summary);
  const transcriptFile = files.find((file) => file.transcription);

  return (
    <div className="flex gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {summaryFile?.summary ? (
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-chip bg-accent-soft text-accent">
                <SparklesIcon width={14} height={14} />
              </span>
              <span className="text-heading-s text-foreground">Итоги</span>
              <StatusChip
                prefix="Выжимка"
                status={summaryFile.summary.status}
                testId="overview-summary-status-chip"
              />
            </div>
            {summaryFile.summary.summary ? (
              <p className="text-body-s text-foreground">{summaryFile.summary.summary}</p>
            ) : (
              <p className="text-body-s text-muted">Выжимка ещё готовится.</p>
            )}
          </div>
        ) : null}

        {transcriptFile?.transcription ? (
          <div className="flex flex-1 flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-chip bg-default text-muted">
                <MicIcon width={14} height={14} />
              </span>
              <span className="text-heading-s text-foreground">Транскрипт</span>
              <StatusChip
                prefix="Транскрипт"
                status={transcriptFile.transcription.status}
                testId="overview-transcription-status-chip"
              />
            </div>
            {transcriptFile.transcription.text ? (
              <>
                <p className="line-clamp-4 text-body-s text-muted">
                  {transcriptFile.transcription.text}
                </p>
                <button
                  type="button"
                  onClick={onShowFullTranscript}
                  className="self-start text-label text-accent hover:underline"
                >
                  Показать всё
                </button>
              </>
            ) : (
              <p className="text-body-s text-muted">Транскрипт ещё готовится.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex w-[296px] shrink-0 flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 opacity-60">
          <div className="flex items-center gap-2">
            <ListChecksIcon width={16} height={16} className="text-muted" />
            <span className="text-heading-s text-foreground">Задачи</span>
          </div>
          <p className="text-body-s text-muted">Появятся здесь, когда функциональность будет готова.</p>
        </div>

        <MaterialsSection
          meetingId={meetingId}
          files={files}
          canDelete={canDelete}
          onDownload={onDownload}
          onDelete={onDelete}
          onUploaded={onUploaded}
        />
      </div>
    </div>
  );
}
