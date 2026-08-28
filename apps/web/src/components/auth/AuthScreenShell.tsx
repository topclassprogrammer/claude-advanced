import { BrandIcon } from '@/components/BrandIcon';
import { AuthPromoPanel } from '@/components/auth/AuthPromoPanel';

/**
 * Каркас экранов авторизации: тёмная промо-панель + белая панель с формой
 * (см. design/VideoMeeting.pen, node q8oK3 «Auth 1 — Регистрация» и node
 * xq4Z4 «Auth 2 — Вход»). Промо-панель (и единственный на этих экранах
 * логотип) скрыта на узких экранах — вместо неё компактный бренд-хедер
 * над формой.
 */
export function AuthScreenShell({
  promoHeadline,
  promoSub,
  children,
}: {
  promoHeadline: string;
  promoSub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      <AuthPromoPanel
        headline={promoHeadline}
        sub={promoSub}
        className="hidden lg:flex lg:w-[45%] lg:min-w-[480px]"
      />
      <div className="flex flex-1 flex-col items-center gap-8 p-6 pt-10 sm:p-12 lg:w-[620px] lg:flex-none lg:justify-center lg:gap-0 lg:p-16 lg:pt-16">
        <div className="flex items-center gap-3 self-start lg:hidden">
          <BrandIcon size="sm" />
          <span className="text-heading-m text-foreground">Видеовстречи</span>
        </div>
        <div className="flex w-full max-w-[400px] flex-1 flex-col justify-center gap-[26px] lg:flex-none">
          {children}
        </div>
      </div>
    </div>
  );
}
