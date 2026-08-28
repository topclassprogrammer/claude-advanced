import { TimestampChip } from '@/components/ui/TimestampChip';

/** Реплика транскрипта (см. .pen «Составные блоки», РЕПЛИКА ТРАНСКРИПТА). */
export function TranscriptLine({
  speaker,
  speakerColorClassName = 'bg-success',
  timestamp,
  text,
}: {
  speaker: string;
  speakerColorClassName?: string;
  timestamp: string;
  text: string;
}) {
  return (
    <div className="flex w-full items-start gap-2.5">
      <span
        aria-hidden="true"
        className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-label text-white ${speakerColorClassName}`}
      >
        {speaker.charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-label text-foreground">{speaker}</span>
          <TimestampChip>{timestamp}</TimestampChip>
        </div>
        <p className="text-body-s text-muted">{text}</p>
      </div>
    </div>
  );
}
