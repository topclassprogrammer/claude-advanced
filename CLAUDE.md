# video-meetings

Монорепозиторий на npm workspaces с двумя приложениями:

- `apps/web` — фронтенд на Next.js (React 19). См. `apps/web/CLAUDE.md`.
- `apps/api` — бэкенд на NestJS. См. `apps/api/CLAUDE.md`.

Оба приложения пока находятся в стартовом шаблонном состоянии (созданы через `create-next-app` и Nest CLI), логика приложения ещё не реализована.

## Команды из корня

Скрипты в корневом `package.json` проксируют команды в отдельные workspace'ы через `npm run <script> --workspace=<name>`:

```
npm run dev:web       # запустить Next.js dev-сервер
npm run dev:api       # запустить NestJS в watch-режиме
npm run build         # собрать оба приложения
npm run build:web
npm run build:api
npm run lint          # линт обоих приложений
npm run lint:web
npm run lint:api
npm run format        # форматирование обоих приложений
npm run format:web
npm run format:api
```

## Структура

```
apps/
  web/   — Next.js (App Router), TypeScript, ESLint, Prettier
  api/   — NestJS, TypeScript, Jest (unit + e2e), ESLint, Prettier
```

## Соглашения

- Каждый workspace устанавливает и линтует зависимости независимо (`npm install` из корня разрешит оба через workspaces).
- Перед коммитом запускать `lint` и `format` для затронутого приложения.
- Тесты API: `npm run test --workspace=api` (unit), `npm run test:e2e --workspace=api` (e2e).

## Поддержка документации в актуальном состоянии

При изменении архитектуры проекта (появление новых приложений/сервисов в `apps/`, изменение состава workspace'ов, смена ключевых команд сборки/запуска, добавление общих пакетов или иной способ взаимодействия между `web` и `api`) — обновлять этот файл вместе с изменением кода, в рамках того же коммита/PR. Аналогично обновлять `apps/web/CLAUDE.md` и `apps/api/CLAUDE.md` при архитектурных изменениях внутри соответствующего приложения. Не оставлять документацию описывающей устаревшее состояние проекта.
