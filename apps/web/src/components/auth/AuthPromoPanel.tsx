import { BrandIcon } from '@/components/BrandIcon';
import { ListChecksIcon } from '@/components/icons/ListChecksIcon';
import { MicIcon } from '@/components/icons/MicIcon';
import { SparklesIcon } from '@/components/icons/SparklesIcon';

const FEATURES: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <MicIcon width={18} height={18} />,
    title: 'Запись и расшифровка',
    desc: 'Whisper переводит mp4 и mp3 в текст по спикерам',
  },
  {
    icon: <SparklesIcon width={18} height={18} />,
    title: 'Итоги и решения',
    desc: 'Claude собирает краткое содержание и ключевые моменты',
  },
  {
    icon: <ListChecksIcon width={18} height={18} />,
    title: 'Задачи из разговора',
    desc: 'Договорённости превращаются в задачи с исполнителями',
  },
];

/**
 * Промо-панель экранов авторизации — общая для /auth/register и /auth/login
 * (см. design/VideoMeeting.pen, node q8oK3 «Auth 1 — Регистрация» и node xq4Z4
 * «Auth 2 — Вход»: одинаковые Promo Panel, различается только заголовок-питч).
 */
export function AuthPromoPanel({
  headline,
  sub,
  className = '',
}: {
  headline: string;
  sub: string;
  className?: string;
}) {
  return (
    <div className={`flex-col justify-between gap-10 bg-sidebar p-16 ${className}`}>
      <div className="flex items-center gap-3">
        <BrandIcon size="sm" />
        <span className="text-heading-m text-white">Видеовстречи</span>
      </div>

      <div className="flex max-w-[560px] flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-[44px] leading-[1.1] font-bold tracking-[-1.6px] text-white">
            {headline}
          </h1>
          <p className="max-w-[520px] text-[15px] text-sidebar-foreground">{sub}</p>
        </div>

        <div className="flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-start gap-3.5">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-block bg-panel-secondary text-white">
                {feature.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-heading-s text-white">{feature.title}</span>
                <span className="text-body-s text-sidebar-foreground">{feature.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-card bg-panel-secondary p-5">
        <div className="flex flex-col">
          <span className="text-heading-m text-white">5 часов</span>
          <span className="text-meta text-sidebar-foreground">в неделю</span>
        </div>
        <span aria-hidden="true" className="h-[38px] w-px bg-[#2a303a]" />
        <span className="text-label text-[#b4bcc7]">
          столько команда экономит на заметках и пересказах встреч
        </span>
      </div>
    </div>
  );
}
