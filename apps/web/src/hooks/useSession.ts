'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  dedupedRefresh,
  getAccessToken,
  getCurrentUser,
  logout as logoutRequest,
} from '@/lib/auth-api';

export type Session = {
  email: string;
  userId: string;
};

export function useSession(): { session: Session | null; logout: () => void } {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // После полной перезагрузки страницы access-токен в памяти теряется —
      // сначала молча восстанавливаем его по httpOnly refresh-куке. Если
      // токен уже есть (SPA-переход сразу после логина/регистрации),
      // лишний round-trip не нужен.
      if (!getAccessToken()) {
        const refreshed = await dedupedRefresh();
        if (!refreshed) {
          if (!cancelled) router.replace('/auth/login');
          return;
        }
      }

      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        setSession({ email: user.email, userId: user.sub });
      } catch {
        if (!cancelled) router.replace('/auth/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = () => {
    void logoutRequest().finally(() => router.replace('/auth/login'));
  };

  return { session, logout };
}
