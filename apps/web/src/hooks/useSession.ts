'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearAccessToken,
  getAccessToken,
  getEmailFromToken,
  getUserIdFromToken,
} from '@/lib/session';

export type Session = {
  token: string;
  email: string | null;
  userId: string | null;
};

export function useSession(): { session: Session | null; logout: () => void } {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    // localStorage — внешнее (browser-only) хранилище, недоступное при SSR,
    // поэтому токен можно прочитать только на клиенте внутри эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      token,
      email: getEmailFromToken(token),
      userId: getUserIdFromToken(token),
    });
  }, [router]);

  const logout = () => {
    clearAccessToken();
    router.replace('/auth/login');
  };

  return { session, logout };
}
