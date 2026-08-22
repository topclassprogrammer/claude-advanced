# apps/web

Фронтенд на Next.js 16 (App Router) + React 19 + TypeScript. Компонентная/файловая детализация — см. «Структуру» ниже.

Маршруты:

- `/auth/register`, `/auth/login` (`src/app/auth/{register,login}/page.tsx`) — регистрация и вход, `POST /auth/register`/`POST /auth/login`, страницы ссылаются друг на друга.
- `/` (`src/app/page.tsx`) — требует авторизации. Шапка (лого, `Avatar`+имя со ссылкой на `/profile`, «Создать встречу», «Выйти») + список встреч текущего пользователя (`GET /meetings`), разбитый на секции «Последние» (3 самые новые по `createdAt`), «Предстоящие» (дата ≥ текущей) и «Прошедшие» (дата в прошлом, с формой загрузки файла на каждой строке); каждая — `Card` со строками-встречами (заголовок, дата, описание, участники, кнопка удаления).
- `/profile` (`src/app/profile/page.tsx`) — требует авторизации. Аватар/имя/email через `GET /users/me`; форма редактирования имени (`ProfileNameForm`, `PATCH /users/me/name`) и загрузка/замена/удаление аватара (`AvatarUpload`, `POST`/`DELETE /users/me/avatar`). Смены пароля в UI пока нет, хотя API это поддерживает (`PATCH /users/me/password`, см. `apps/api/CLAUDE.md`, модуль `profile/`).
- `/meetings/[id]` (`src/app/meetings/[id]/page.tsx`) — требует авторизации. Заголовок встречи (`GET /meetings/:id`), `FileCard` (список файлов) и `FileUploadForm` под ней.

Защита `/`, `/meetings/[id]` и `/profile` — клиентская: при отсутствии `accessToken` в `localStorage` страница редиректит на `/auth/login` через `next/navigation`; серверного middleware/проверки нет.

Иконка типа файла подбирается по MIME-префиксу в `src/lib/file-icon.tsx` (`getFileIcon`, используется и в `FileCard`, и в `FileUploadForm`): `video/*` → `VideoIcon`, `audio/*` → `AudioIcon`, остальное (документы) → `FileIcon`.

## UI-библиотека

Подключен HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`) поверх Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`). Провайдер не требуется (v3 не использует `HeroUIProvider`). Стили подключаются в `src/app/globals.css` через `@import "tailwindcss";` и `@import "@heroui/styles";` (порядок важен — эти импорты должны идти первыми в файле). PostCSS настроен в `postcss.config.mjs`. Компоненты HeroUI — compound-паттерн (`<Card><Card.Header>...`), события — `onPress` вместо `onClick`; страницы/компоненты, использующие обработчики событий, должны быть клиентскими (`"use client"`).

Тема — только светлая (HeroUI-переменные `--background`/`--foreground`/`--surface` и т.д. из `@heroui/styles` берутся как есть, без переопределения в `globals.css`). Переопределять `--background`/`--foreground` напрямую в `:root` через `@media (prefers-color-scheme: dark)` нельзя — эти имена совпадают с переменными темы HeroUI, которая переключает палитру по атрибуту `data-theme` (`light`/`dark`), а не по `prefers-color-scheme`; такое переопределение ломает контраст текста на поверхностях HeroUI (например, лейблы становятся нечитаемыми на карточках). Тёмную тему добавлять только через `next-themes` (`attribute="class"`) по инструкции HeroUI, если/когда она понадобится.

## Обращение к API

Адрес `apps/api` задаётся переменной окружения `NEXT_PUBLIC_API_URL` (см. `.env.example`, локально — `.env.local`, по умолчанию `http://localhost:3001`). Клиенты в `src/lib/*-api.ts` — тонкие обёртки над `fetch`, кидающие `ApiError` с сообщением из ответа API при ошибке (список файлов и эндпоинтов — см. «Структуру»); все требуют `Authorization: Bearer <accessToken>`. API должен разрешать CORS для origin'а веб-приложения (см. `WEB_ORIGIN` в `apps/api/CLAUDE.md`).

Токен хранится в `localStorage` под ключом `accessToken`; доступ к нему — только через `src/lib/session.ts` (`getAccessToken`/`setAccessToken`/`clearAccessToken`), а не напрямую. `getEmailFromToken` там же декодирует email из payload JWT (без проверки подписи) для отображения в UI — эндпоинта `/auth/me` в API нет. `getUserIdFromToken` аналогично декодирует `sub` — используется на странице встречи, чтобы определить, является ли текущий пользователь организатором (для показа кнопки «Удалить» на `FileCard`).

## Команды (запускать из этой директории или через `--workspace=web` из корня)

Скрипты — см. `package.json`. `test:e2e` (Playwright, конфиг `playwright.config.ts`, тесты в `e2e/`) сам поднимает `next dev` (см. `webServer` в конфиге), но требует запущенных `apps/api` и PostgreSQL (`docker compose up -d` из корня) — тесты обращаются к реальному API через хелперы в `e2e/helpers/api.ts` (регистрация пользователя, создание встречи, загрузка файла напрямую через `fetch`, в обход UI).

## Структура

```
src/app/
  layout.tsx        — корневой layout, шрифты Geist (next/font/google)
  page.tsx            — главная страница (маршрут /; список встреч текущего пользователя, требует авторизации)
  profile/
    page.tsx                — страница профиля (маршрут /profile; требует авторизации, показывает Avatar/имя/email через GET /users/me)
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
  Avatar.tsx                 — аватар пользователя (или заглушка — кружок с первой буквой имени, data-testid="avatar-placeholder"); принимает token/avatarUrl/name/size, используется на /profile и в шапке /. Если avatarUrl задан — скачивает файл через getAvatarObjectUrl (GET /users/me/avatar с Authorization) и оборачивает в blob-URL: обычный <img src> не подходит, т.к. эндпоинт требует Bearer-токен (тот же паттерн, что и downloadMeetingFile). GET /users/me всегда возвращает один и тот же avatarUrl ('/users/me/avatar') независимо от содержимого, поэтому Avatar сам по себе не перезапрашивает файл при замене — вызывающий код (страница профиля) форсирует перерисовку через key, меняющийся при каждой загрузке/удалении аватара
  AvatarUpload.tsx            — drag-and-drop зона (тот же паттерн, что и FileUploadForm: <label htmlFor> вокруг скрытого <input type="file">) + клиентская валидация MIME/размера (ALLOWED_AVATAR_MIME_TYPES/MAX_AVATAR_SIZE_BYTES из avatar-constraints.ts) для загрузки/замены аватара (POST /users/me/avatar) на /profile; кнопка «Удалить аватар» (видна только если аватар задан) открывает AlertDialog с подтверждением перед DELETE /users/me/avatar. Ошибка (сеть/сервер/невалидный тип-размер) — Alert под зоной, без потери состояния страницы
  ProfileNameForm.tsx          — форма редактирования имени на /profile (HeroUI Form/TextField), вызывает updateProfileName (PATCH /users/me/name), обновляет отображаемый профиль через колбэк onUpdated при успехе
  BrandIcon.tsx              — иконка-лого (синий квадрат с камерой), переиспользуется в Logo.tsx и на главной странице
  Logo.tsx                  — логотип (BrandIcon + название) для страниц авторизации
  CreateMeetingModal.tsx      — модалка HeroUI (Modal, состояние isOpen/onOpenChange) создания встречи: заголовок (обязательное), дата и время (<input type="datetime-local">, обязательное, конвертируется в ISO через new Date(value).toISOString()), описание (необязательное); участники по умолчанию — пустой массив. Вызывает createMeeting (POST /meetings), при успехе колбэк onCreated добавляет встречу в список и закрывает модалку. Кнопка-триггер — обычная Button с onPress вне <Modal>, а не Modal.Trigger: оборачивание уже pressable Button в Modal.Trigger даёт вложенные <button> и react-aria предупреждение «PressResponder was rendered without a pressable child» — тот же паттерн управления через внешнее состояние, что и у AlertDialog в FileCard/DeleteMeetingButton
  DeleteMeetingButton.tsx     — icon-only кнопка удаления встречи (TrashIcon) + AlertDialog (HeroUI) с подтверждением («Удалить встречу? ... вместе со всеми прикреплёнными файлами.», «Отмена»/«Удалить»), вызывает deleteMeeting (DELETE /meetings/:id) и убирает встречу из списка через onDeleted. Бэкенд разрешает удаление только организатору (403 для остальных); т.к. GET /meetings и так возвращает только встречи текущего пользователя, кнопка показана всем строкам без доп. клиентской проверки
  FileCard.tsx               — список файлов встречи (до 10, иконка по типу/имя/размер/дата на каждой строке, заголовок «X из 10») + пустое состояние на EmptyState, если файлов нет. Кнопка «Скачать» — downloadMeetingFile скачивает файл через fetch с токеном (эндпоинт требует Authorization), оборачивает в blob-URL и запускает сохранение через временный <a download>. Кнопка «Удалить» видима только организатору (клиент сравнивает meeting.organizerId с getUserIdFromToken — только для UI, бэкенд всё равно проверяет и вернёт 403), открывает свой AlertDialog (HeroUI) с подтверждением («Удалить файл? ...», «Отмена»/«Удалить») перед DELETE, убирает из списка только этот файл
  FileUploadForm.tsx          — drag-and-drop зона (<label htmlFor> вокруг скрытого <input type="file" className="sr-only"> — даёт нативный выбор кликом/Enter/Space и focus-within:ring на label) + клиентская валидация MIME/размера (ALLOWED_MIME_TYPES/MAX_FILE_SIZE_BYTES из meeting-file-constraints.ts, зеркалит константы apps/api) до отправки. Отправка через XMLHttpRequest, а не fetch: fetch не даёт событий прогресса для тела запроса (см. docs/research-meeting-file-upload.md, §5), прогресс — HeroUI ProgressBar по xhr.upload. Проп filesCount: при достижении MAX_FILES_PER_MEETING (10) зона заменяется уведомлением о лимите (бэкенд всё равно проверяет и вернёт 409). Ошибка (сеть/сервер/невалидный тип-размер/лимит) — Alert под зоной, без потери состояния страницы
  icons/EyeIcon.tsx           — SVG-иконки EyeIcon/EyeOffIcon (переключатель видимости пароля)
  icons/UsersIcon.tsx         — SVG-иконка участников встречи (список встреч на главной странице)
  icons/FileIcon.tsx          — SVG-иконка файла-документа (getFileIcon по умолчанию)
  icons/VideoIcon.tsx         — SVG-иконка видеофайла (getFileIcon для video/*)
  icons/AudioIcon.tsx         — SVG-иконка аудиофайла (getFileIcon для audio/*)
  icons/UploadIcon.tsx        — SVG-иконка загрузки (пустое состояние FileUploadForm)
  icons/DownloadIcon.tsx      — SVG-иконка скачивания (кнопка «Скачать» на FileCard)
  icons/TrashIcon.tsx         — SVG-иконка корзины (кнопки удаления файла/встречи)
src/lib/
  auth-api.ts               — fetch-клиент для /auth/* эндпоинтов apps/api (NEXT_PUBLIC_API_URL)
  meeting-api.ts             — fetch-клиент для GET /meetings, GET /meetings/:id, POST /meetings (createMeeting) и DELETE /meetings/:id (deleteMeeting)
  meeting-file-api.ts        — клиент для GET /meetings/:id/files (список файлов, fetch), GET /meetings/:id/files/:fileId/download (скачивание через blob, fetch), POST /meetings/:id/files (загрузка через XMLHttpRequest с прогрессом) и DELETE /meetings/:id/files/:fileId (удаление, fetch)
  meeting-file-constraints.ts — MAX_FILE_SIZE_BYTES/ALLOWED_MIME_TYPES/MAX_FILE_SIZE_LABEL/MAX_FILES_PER_MEETING для клиентской валидации, зеркалит одноимённые константы apps/api/src/meeting-file/meeting-file.constants.ts (синхронизируются вручную)
  avatar-constraints.ts       — MAX_AVATAR_SIZE_BYTES/ALLOWED_AVATAR_MIME_TYPES/MAX_AVATAR_SIZE_LABEL для клиентской валидации аватара, зеркалит apps/api/src/profile/profile.constants.ts (синхронизируются вручную)
  file-icon.tsx               — getFileIcon(mimeType, props) — подбирает SVG-иконку файла по MIME-префиксу
  profile-api.ts              — fetch-клиент для GET /users/me (getProfile), PATCH /users/me/name (updateProfileName), POST /users/me/avatar (uploadAvatar), DELETE /users/me/avatar (deleteAvatar) и GET /users/me/avatar (getAvatarObjectUrl, blob-URL)
  session.ts                 — хранение accessToken в localStorage, декодирование email/userId из JWT
public/                    — статические ассеты (svg-иконки)
e2e/
  meeting-create-delete.spec.ts — Playwright e2e-тесты создания встречи через модалку (заголовок/дата/описание) и удаления встречи через диалог подтверждения (включая отмену)
  meeting-file.spec.ts        — Playwright e2e-тесты файлов встречи: карточка файла и пустое состояние, форма загрузки (прогресс, добавление второго файла без замены, лимит 10 файлов, отклонение недопустимого типа/размера), удаление (организатор через диалог подтверждения, выборочное удаление одного файла из нескольких, отмена диалога, кнопка недоступна не-организатору), сквозной сценарий загрузка → отображение → скачивание → удаление
  profile.spec.ts             — Playwright e2e-тесты страницы профиля: дефолтное имя (часть email до @) и заглушка аватара без данных профиля, отображение имени/аватара (заданных через API-хелперы) на /profile и в шапке главной страницы
  profile-edit.spec.ts         — Playwright e2e-тесты редактирования профиля: изменение имени через форму (отражается на /profile и в шапке главной), загрузка аватара через file input (валидный файл обновляет аватар в обоих местах), отклонение недопустимого типа/размера файла с понятной ошибкой без потери страницы, удаление аватара через AlertDialog с возвратом к заглушке
  helpers/api.ts                — хелперы для подготовки данных теста напрямую через API apps/api (registerUser/createMeeting/uploadMeetingFile/getMeeting/updateProfileName/uploadAvatar)
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
