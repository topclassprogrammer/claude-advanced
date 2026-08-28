'use client';

import { useState } from 'react';
import { Button, Chip, ProgressBar } from '@heroui/react';
import { StatusChip } from '@/components/common/StatusChip';
import { AppShell } from '@/components/ui/AppShell';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { Badge } from '@/components/ui/Badge';
import { Counter } from '@/components/ui/Counter';
import { FileRow } from '@/components/ui/FileRow';
import { IconButton } from '@/components/ui/IconButton';
import { InlineStateBanner } from '@/components/ui/InlineStateBanner';
import { MeetingListItem } from '@/components/ui/MeetingListItem';
import { NavItem } from '@/components/ui/NavItem';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusDot } from '@/components/ui/StatusDot';
import { TaskRow } from '@/components/ui/TaskRow';
import { TimestampChip } from '@/components/ui/TimestampChip';
import { TranscriptLine } from '@/components/ui/TranscriptLine';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { UsersIcon } from '@/components/icons/UsersIcon';

const COLOR_SWATCHES: { name: string; className: string }[] = [
  { name: 'background', className: 'bg-background' },
  { name: 'surface', className: 'bg-surface border border-border' },
  { name: 'surface-secondary', className: 'bg-surface-secondary border border-border' },
  { name: 'border', className: 'bg-border' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-soft', className: 'bg-accent-soft' },
  { name: 'success', className: 'bg-success' },
  { name: 'success-soft', className: 'bg-success-soft' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'warning-soft', className: 'bg-warning-soft' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'danger-soft', className: 'bg-danger-soft' },
  { name: 'sidebar', className: 'bg-sidebar' },
];

const TYPE_SCALE: { label: string; className: string; sample: string }[] = [
  { label: 'Display', className: 'text-display', sample: 'Дизайн-система' },
  { label: 'Heading L', className: 'text-heading-l', sample: 'Синк по продукту' },
  { label: 'Heading M', className: 'text-heading-m', sample: 'Все встречи' },
  { label: 'Heading S', className: 'text-heading-s', sample: 'Краткое содержание' },
  { label: 'Body', className: 'text-body', sample: 'Команда подтвердила релиз 2.4 на 3 сентября.' },
  { label: 'Body S', className: 'text-body-s', sample: 'Миграция под вопросом, нужен ревью.' },
  { label: 'Label', className: 'text-label', sample: 'Показать весь транскрипт' },
  { label: 'Meta', className: 'text-meta', sample: '448,6 КБ · 24 авг.' },
  { label: 'Overline', className: 'text-overline', sample: 'КЛЮЧЕВЫЕ МОМЕНТЫ' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-overline text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Витрина дизайн-системы (design/VideoMeeting.pen, node r52SBt) — живая галерея
 * токенов и компонентов. Не требует авторизации, ни на что реальное не влияет.
 */
export default function DesignSystemPage() {
  const [segment, setSegment] = useState<'past' | 'upcoming' | 'drafts'>('past');
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 p-8">
      <h1 className="text-display text-foreground">Design System — Видеовстречи</h1>

      <Section title="Цвет">
        <div className="flex flex-wrap gap-4">
          {COLOR_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex flex-col items-center gap-1.5">
              <div className={`size-14 rounded-block ${swatch.className}`} />
              <span className="text-meta text-muted">{swatch.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((type) => (
            <div key={type.label} className="flex items-baseline gap-4">
              <span className="w-24 shrink-0 text-meta text-muted">{type.label}</span>
              <span className={`${type.className} text-foreground`}>{type.sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Кнопки и действия">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Создать встречу</Button>
          <Button className="button--contrast">Записать</Button>
          <Button variant="outline">Отправить</Button>
          <Button variant="ghost">Отмена</Button>
          <Button variant="danger-soft">Удалить</Button>
          <IconButton aria-label="Удалить">
            <TrashIcon width={16} height={16} />
          </IconButton>
          <IconButton size={28} tone="dark" aria-label="Удалить">
            <TrashIcon width={14} height={14} />
          </IconButton>
          <IconButton tone="danger" aria-label="Удалить">
            <TrashIcon width={16} height={16} />
          </IconButton>
        </div>
      </Section>

      <Section title="Статус и идентичность">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip prefix="Транскрипт" status="COMPLETED" testId="ds-status-chip" />
          <Badge>Команда</Badge>
          <Badge>AI</Badge>
          <Counter>12</Counter>
          <Counter>1 / 3</Counter>
          <StatusDot tone="success" label="обработана" />
          <StatusDot tone="warning" label="в работе" />
          <StatusDot tone="muted" label="нет записи" />
          <TimestampChip>19:38</TimestampChip>
        </div>
      </Section>

      <Section title="Ввод и навигация">
        <div className="flex flex-col gap-4">
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'past', label: 'Прошедшие' },
              { value: 'upcoming', label: 'Предстоящие' },
              { value: 'drafts', label: 'Черновики' },
            ]}
          />
          <div className="max-w-sm rounded-block border border-border bg-surface p-3">
            <ProgressBar value={62} aria-label="Загрузка">
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
              <ProgressBar.Output />
            </ProgressBar>
          </div>
          <div className="flex w-64 flex-col gap-2 rounded-block bg-sidebar p-2.5">
            <NavItem icon={<UsersIcon width={16} height={16} />} label="Участники" active badge={3} />
            <NavItem icon={<UsersIcon width={16} height={16} />} label="Записи" />
          </div>
        </div>
      </Section>

      <Section title="Составные блоки">
        <div className="flex flex-wrap items-start gap-4">
          <MeetingListItem title="Синк по продукту" date="24 авг., 15:00" participantsCount={5} />
          <MeetingListItem title="Ретро спринта" date="26 авг., 11:00" participantsCount={8} selected />
          <div className="flex w-72 flex-col gap-2">
            <FileRow name="meeting-recording.mp4" meta="448,6 КБ · 24 авг." mimeType="video/mp4" />
            <TaskRow text="Подготовить демо" assignee="Мария" />
            <TaskRow text="Согласовать бюджет" done />
          </div>
          <div className="flex w-80 flex-col gap-3 rounded-card border border-border bg-surface p-4">
            <TranscriptLine speaker="Анна" timestamp="04:12" text="Команда подтвердила релиз 2.4 на 3 сентября." />
            <TranscriptLine
              speaker="Максим"
              speakerColorClassName="bg-accent"
              timestamp="04:31"
              text="Миграция под вопросом, нужен ревью."
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <InlineStateBanner tone="empty" title="Файлов нет" text="Загрузите запись встречи, чтобы начать." />
          <InlineStateBanner tone="processing" text="Расшифровываем аудио…" />
          <InlineStateBanner tone="error" text="Не удалось обработать файл." />
        </div>
        <AudioPlayer
          playing={playing}
          onTogglePlay={() => setPlaying((v) => !v)}
          elapsed="04:12"
          total="36:05"
          speedLabel="1×"
          progress={0.3}
        />
      </Section>

      <Section title="Каркас экрана">
        <div className="h-[360px] overflow-hidden rounded-card border border-border">
          <AppShell
            sidebar={
              <>
                <NavItem icon={<UsersIcon width={16} height={16} />} label="Встречи" active />
                <NavItem icon={<UsersIcon width={16} height={16} />} label="Записи" />
              </>
            }
            topbar={<span className="text-heading-m text-foreground">Все встречи</span>}
          >
            <Chip color="accent" variant="soft">
              Рабочая область
            </Chip>
          </AppShell>
        </div>
      </Section>
    </div>
  );
}
