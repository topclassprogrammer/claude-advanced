# apps/web

Фронтенд на Next.js 16 (App Router) + React 19 + TypeScript. Пока в стартовом шаблонном состоянии `create-next-app` — страница `src/app/page.tsx` содержит дефолтный welcome-контент, реальный UI ещё не реализован.

## Команды (запускать из этой директории или через `--workspace=web` из корня)

```
npm run dev       # dev-сервер (next dev)
npm run build      # продакшн-сборка (next build)
npm run start        # запуск собранного билда (next start)
npm run lint           # eslint
npm run format           # prettier --write .
```

## Структура

```
src/app/
  layout.tsx        — корневой layout, шрифты Geist (next/font/google)
  page.tsx            — главная страница (пока дефолтный шаблон)
  globals.css           — глобальные стили
  page.module.css         — CSS-модуль для page.tsx
public/                    — статические ассеты (svg-иконки)
```

Алиас путей: `@/*` → `src/*` (см. `tsconfig.json`).

## Соглашения

- ESLint — `eslint.config.mjs` (flat config, `eslint-config-next` + `eslint-config-prettier`); Prettier — `.prettierrc`.
- TypeScript strict-режим включён.
- Новые страницы/роуты добавлять по конвенциям App Router (`src/app/**/page.tsx`, `layout.tsx`, `route.ts` и т.д.).
- `next dev` при запуске автогенерирует `AGENTS.md` в этой директории с предупреждением о breaking changes в этой версии Next.js относительно обучающих данных — при работе с API фреймворка сверяться с `node_modules/next/dist/docs/`, а не полагаться на память.

## Поддержка документации в актуальном состоянии

При изменении архитектуры приложения (новая структура роутов/страниц, добавление state-менеджмента, слоя данных/API-клиента, смена ключевых команд или конфигурации Next.js) — обновлять этот файл в том же коммите/PR, где вносится изменение. Если изменение затрагивает и корневой монорепозиторий, обновлять также корневой `CLAUDE.md`.
