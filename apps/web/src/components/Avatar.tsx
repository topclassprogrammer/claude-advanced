'use client';

import { useEffect, useState } from 'react';
import { getAvatarObjectUrl } from '@/lib/profile-api';

const SIZE_CLASSES = {
  sm: 'size-8 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
} as const;

export function Avatar({
  token,
  avatarUrl,
  name,
  size = 'md',
}: {
  token: string;
  avatarUrl: string | null;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    getAvatarObjectUrl(token)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setObjectUrl(url);
      })
      .catch(() => {
        // Заглушка остаётся, если аватар не удалось загрузить.
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [token, avatarUrl]);

  const sizeClass = SIZE_CLASSES[size];

  if (objectUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={objectUrl}
        alt={`Аватар пользователя ${name}`}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      data-testid="avatar-placeholder"
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
