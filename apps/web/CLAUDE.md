# apps/web

Фронтенд на Next.js 16 (App Router) + React 19 + TypeScript. Реализованы страницы регистрации (`src/app/auth/register/page.tsx`, маршрут `/auth/register`) и входа (`src/app/auth/login/page.tsx`, маршрут `/auth/login`), подключённые к `POST /auth/register` и `POST /auth/login` в `apps/api`; страницы ссылаются друг на друга. Главная страница `src/app/page.tsx` (маршрут `/`) доступна только авторизованным пользователям: содержимое (лого + email + кнопка «Выйти», секции со встречами) выровнено по центру в колонке `max-w-2xl`. Показывает список встреч текущего пользователя, подключённый к `GET /meetings`: секция «Последние встречи» (3 самые новые по `createdAt`, подсвечены `bg-accent-soft`) и секция «Все встречи» (полный список, `bg-default`) — каждая внутри одной `Card` со строками-встречами (заголовок, дата с иконкой `IconCalendar`, участники с иконкой `UsersIcon`), ссылка на строку ведёт на `/meetings/[id]`.

Страница встречи `src/app/meetings/[id]/page.tsx` (маршрут `/meetings/[id]`) защищена так же, как `/`. Показывает заголовок встречи (title/дата/участники, подключено к `GET /meetings/:id`), компонент `FileCard` (`src/components/FileCard.tsx`) — карточку прикреплённого файла встречи (иконка по типу, имя, размер, дата загрузки, кнопки «Скачать»/«Удалить»), подключённый к `GET /meetings/:id/file`, `GET /meetings/:id/file/download` и `DELETE /meetings/:id/file` из `apps/api`, и компонент `FileUploadForm` (`src/components/FileUploadForm.tsx`) — форму загрузки/замены файла под ней. Если файл не загружен — `FileCard` показывает пустое состояние на `EmptyState`. Скачивание файла не является обычной ссылкой: эндпоинт скачивания требует заголовок `Authorization`, поэтому `downloadMeetingFile` (`src/lib/meeting-file-api.ts`) скачивает файл через `fetch` с токеном, оборачивает ответ в blob-URL и запускает сохранение через временный `<a download>`.

Кнопка «Удалить» на `FileCard` видима только организатору встречи — страница вычисляет это на клиенте, сравнивая `meeting.organizerId` с id текущего пользователя (`getUserIdFromToken` из `src/lib/session.ts`, декодирует `sub` из JWT без проверки подписи, только для UI-логики). Нажатие открывает `AlertDialog` (HeroUI) с подтверждением («Удалить файл? Файл «‹имя›» будет удалён без возможности восстановления.», кнопки «Отмена»/«Удалить»); подтверждение вызывает `deleteMeetingFile` (`src/lib/meeting-file-api.ts`, `DELETE /meetings/:id/file`) и возвращает `FileCard` к пустому состоянию. Сам эндпоинт удаления на бэкенде разрешён только организатору (403 для остальных) — клиентская проверка не заменяет, а дублирует это для UX, скрывая недоступное действие.

`FileUploadForm` — drag-and-drop зона (`<label>` c `htmlFor`, оборачивающий скрытый `<input type="file" className="sr-only">`, что даёт нативный выбор файла кликом/по Enter/Space и доступный фокус через `focus-within:ring-*` на самом label) + клиентская валидация MIME-типа и размера (`ALLOWED_MIME_TYPES`/`MAX_FILE_SIZE_BYTES` из `src/lib/meeting-file-constraints.ts`, зеркалящих одноимённые константы `apps/api`) до отправки на сервер. Отправка — `uploadMeetingFile` (`src/lib/meeting-file-api.ts`) через `XMLHttpRequest`, а не `fetch`: `fetch` не даёт событий прогресса для тела запроса, только для чтения ответа (см. `docs/research-meeting-file-upload.md`, §5), прогресс отображается через `xhr.upload` события в HeroUI `ProgressBar`. При успехе колбэк `onUploaded` обновляет `file` на странице встречи, заменяя карточку данными нового файла (повторная загрузка не требует отдельного действия — форма всегда видна, даже если файл уже прикреплён). При ошибке (сетевой сбой, отклонение сервером, невалидный тип/размер) — `Alert` с сообщением под зоной, без потери состояния страницы.

Иконка типа файла подбирается по MIME-префиксу в `src/lib/file-icon.tsx` (`getFileIcon`, используется и в `FileCard`, и в `FileUploadForm`): `video/*` → `VideoIcon`, `audio/*` → `AudioIcon`, остальное (документы) → `FileIcon`.

Защита `/` и `/meetings/[id]` — клиентская: при отсутствии `accessToken` в `localStorage` страница редиректит на `/auth/login` через `next/navigation`; серверного middleware/проверки нет.

## UI-библиотека

Подключен HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`) поверх Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`). Провайдер не требуется (v3 не использует `HeroUIProvider`). Стили подключаются в `src/app/globals.css` через `@import "tailwindcss";` и `@import "@heroui/styles";` (порядок важен — эти импорты должны идти первыми в файле). PostCSS настроен в `postcss.config.mjs`. Компоненты HeroUI — compound-паттерн (`<Card><Card.Header>...`), события — `onPress` вместо `onClick`; страницы/компоненты, использующие обработчики событий, должны быть клиентскими (`"use client"`).

Тема — только светлая (HeroUI-переменные `--background`/`--foreground`/`--surface` и т.д. из `@heroui/styles` берутся как есть, без переопределения в `globals.css`). Переопределять `--background`/`--foreground` напрямую в `:root` через `@media (prefers-color-scheme: dark)` нельзя — эти имена совпадают с переменными темы HeroUI, которая переключает палитру по атрибуту `data-theme` (`light`/`dark`), а не по `prefers-color-scheme`; такое переопределение ломает контраст текста на поверхностях HeroUI (например, лейблы становятся нечитаемыми на карточках). Тёмную тему добавлять только через `next-themes` (`attribute="class"`) по инструкции HeroUI, если/когда она понадобится.

## Обращение к API

Адрес `apps/api` задаётся переменной окружения `NEXT_PUBLIC_API_URL` (см. `.env.example`, локально — `.env.local`, по умолчанию `http://localhost:3001`). Клиенты — тонкие обёртки над `fetch`, кидающие `ApiError` с сообщением из ответа API при ошибке: `src/lib/auth-api.ts` (`/auth/register`, `/auth/login`), `src/lib/meeting-api.ts` (`GET /meetings`, `GET /meetings/:id`) и `src/lib/meeting-file-api.ts` (`GET /meetings/:id/file` — метаданные файла, 404 трактуется как отсутствие файла и возвращает `null`; `downloadMeetingFile` — скачивание файла через `GET /meetings/:id/file/download`; `uploadMeetingFile` — загрузка файла через `POST /meetings/:id/file` на `XMLHttpRequest` с колбэком прогресса, единственное исключение из fetch-обёрток в этом файле; `deleteMeetingFile` — удаление файла через `DELETE /meetings/:id/file`). Все клиенты требуют `Authorization: Bearer <accessToken>`. API должен разрешать CORS для origin'а веб-приложения (см. `WEB_ORIGIN` в `apps/api/CLAUDE.md`).

Токен хранится в `localStorage` под ключом `accessToken`; доступ к нему — только через `src/lib/session.ts` (`getAccessToken`/`setAccessToken`/`clearAccessToken`), а не напрямую. `getEmailFromToken` там же декодирует email из payload JWT (без проверки подписи) для отображения в UI — эндпоинта `/auth/me` в API нет. `getUserIdFromToken` аналогично декодирует `sub` — используется на странице встречи, чтобы определить, является ли текущий пользователь организатором (для показа кнопки «Удалить» на `FileCard`).

## Команды (запускать из этой директории или через `--workspace=web` из корня)

```
npm run dev       # dev-сервер (next dev)
npm run build      # продакшн-сборка (next build)
npm run start        # запуск собранного билда (next start)
npm run lint           # eslint
npm run format           # prettier --write .
npm run test:e2e          # Playwright e2e-тесты (конфиг playwright.config.ts, тесты в e2e/)
```

`test:e2e` поднимает `next dev` сам (см. `webServer` в `playwright.config.ts`), но требует запущенных `apps/api` и PostgreSQL (`docker compose up -d` из корня) — тесты обращаются к реальному API через хелперы в `e2e/helpers/api.ts` (регистрация пользователя, создание встречи, загрузка файла напрямую через `fetch`, в обход UI).

## Структура

```
src/app/
  layout.tsx        — корневой layout, шрифты Geist (next/font/google)
  page.tsx            — главная страница (маршрут /; список встреч текущего пользователя, требует авторизации)
  auth/
    register/
      page.tsx              — страница регистрации (маршрут /auth/register; форма email/пароль на HeroUI, вызывает src/lib/auth-api.ts, ссылка на /auth/login)
    login/
      page.tsx              — страница входа (маршрут /auth/login; форма email/пароль на HeroUI, вызывает src/lib/auth-api.ts, ссылка на /auth/register)
  meetings/
    [id]/
      page.tsx                — страница встречи (маршрут /meetings/[id]; требует авторизации, показывает заголовок встречи, FileCard и FileUploadForm)
  globals.css           — глобальные стили (+ импорты tailwindcss и @heroui/styles)
src/components/
  BrandIcon.tsx              — иконка-лого (синий квадрат с камерой), переиспользуется в Logo.tsx и на главной странице
  Logo.tsx                  — логотип (BrandIcon + название) для страниц авторизации
  FileCard.tsx               — карточка файла встречи (иконка по типу/имя/размер/дата/кнопки «Скачать»/«Удалить») + пустое состояние на EmptyState, если файл не загружен; «Удалить» видима только организатору, открывает AlertDialog (HeroUI) с подтверждением перед вызовом DELETE
  FileUploadForm.tsx          — форма загрузки/замены файла встречи (drag-and-drop зона + выбор кликом, прогресс-бар, обработка ошибок)
  icons/EyeIcon.tsx           — SVG-иконки EyeIcon/EyeOffIcon (переключатель видимости пароля)
  icons/UsersIcon.tsx         — SVG-иконка участников встречи (список встреч на главной странице)
  icons/FileIcon.tsx          — SVG-иконка файла-документа (getFileIcon по умолчанию)
  icons/VideoIcon.tsx         — SVG-иконка видеофайла (getFileIcon для video/*)
  icons/AudioIcon.tsx         — SVG-иконка аудиофайла (getFileIcon для audio/*)
  icons/UploadIcon.tsx        — SVG-иконка загрузки (пустое состояние FileUploadForm)
src/lib/
  auth-api.ts               — fetch-клиент для /auth/* эндпоинтов apps/api (NEXT_PUBLIC_API_URL)
  meeting-api.ts             — fetch-клиент для GET /meetings, GET /meetings/:id
  meeting-file-api.ts        — клиент для GET /meetings/:id/file (метаданные, fetch), GET /meetings/:id/file/download (скачивание через blob, fetch), POST /meetings/:id/file (загрузка через XMLHttpRequest с прогрессом) и DELETE /meetings/:id/file (удаление, fetch)
  meeting-file-constraints.ts — MAX_FILE_SIZE_BYTES/ALLOWED_MIME_TYPES/MAX_FILE_SIZE_LABEL для клиентской валидации, зеркалит одноимённые константы apps/api/src/meeting-file/meeting-file.constants.ts (синхронизируются вручную)
  file-icon.tsx               — getFileIcon(mimeType, props) — подбирает SVG-иконку файла по MIME-префиксу
  session.ts                 — хранение accessToken в localStorage, декодирование email/userId из JWT
public/                    — статические ассеты (svg-иконки)
e2e/
  meeting-file.spec.ts        — Playwright e2e-тест отображения карточки файла встречи и пустого состояния
  meeting-file-upload.spec.ts — Playwright e2e-тесты формы загрузки: успешная загрузка с прогрессом, замена файла, отклонение недопустимого типа/размера
  meeting-file-delete.spec.ts — Playwright e2e-тесты удаления: организатор удаляет файл через диалог подтверждения, отмена диалога, кнопка недоступна не-организатору, сквозной сценарий загрузка → отображение → скачивание → удаление
  helpers/api.ts                — хелперы для подготовки данных теста напрямую через API apps/api (registerUser/createMeeting/uploadMeetingFile/getMeeting)
playwright.config.ts       — конфиг Playwright (testDir e2e/, webServer поднимает next dev на localhost:3000)
postcss.config.mjs         — PostCSS-конфиг с плагином @tailwindcss/postcss
.env.example               — пример переменных окружения (NEXT_PUBLIC_API_URL)
```

Алиас путей: `@/*` → `src/*` (см. `tsconfig.json`).

## Соглашения

- ESLint — `eslint.config.mjs` (flat config, `eslint-config-next` + `eslint-config-prettier`); Prettier — `.prettierrc`.
- TypeScript strict-режим включён.
- Новые страницы/роуты добавлять по конвенциям App Router (`src/app/**/page.tsx`, `layout.tsx`, `route.ts` и т.д.).
- `next dev` при запуске автогенерирует `AGENTS.md` в этой директории с предупреждением о breaking changes в этой версии Next.js относительно обучающих данных — при работе с API фреймворка сверяться с `node_modules/next/dist/docs/`, а не полагаться на память.

## Проверка UI-изменений

Любое изменение UI (новая страница, компонент, стили, вёрстка) считается завершённым только после того, как оно:

1. Визуально протестировано в браузере (запустить `next dev` и открыть страницу через Playwright MCP — см. правило использования Playwright MCP для визуальных проверок), а не оценено только по коду. Проверять основной сценарий и граничные случаи (валидация, ошибки, пустые/длинные значения и т.д.).
2. Проверено по скиллу `ui-ux-pro-max` (вызвать явно, не полагаться на память о нём).

Пропускать эти шаги нельзя, даже если изменение выглядит небольшим — вёрстка HeroUI/Tailwind в этом проекте уже ломалась незаметно по коду и обнаруживалась только визуально.

## Поддержка документации в актуальном состоянии

При изменении архитектуры приложения (новая структура роутов/страниц, добавление state-менеджмента, слоя данных/API-клиента, смена ключевых команд или конфигурации Next.js) — обновлять этот файл в том же коммите/PR, где вносится изменение. Если изменение затрагивает и корневой монорепозиторий, обновлять также корневой `CLAUDE.md`.

Все скриншоты сохраняй в папку /screenshot

## Test User

Login: test@test.com
Password: 123456
