'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { BrandIcon } from '@/components/BrandIcon';
import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { LogOutIcon } from '@/components/icons/LogOutIcon';

/**
 * Топбар страницы профиля (см. .pen node snVvB «App — Профиль», ZXXkT «Title
 * Block»): заголовок/подзаголовок + «На главную»/«Выйти» — в отличие от
 * AppTopbar главного экрана, здесь нет поиска/фильтров/создания встречи.
 */
export function ProfileTopbar({
  subtitle,
  onLogout,
}: {
  subtitle?: string;
  onLogout: () => void;
}) {
  const router = useRouter();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2.5 lg:hidden">
        <BrandIcon size="sm" />
      </div>

      <div className="hidden min-w-0 flex-col lg:flex">
        <h1 className="truncate text-heading-m text-foreground">Профиль</h1>
        {subtitle ? <span className="truncate text-meta text-muted">{subtitle}</span> : null}
      </div>

      <div className="flex-1" />

      <Button variant="outline" onPress={() => router.push('/')}>
        <ArrowLeftIcon width={15} height={15} />
        <span className="hidden sm:inline">На главную</span>
      </Button>
      <Button variant="outline" className="text-danger" onPress={onLogout}>
        <LogOutIcon width={15} height={15} />
        <span className="hidden sm:inline">Выйти</span>
      </Button>
    </header>
  );
}
