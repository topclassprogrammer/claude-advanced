# video-meetings

An npm workspaces monorepo with two applications:

- `apps/web` — frontend on Next.js (React 19). See `apps/web/CLAUDE.md`.
- `apps/api` — backend on NestJS. See `apps/api/CLAUDE.md`.

`apps/api` implements an auth module (register/login, JWT), a meetings module (create, list), a meeting files module (upload/download/metadata/delete) and, for mp4/mp3 meeting files, automatic local Whisper transcription (status + text exposed alongside file metadata) followed by automatic Claude-based meeting summary generation (summary, action items, decisions — status + content exposed alongside file metadata, organizer-only) on top of PostgreSQL — details in `apps/api/CLAUDE.md`. `apps/web` implements login (`/auth/login`) and registration (`/auth/register`) pages, a home page (`/`) with the current user's meeting list, and a meeting page (`/meetings/[id]`) with an attached-file card — details in `apps/web/CLAUDE.md`.

## Обязательно для каждого метода сервиса

- Все параметры имеют явный TypeScript тип
- Возвращаемый тип указан явно через Promise<T>
- Нет console.log - используй Logger из @nestjs/common
- Переменные называй по смыслу - не x, не data, не result

## Перед написанием нового кода

- Прочитай CLAUDE.md правила, он имеет больший приоритет над существующим кодом
- Посмотри на соседние файлы, которые написаны правильно

## Именование
- Файлы: feature.type.ts (meetings.service.ts)
- Методы описывают действие: createMeetingWithFiles
- Переменные по смыслу: meetingId, не id, x, data
- Enum вместо строк: MeetingStatus.PENDING, не 'pnd'
- Константы вместо magic numbers: MAX_FILE_SIZE_MB

## Размер
- Файл > 250 строк -> декомпозируй перед добавлением кода
- Метод > 40 строк -> выдели в приватный метод
- Вложенность > 3 уровней -> рефакторить

## Рефакторинг
- Перед добавлением кода в большой файл - декомпозируй
- Тесты зеленые на каждом шаге рефакторинга

## Ports and database

`apps/web` listens on **3000**, `apps/api` on **3001**. PostgreSQL (`docker compose up -d` from the root) uses host port **5433**. Details and rationale for the ports — in `apps/api/CLAUDE.md`.

## Commands from the root

Scripts — see `package.json`. Each proxies the command to the relevant workspace via `npm run <script> --workspace=<name>`.

## Structure

```
apps/
  web/   — Next.js (App Router), TypeScript, ESLint, Prettier
  api/   — NestJS, TypeScript, Jest (unit + e2e), ESLint, Prettier
```

## Conventions

- Each workspace installs and lints its dependencies independently (`npm install` from the root resolves both via workspaces).
- Run `lint` and `format` for the affected app before committing.
- API tests: `npm run test:api` (unit), `npm run test:e2e:api` (e2e, requires the DB) — details in `apps/api/CLAUDE.md`, section "Tests".
- Web tests: `npm run test:e2e:web` (Playwright, requires `apps/api` + the DB; web has no unit tests) — details in `apps/web/CLAUDE.md`.

## Token economy

Use trimmed-down command output by default, so as not to clutter the context:

- `git diff --unified=0` instead of full diff context.
- `git log --oneline -10` instead of full history with commit bodies.
- `gh issue list --json number,title` (and similarly `gh pr list`) instead of the default formatted output.
- `npm run <script> -- --silent` (or the relevant runner's flag) for tests — don't print extra progress output unless it's needed for diagnostics.
- `npx tsc --noEmit 2>&1 | tail -5` — for type checking, only the fact of an error and its location matter, not the full compiler output.

If full output is needed for diagnostics (e.g. a test failed and a stack trace is needed) — widen the output deliberately, not by default.

## Keeping documentation up to date

When the project architecture changes (new apps/services under `apps/`, changes to the set of workspaces, changes to key build/run commands, new shared packages, or a different way for `web` and `api` to interact) — update this file together with the code change, in the same commit/PR. Likewise update `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md` for architectural changes within the respective app. Do not leave documentation describing an outdated state of the project.
