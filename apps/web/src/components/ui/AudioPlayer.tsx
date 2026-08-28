'use client';

import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { GaugeIcon } from '@/components/icons/GaugeIcon';
import { PauseIcon } from '@/components/icons/PauseIcon';
import { PlayIcon } from '@/components/icons/PlayIcon';

const WAVEFORM_BAR_COUNT = 40;
const WAVEFORM_HEIGHTS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
  const wave = Math.sin(i / 3) * 0.5 + Math.sin(i / 7) * 0.5;
  return Number((20 + Math.abs(wave) * 80).toFixed(2));
});

/**
 * Аудио-плеер (см. .pen «Составные блоки», Player) — презентационная оболочка,
 * без подключения к реальному источнику звука.
 */
export function AudioPlayer({
  playing,
  onTogglePlay,
  elapsed,
  total,
  speedLabel,
  progress,
  onDownload,
}: {
  playing: boolean;
  onTogglePlay: () => void;
  elapsed: string;
  total: string;
  speedLabel: string;
  progress: number;
  onDownload?: () => void;
}) {
  const activeBars = Math.round(progress * WAVEFORM_BAR_COUNT);

  return (
    <div className="flex h-16 w-full items-center gap-3.5 rounded-block bg-sidebar px-3.5">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sidebar"
      >
        {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      </button>
      <span className="shrink-0 text-meta text-sidebar-foreground">{elapsed}</span>
      <div className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden">
        {WAVEFORM_HEIGHTS.map((height, i) => (
          <span
            key={i}
            className={`w-[2px] shrink-0 rounded-full ${i < activeBars ? 'bg-accent' : 'bg-panel-tertiary'}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-meta text-sidebar-foreground">{total}</span>
      <span className="flex shrink-0 items-center gap-1 text-label text-sidebar-foreground">
        <GaugeIcon width={14} height={14} />
        {speedLabel}
      </span>
      {onDownload ? (
        <button
          type="button"
          onClick={onDownload}
          aria-label="Скачать запись"
          className="flex size-6 shrink-0 items-center justify-center text-sidebar-foreground"
        >
          <DownloadIcon width={16} height={16} />
        </button>
      ) : null}
    </div>
  );
}
