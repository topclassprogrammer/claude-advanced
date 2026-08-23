# apps/web

Фронтенд на Next.js 16 (App Router) + React 19 + TypeScript. Компонентная/файловая детализация — см. «Структуру» ниже.

Маршруты:

- `/auth/register`, `/auth/login` (`src/app/auth/{register,login}/page.tsx`) — регистрация и вход, `POST /auth/register`/`POST /auth/login`, страницы ссылаются друг на друга. Общая обёртка (декоративный фон, лого, Card) — `AuthFormShell`, поле пароля с переключателем видимости — `PasswordField` (см. «Структуру»).
- `/` (`src/app/page.tsx`) — требует авторизации. Тонкий компонент-контейнер: сессия — через `useSession`, группировка встреч — через `groupMeetings` (`src/lib/meeting-grouping.ts`), три секции («Последние», «Предстоящие», «Прошедшие») вынесены в `src/components/home/*Section.tsx` (см. «Структуру»). Шапка (лого, `Avatar`+имя со ссылкой на `/profile`, «Создать встречу», «Выйти») + список встреч текущего пользователя (`GET /meetings`), разбитый на секции «Последние» (3 самые новые по `createdAt`), «Предстоящие» (дата ≥ текущей) и «Прошедшие» (дата в прошлом, с формой загрузки файла на каждой строке); каждая — `Card` со строками-встречами (заголовок, дата, описание, участники, кнопка удаления).
- `/profile` (`src/app/profile/page.tsx`) — требует авторизации. Аватар/имя/email через `GET /users/me`; форма редактирования имени (`ProfileNameForm`, `PATCH /users/me/name`), загрузка/замена/удаление аватара (`AvatarUpload`, `POST`/`DELETE /users/me/avatar`) и смена пароля (`ChangePasswordForm`, `PATCH /users/me/password`, три поля через `PasswordField` — «Текущий пароль»/«Новый пароль»/«Подтверждение нового пароля»; кнопка отправки задизейблена, пока новый пароль и подтверждение не совпадут; при 401 от неверного текущего пароля показывает сообщение из ответа API).
- `/meetings/[id]` (`src/app/meetings/[id]/page.tsx`) — требует авторизации. Сессия — через `useSession`, состояние файлов встречи (fetch/download/delete/поллинг статуса транскрипции) — через `useMeetingFiles` (переиспользуется и в `PastMeetingRow` на главной странице). Заголовок встречи (`GET /meetings/:id`), `FileCard` (список файлов, статус и текст транскрипта) и `FileUploadForm` под ней.

Защита `/`, `/meetings/[id]` и `/profile` — клиентская: `useSession` при монтировании страницы сначала восстанавливает access-токен в памяти через silent-refresh (`POST /auth/refresh` по httpOnly refresh-куке — она одна переживает перезагрузку страницы), затем загружает текущего пользователя (`GET /auth/me`), и редиректит на `/auth/login` через `next/navigation`, если что-то из этого не удалось; серверного middleware/проверки нет.

Иконка типа файла подбирается по MIME-префиксу в `src/lib/file-icon.tsx` (`getFileIcon`, используется и в `FileCard`, и в `FileUploadForm`): `video/*` → `VideoIcon`, `audio/*` → `AudioIcon`, остальное (документы) → `FileIcon`.

## UI-библиотека

Подключен HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`) поверх Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`). Провайдер не требуется (v3 не использует `HeroUIProvider`). Стили подключаются в `src/app/globals.css` через `@import "tailwindcss";` и `@import "@heroui/styles";` (порядок важен — эти импорты должны идти первыми в файле). PostCSS настроен в `postcss.config.mjs`. Компоненты HeroUI — compound-паттерн (`<Card><Card.Header>...`), события — `onPress` вместо `onClick`; страницы/компоненты, использующие обработчики событий, должны быть клиентскими (`"use client"`).

Тема — только светлая (HeroUI-переменные `--background`/`--foreground`/`--surface` и т.д. из `@heroui/styles` берутся как есть, без переопределения в `globals.css`). Переопределять `--background`/`--foreground` напрямую в `:root` через `@media (prefers-color-scheme: dark)` нельзя — эти имена совпадают с переменными темы HeroUI, которая переключает палитру по атрибуту `data-theme` (`light`/`dark`), а не по `prefers-color-scheme`; такое переопределение ломает контраст текста на поверхностях HeroUI (например, лейблы становятся нечитаемыми на карточках). Тёмную тему добавлять только через `next-themes` (`attribute="class"`) по инструкции HeroUI, если/когда она понадобится.

## Обращение к API

Адрес `apps/api` задаётся переменной окружения `NEXT_PUBLIC_API_URL` (см. `.env.example`, локально — `.env.local`, по умолчанию `http://localhost:3001`). Клиенты в `src/lib/*-api.ts` — тонкие обёртки над `fetch`, кидающие `ApiError` с сообщением из ответа API при ошибке (список файлов и эндпоинтов — см. «Структуру»); все обычные запросы идут через `authorizedFetch` (`src/lib/auth-api.ts`) — она сама прикладывает `Authorization: Bearer <accessToken>` и один раз молча обновляет токен при 401. `register`/`login`/`logout`/`refreshAccessToken` вместо этого идут напрямую через `fetch` с `credentials: 'include'` (нужно для приёма/отправки httpOnly refresh-куки — единственное место, где куки участвуют во фронтенд-коде). API должен разрешать CORS для origin'а веб-приложения с `credentials: true` (см. `WEB_ORIGIN` в `apps/api/CLAUDE.md`).

Двухтокенная схема (см. также «Аутентификация» в `apps/api/CLAUDE.md`): короткоживущий access-токен живёт только в переменной модуля `src/lib/auth-api.ts` (не в React state, не в localStorage, не в куке) — теряется при полной перезагрузке страницы. Долгоживущий refresh-токен лежит в httpOnly-куке, которую ставит/чистит/ротирует API (`POST /auth/login`/`register`/`refresh`/`logout`) и которую JS не видит и не трогает напрямую — только `credentials: 'include'` заставляет браузер её отправить/принять.

- `authorizedFetch(path, init)` (`auth-api.ts`) — прикладывает текущий access-токен из памяти; при 401 от API один раз вызывает `refreshAccessToken()` (`POST /auth/refresh`, дедуплицируется общим промисом на конкурентные 401) и повторяет запрос с новым токеном; если и это не помогло — отдаёт исходный 401-ответ вызывающему коду как есть (никакого автоматического редиректа на логин из самого `authorizedFetch` — этим занимается `useSession` на уровне страницы). Используется всеми `*-api.ts`, кроме `meeting-file-api.ts#uploadMeetingFile` (см. ниже).
- `useSession` (`src/hooks/useSession.ts`) — единственный способ узнать текущего пользователя на клиенте: если access-токена в памяти ещё нет (первая загрузка страницы), сначала вызывает `refreshAccessToken()`; затем `getCurrentUser()` (`GET /auth/me`, тоже через `authorizedFetch`), которая возвращает `{ sub, email }`. Редиректит на `/auth/login` через `next/navigation`, если refresh или `/auth/me` не удались. `logout()` из того же хука вызывает `POST /auth/logout` (очищает refresh-токен и на бэкенде, и в памяти) и затем редиректит.
- Компоненты, которым раньше передавался `token` пропом (`Avatar`, `FileCard`/`FileUploadForm`, `CreateMeetingModal`, `DeleteMeetingButton`, `ProfileNameForm`, `ChangePasswordForm`, `AvatarUpload` и т.д.), его не принимают — авторизация полностью инкапсулирована в `*-api.ts`. Для определения организатора (`FileCard.canDelete`, `PastMeetingsSection`) страницы передают `session.userId` (из `useSession`) вниз явным пропом.
- `meeting-file-api.ts#uploadMeetingFile` — исключение: использует `XMLHttpRequest` напрямую (нужны события прогресса, `authorizedFetch` этого не даёт), поэтому сам прикладывает `Authorization` через `getAccessToken()` (`auth-api.ts`) и не умеет молча обновлять токен при 401 в середине загрузки — в этом редком случае пользователь просто увидит ошибку загрузки и должен будет обновить страницу/повторить попытку.

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
  common/
    ConfirmDeleteDialog.tsx      — общий AlertDialog с подтверждением удаления (заголовок/тело/onConfirm через пропсы), переиспользуется в FileCard (FileRow), AvatarUpload и DeleteMeetingButton
    UploadDropzone.tsx            — общая drag-and-drop зона (<label> вокруг скрытого <input type="file">), переиспользуется в FileUploadForm и AvatarUpload; состояние загрузки — из useFileUpload
  auth/
    AuthFormShell.tsx             — общая обёртка форм /auth/login и /auth/register: декоративный фон, Logo, Card с заголовком/описанием
    PasswordField.tsx             — поле пароля с переключателем видимости (HeroUI TextField/InputGroup/ToggleButton), общее для форм входа/регистрации и ChangePasswordForm; name/label настраиваемы пропсами (по умолчанию name="password", label="Пароль") — ChangePasswordForm рендерит два экземпляра с разными name ("oldPassword"/"newPassword") на одной форме
  home/
    MeetingRow.tsx              — строка встречи в секциях «Последние»/«Предстоящие» на главной странице (заголовок, дата, описание, участники, кнопка удаления)
    PastMeetingRow.tsx           — строка прошедшей встречи: то же, что MeetingRow, плюс файлы встречи через useMeetingFiles (FileCard + FileUploadForm в compact-режиме)
    RecentMeetingsSection.tsx     — секция «Последние встречи» на главной странице (Card со списком MeetingRow), null если список пуст
    UpcomingMeetingsSection.tsx    — секция «Предстоящие встречи» на главной странице, null если список пуст
    PastMeetingsSection.tsx       — секция «Прошедшие встречи» на главной странице (Card со списком PastMeetingRow), null если список пуст
  Avatar.tsx                 — аватар пользователя (или заглушка — кружок с первой буквой имени, data-testid="avatar-placeholder"); принимает avatarUrl/name/size, используется на /profile и в шапке /. Если avatarUrl задан — скачивает файл через getAvatarObjectUrl (GET /users/me/avatar через authorizedFetch) и оборачивает в blob-URL: обычный <img src> не подходит, т.к. эндпоинт требует Bearer-заголовок, который нельзя приложить к нативному запросу картинки (тот же паттерн, что и у downloadMeetingFile). GET /users/me всегда возвращает один и тот же avatarUrl ('/users/me/avatar') независимо от содержимого, поэтому Avatar сам по себе не перезапрашивает файл при замене — вызывающий код (страница профиля) форсирует перерисовку через key, меняющийся при каждой загрузке/удалении аватара
  AvatarUpload.tsx            — drag-and-drop зона (тот же паттерн, что и FileUploadForm: <label htmlFor> вокруг скрытого <input type="file">) + клиентская валидация MIME/размера (ALLOWED_AVATAR_MIME_TYPES/MAX_AVATAR_SIZE_BYTES из avatar-constraints.ts) для загрузки/замены аватара (POST /users/me/avatar) на /profile; кнопка «Удалить аватар» (видна только если аватар задан) открывает AlertDialog с подтверждением перед DELETE /users/me/avatar. Ошибка (сеть/сервер/невалидный тип-размер) — Alert под зоной, без потери состояния страницы
  ProfileNameForm.tsx          — форма редактирования имени на /profile (HeroUI Form/TextField), вызывает updateProfileName (PATCH /users/me/name), обновляет отображаемый профиль через колбэк onUpdated при успехе
  ChangePasswordForm.tsx        — форма смены пароля на /profile (HeroUI Form, три PasswordField — «Текущий пароль»/«Новый пароль» (мин. 8 символов)/«Подтверждение нового пароля»), вызывает changePassword (PATCH /users/me/password); совпадение нового пароля и подтверждения проверяется и на уровне поля (inline-ошибка «Пароли не совпадают» через validate), и через React state — кнопка отправки задизейблена, пока значения не совпадут (не полагается на внутреннее кеширование валидности react-aria, которое может не блокировать первый клик после точечного исправления одного поля), и повторно на сабмите перед вызовом API. При успехе очищает все три поля (сброс через key на Form) и показывает Alert success, при ошибке (в т.ч. неверный текущий пароль — 401 от API) — Alert danger с сообщением из ответа
  BrandIcon.tsx              — иконка-лого (синий квадрат с камерой), переиспользуется в Logo.tsx и на главной странице
  Logo.tsx                  — логотип (BrandIcon + название) для страниц авторизации
  CreateMeetingModal.tsx      — модалка HeroUI (Modal, состояние isOpen/onOpenChange) создания встречи: заголовок (обязательное), дата и время (<input type="datetime-local">, обязательное, конвертируется в ISO через new Date(value).toISOString()), описание (необязательное); участники по умолчанию — пустой массив. Вызывает createMeeting (POST /meetings), при успехе колбэк onCreated добавляет встречу в список и закрывает модалку. Кнопка-триггер — обычная Button с onPress вне <Modal>, а не Modal.Trigger: оборачивание уже pressable Button в Modal.Trigger даёт вложенные <button> и react-aria предупреждение «PressResponder was rendered without a pressable child» — тот же паттерн управления через внешнее состояние, что и у AlertDialog в FileCard/DeleteMeetingButton
  DeleteMeetingButton.tsx     — icon-only кнопка удаления встречи (TrashIcon) + AlertDialog (HeroUI) с подтверждением («Удалить встречу? ... вместе со всеми прикреплёнными файлами.», «Отмена»/«Удалить»), вызывает deleteMeeting (DELETE /meetings/:id) и убирает встречу из списка через onDeleted. Бэкенд разрешает удаление только организатору (403 для остальных); т.к. GET /meetings и так возвращает только встречи текущего пользователя, кнопка показана всем строкам без доп. клиентской проверки
  FileCard.tsx               — список файлов встречи (до 10, иконка по типу/имя/размер/дата на каждой строке, заголовок «X из 10») + пустое состояние на EmptyState, если файлов нет. Кнопка «Скачать» — downloadMeetingFile скачивает файл через authorizedFetch (авторизация Bearer-заголовком из памяти), оборачивает в blob-URL и запускает сохранение через временный <a download>. Кнопка «Удалить» видима через проп canDelete, который страница/родитель вычисляет сравнением meeting.organizerId с session.userId (из useSession) — только для UI, бэкенд всё равно проверяет и вернёт 403; открывает свой AlertDialog (HeroUI) с подтверждением («Удалить файл? ...», «Отмена»/«Удалить») перед DELETE, убирает из списка только этот файл. Если у файла есть `transcription` (не null — mp4/mp3), под именем файла показывается статус-чип HeroUI (`Chip`, `variant="soft"`, `data-testid="transcription-status-chip"`): «Транскрипт: В процессе» (PENDING/PROCESSING, цвет warning), «Транскрипт: Готово» (COMPLETED, success) или «Транскрипт: Ошибка» (FAILED, danger) — ошибка транскрибации не блокирует кнопки «Скачать»/«Удалить». Когда статус COMPLETED и есть текст, под строкой файла появляется разворачиваемый блок HeroUI `Disclosure` («Транскрипт») с текстом транскрипта (`data-testid="transcription-text"`, `whitespace-pre-wrap`, без markdown/rich text)
  FileUploadForm.tsx          — drag-and-drop зона (<label htmlFor> вокруг скрытого <input type="file" className="sr-only"> — даёт нативный выбор кликом/Enter/Space и focus-within:ring на label) + клиентская валидация MIME/размера (ALLOWED_MIME_TYPES/MAX_FILE_SIZE_BYTES из meeting-file-constraints.ts, зеркалит константы apps/api) до отправки. Отправка через XMLHttpRequest, а не fetch: fetch не даёт событий прогресса для тела запроса (см. docs/research-meeting-file-upload.md, §5), прогресс — HeroUI ProgressBar по xhr.upload. Проп filesCount: при достижении MAX_FILES_PER_MEETING (10) зона заменяется уведомлением о лимите (бэкенд всё равно проверяет и вернёт 409). Ошибка (сеть/сервер/невалидный тип-размер/лимит) — Alert под зоной, без потери состояния страницы
  icons/EyeIcon.tsx           — SVG-иконки EyeIcon/EyeOffIcon (переключатель видимости пароля)
  icons/UsersIcon.tsx         — SVG-иконка участников встречи (список встреч на главной странице)
  icons/FileIcon.tsx          — SVG-иконка файла-документа (getFileIcon по умолчанию)
  icons/VideoIcon.tsx         — SVG-иконка видеофайла (getFileIcon для video/*)
  icons/AudioIcon.tsx         — SVG-иконка аудиофайла (getFileIcon для audio/*)
  icons/UploadIcon.tsx        — SVG-иконка загрузки (пустое состояние FileUploadForm)
  icons/DownloadIcon.tsx      — SVG-иконка скачивания (кнопка «Скачать» на FileCard)
  icons/TrashIcon.tsx         — SVG-иконка корзины (кнопки удаления файла/встречи)
src/hooks/
  useSession.ts               — bootstrap сессии: silent-refresh access-токена по httpOnly refresh-куке (если его ещё нет в памяти) + GET /auth/me, редирект на /auth/login при неудаче любого из двух + logout (POST /auth/logout); используется на /, /meetings/[id] и /profile
  useMeetingFiles.ts           — состояние файлов встречи (fetch с опциональным autoLoad, download/delete/uploaded-хендлеры); используется в PastMeetingRow (autoLoad) и на /meetings/[id] (файлы загружаются вместе со встречей через Promise.all, setFiles из хука). Пока хотя бы у одного файла в списке `transcription.status` PENDING/PROCESSING, хук раз в 4 секунды (`TRANSCRIPTION_POLL_INTERVAL_MS`) перезапрашивает GET /meetings/:id/files (`setInterval`, очищается по cleanup эффекта/при отсутствии файлов в процессе) — актуализирует статус/текст транскрипта без ручной перезагрузки страницы; ошибки поллинга проглатываются (следующий тик попробует снова)
  useFileUpload.ts             — общее состояние drag-and-drop загрузки (isDragging/uploading/currentFile/progress/error, handleDragOver/handleDragLeave/handleDrop/handleInputChange); принимает validate/upload/onUploaded/defaultErrorMessage, используется в FileUploadForm и AvatarUpload
src/lib/
  auth-api.ts               — fetch-клиент для /auth/* эндпоинтов apps/api (NEXT_PUBLIC_API_URL) и держатель access-токена в памяти модуля: register/login (сохраняют accessToken из тела ответа в память, `credentials: 'include'` для приёма refresh-куки), logout (POST /auth/logout, чистит и куку, и память), refreshAccessToken (POST /auth/refresh по refresh-куке, обновляет токен в памяти, дедуплицирует конкурентные вызовы), getAccessToken (текущий токен для мест, не идущих через authorizedFetch — см. meeting-file-api.ts), authorizedFetch (обёртка над fetch с Authorization-заголовком и одной попыткой silent-refresh при 401 — см. «Обращение к API») и getCurrentUser (GET /auth/me через authorizedFetch)
  meeting-api.ts             — fetch-клиент для GET /meetings, GET /meetings/:id, POST /meetings (createMeeting) и DELETE /meetings/:id (deleteMeeting)
  meeting-grouping.ts          — groupMeetings(meetings, now) — чистая функция, делит встречи на recent/upcoming/past для главной страницы
  format-meeting-date.ts        — formatMeetingDate(date) — форматирование даты встречи (ru-RU, Intl.DateTimeFormat), используется на / и /meetings/[id]
  email-pattern.ts              — EMAIL_PATTERN — общее регулярное выражение валидации email для форм /auth/login и /auth/register
  meeting-file-api.ts        — клиент для GET /meetings/:id/files (список файлов, fetch), GET /meetings/:id/files/:fileId/download (скачивание через blob, fetch), POST /meetings/:id/files (загрузка через XMLHttpRequest с прогрессом) и DELETE /meetings/:id/files/:fileId (удаление, fetch). Тип `MeetingFile` включает `transcription: { status: TranscriptionStatus; text: string | null } | null` (null — файл не mp4/mp3, транскрипция не запускалась); `isTranscriptionInProgress(file)` — true при status PENDING/PROCESSING, используется useMeetingFiles для решения, нужно ли поллить
  meeting-file-constraints.ts — MAX_FILE_SIZE_BYTES/ALLOWED_MIME_TYPES/MAX_FILE_SIZE_LABEL/MAX_FILES_PER_MEETING для клиентской валидации, зеркалит одноимённые константы apps/api/src/meeting-file/meeting-file.constants.ts (синхронизируются вручную)
  avatar-constraints.ts       — MAX_AVATAR_SIZE_BYTES/ALLOWED_AVATAR_MIME_TYPES/MAX_AVATAR_SIZE_LABEL для клиентской валидации аватара, зеркалит apps/api/src/profile/profile.constants.ts (синхронизируются вручную)
  file-icon.tsx               — getFileIcon(mimeType, props) — подбирает SVG-иконку файла по MIME-префиксу
  profile-api.ts              — fetch-клиент для GET /users/me (getProfile), PATCH /users/me/name (updateProfileName), PATCH /users/me/password (changePassword), POST /users/me/avatar (uploadAvatar), DELETE /users/me/avatar (deleteAvatar) и GET /users/me/avatar (getAvatarObjectUrl, blob-URL)
public/                    — статические ассеты (svg-иконки)
e2e/
  meeting-create-delete.spec.ts — Playwright e2e-тесты создания встречи через модалку (заголовок/дата/описание) и удаления встречи через диалог подтверждения (включая отмену)
  meeting-file.spec.ts        — Playwright e2e-тесты файлов встречи: карточка файла и пустое состояние, форма загрузки (прогресс, добавление второго файла без замены, лимит 10 файлов, отклонение недопустимого типа/размера), удаление (организатор через диалог подтверждения, выборочное удаление одного файла из нескольких, отмена диалога), не-организатор не может открыть чужую встречу и её файлы вовсе (бэкенд 404/403-ит GET /meetings/:id для не-организатора — см. apps/api/CLAUDE.md), сквозной сценарий загрузка → отображение → скачивание → удаление
  meeting-file-transcription.spec.ts — Playwright e2e-тесты статуса/текста транскрипции на странице встречи: статус-чип появляется после загрузки mp3-файла и обновляется до «Готово» с раскрывающимся текстом транскрипта без перезагрузки страницы, статус «Ошибка» не блокирует кнопки «Скачать»/«Удалить», статус-чип не отображается для нетранскрибируемого типа файла (pdf). Реальный запуск Whisper недоступен в тестовом окружении, поэтому переходы статуса PENDING/PROCESSING → COMPLETED/FAILED подменяются на уровне сети через `page.route('**/meetings/*/files', …)` (тот же приём, что и в тесте прогресса загрузки в meeting-file.spec.ts) — сама загрузка файла и остальной путь идут через реальный API
  profile.spec.ts             — Playwright e2e-тесты страницы профиля: дефолтное имя (часть email до @) и заглушка аватара без данных профиля, отображение имени/аватара (заданных через API-хелперы) на /profile и в шапке главной страницы
  profile-edit.spec.ts         — Playwright e2e-тесты редактирования профиля: изменение имени через форму (отражается на /profile и в шапке главной), загрузка аватара через file input (валидный файл обновляет аватар в обоих местах), отклонение недопустимого типа/размера файла с понятной ошибкой без потери страницы, удаление аватара через AlertDialog с возвратом к заглушке
  helpers/api.ts                — хелперы для подготовки данных теста напрямую через API apps/api. registerUser возвращает RegisteredUser `{ accessToken, refreshTokenCookie }`: accessToken — для остальных хелперов (createMeeting/uploadMeetingFile/getMeeting/updateProfileName/uploadAvatar), которые авторизуются Bearer-заголовком (fallback в JwtAuthGuard, см. apps/api/CLAUDE.md) — это Node-хелперы, идущие мимо браузерного контекста теста; refreshTokenCookie — сырое значение заголовка Set-Cookie из ответа /auth/register, для helpers/session.ts
  helpers/session.ts             — setSessionCookie(context, rawSetCookieHeader) — сидирует refresh-токен (из RegisteredUser.refreshTokenCookie) в httpOnly-куку через BrowserContext.addCookies (domain: 'localhost', path: '/auth'), минуя реальный login-флоу; дальше приложение само восстанавливает access-токен в памяти через silent-refresh при монтировании (useSession)
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
