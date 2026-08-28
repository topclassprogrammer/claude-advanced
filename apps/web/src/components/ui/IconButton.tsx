'use client';

import { Button } from '@heroui/react';
import type { ComponentProps } from 'react';

const SIZE_CLASSES = {
  36: 'size-9',
  28: 'size-7',
} as const;

const TONE_CLASSES = {
  default: 'border border-border bg-surface text-muted',
  dark: 'border-0 bg-panel-tertiary text-[#d6dbe2]',
  danger: 'border border-border bg-surface text-danger',
} as const;

/** Иконочная кнопка (см. .pen «Кнопки и действия», ИКОНОЧНЫЕ · 36 / 28 PX). */
export function IconButton({
  size = 36,
  tone = 'default',
  className = '',
  ...props
}: {
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof TONE_CLASSES;
} & Omit<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Button
      variant="ghost"
      className={`!rounded-control p-0 ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
