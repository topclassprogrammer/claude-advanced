# apps/api

Бэкенд на NestJS 11 (TypeScript), персистентность — PostgreSQL через Prisma ORM 7. Модули: `UsersModule`, `AuthModule` (JWT), `MeetingModule`, `MeetingFileModule`, `ProfileModule` — детали по каждому и его эндпоинтам см. в «Структуре» ниже. Бизнес-логика организована по паттерну CQRS (`@nestjs/cqrs`, см. раздел «CQRS»); межмодульное взаимодействие — только через `CommandBus`/`QueryBus`, без прямых импортов хендлеров/провайдеров другого модуля.

## Команды (запускать из этой директории или через `--workspace=api` из корня)

Скрипты — см. `package.json`. Про `test`/`test:e2e` — подробности в разделе «Тесты» ниже.

Порт — `process.env.PORT` (в `apps/api/.env` задан как `3001`, не конфликтует с `apps/web` на 3000), иначе по умолчанию `3000`.

CORS включён (`app.enableCors()` в `main.ts`) для origin'а из `process.env.WEB_ORIGIN` (по умолчанию `http://localhost:3000`, задаётся в `apps/api/.env`/`.env.example`) — чтобы `apps/web` мог напрямую вызывать API из браузера.

## База данных

PostgreSQL поднимается через корневой `docker-compose.yml` (сервис `postgres`, хост-порт **5433**, чтобы не конфликтовать с локально установленным PostgreSQL на порту 5432). Строка подключения задаётся в `apps/api/.env` (`DATABASE_URL`), пример — в `.env.example`. `.env` в git не коммитится.

Prisma 7 требует driver adapter для SQL-провайдеров: используется `@prisma/adapter-pg` поверх `pg`. Generator сконфигурирован с `moduleFormat = "cjs"` (проект целиком на CommonJS), клиент генерируется в `apps/api/generated/prisma` (не коммитится, генерируется командой `prisma:generate`).

## Безопасность

- Rate limiting — `@nestjs/throttler`, глобальный гвард (`APP_GUARD`) с лимитом по умолчанию 100 запросов/мин; `/auth/register`, `/auth/login` и `PATCH /users/me/password` дополнительно ограничены декоратором `@Throttle` до 5 запросов/мин. В e2e-тестах (`NODE_ENV=test`) throttling отключается целиком (`NoopThrottlerGuard` в `app.module.ts`) — реальные спеки регистрируют по нескольку пользователей с одного IP в `beforeEach` и упёрлись бы в лимит за пару файлов.
- `main.ts` подключает `helmet()` (security headers, включая `X-Content-Type-Options: nosniff` — значимо для эндпоинтов, отдающих файлы с client-controlled `Content-Type`) и падает при старте, если `WEB_ORIGIN` не задан в `NODE_ENV=production`; CORS ограничен явным списком методов/заголовков.
- Логин (`LoginHandler`) выполняет `bcrypt.compare` с фиктивным хешем, даже если email не найден — постоянное время ответа не позволяет отличить «нет такого email» от «неверный пароль» (user enumeration через timing).
- Авторизация файлов встречи симметрична авторизации самой встречи: загрузка/чтение метаданных/скачивание/удаление файлов доступны только организатору встречи (403 для остальных) — как и `GET /meetings/:id`, который 404-ит для не-организатора. Ранее загрузка/чтение/скачивание были открыты любому авторизованному пользователю системы; сужено до организатора как исправление IDOR.
- Имя файла на диске для файлов встреч и аватаров формируется из `randomUUID()` + расширение, выбранное по allowlist MIME-типа (`MIME_TO_EXTENSION` / `AVATAR_MIME_TO_EXTENSION`), а не из client-controlled `file.originalname` — клиент не может задать произвольное расширение. Полноценная проверка содержимого по magic bytes по-прежнему не реализована (см. gap ниже).
- Ответы `POST/GET /meetings/:id/files` не содержат `storagePath` (абсолютный путь на диске сервера) — используется `MeetingFileRecord`/`toMeetingFileRecord` (`meeting-file.types.ts`) вместо сырой Prisma-модели.
- `:id`/`:fileId` в путях `meetings`/`meeting-file` контроллеров проверяются `ParseUUIDPipe` (400 на не-UUID вместо лишнего похода в БД).
- `ValidationPipe` глобально сконфигурирован с `forbidNonWhitelisted: true` (дополнительно к `whitelist`/`transform`) — неизвестные поля в теле запроса отклоняются 400, а не молча отбрасываются.
- `MeetingFile.mimeType`/`avatarMimeType` по-прежнему проверяются по заявленному `file.mimetype` от multer (значение из `Content-Type` части multipart-запроса) против allowlist — это значение подделывается клиентом, полноценная проверка по magic bytes не реализована (известный принятый gap безопасности).

## Тесты

- `npm run test` — unit-тесты (Jest, конфиг в `package.json`, `rootDir: src`, паттерн `*.spec.ts`). На данный момент в проекте нет ни одного unit-спека — команда настроена с флагом `--passWithNoTests` и завершается успешно (код 0), а не падает с "No tests found".
- `npm run test:watch` — unit-тесты в watch-режиме.
- `npm run test:cov` — unit-тесты с отчётом покрытия (тоже с `--passWithNoTests`).
- `npm run test:e2e` — e2e-тесты (Jest, конфиг `test/jest-e2e.json`, флаг `--runInBand`). **Требуют поднятой PostgreSQL**: перед запуском выполнить `docker compose up -d` из корня репозитория и убедиться, что `apps/api/.env` содержит рабочий `DATABASE_URL` (см. `.env.example`). Тесты используют реальную БД (не мок и не отдельную тестовую БД) и чистят задействованные таблицы в `beforeEach`; `--runInBand` обязателен, так как спеки работают с общими таблицами и гонка при параллельном запуске между файлами ломает тесты.
- `npm run test:debug` — unit-тесты с Node-инспектором (`--inspect-brk`), для пошаговой отладки в IDE.
- Оба Jest-конфига (`test` и `test:e2e`) запускаются с `NODE_OPTIONS=--experimental-vm-modules` (через `cross-env`) — сгенерированный Prisma Client 7 динамически импортирует WASM query compiler, что без этого флага не работает под Jest — и содержат `moduleNameMapper` для `.js`-импортов из сгенерированного Prisma Client (nodenext-стиль относительных импортов).
- При добавлении нового модуля/хендлера с бизнес-логикой — покрывать его e2e-тестом по образцу `test/auth.e2e-spec.ts` / `test/meeting.e2e-spec.ts` (там же — референс по очистке таблиц и структуре `describe`/`it`).

## Структура

```
prisma/
  schema.prisma          — схема БД (модели User, Meeting — с необязательным полем description, MeetingFile) и generator/datasource
  migrations/              — SQL-миграции
src/
  main.ts                    — точка входа, bootstrap Nest-приложения
  app.module.ts                — корневой модуль (ConfigModule, PrismaModule, AuthModule, MeetingModule, глобальный ValidationPipe); собственных контроллеров/провайдеров не имеет
  prisma/
    prisma.service.ts             — PrismaClient как Nest-провайдер (connect/disconnect по хукам жизненного цикла)
    prisma.module.ts                — глобальный модуль, экспортирует PrismaService
  users/
    users.module.ts                   — регистрирует CqrsModule; providers = хендлеры команд/запросов (ничего не экспортирует — с модулем взаимодействуют только через CommandBus/QueryBus)
    user.types.ts                       — интерфейс `UserRecord` (id, email, password) — тип результата хендлеров, используется и в `AuthModule`
    commands/impl/create-user.command.ts, commands/handlers/create-user.handler.ts — создание пользователя: проверяет уникальность email (409 `ConflictException` при дубликате), хеширует пароль (bcrypt) и сохраняет через `PrismaService`
    queries/impl/find-user-by-email.query.ts, queries/handlers/find-user-by-email.handler.ts — поиск пользователя по email через `PrismaService`, возвращает `UserRecord | null` (включая хеш пароля — нужен `AuthModule` для проверки при логине)
  auth/
    auth.module.ts                   — регистрирует CqrsModule, JwtModule (секрет валидируется при старте — обязателен, минимум 32 символа, TTL из ConfigService, `signOptions.algorithm: 'HS256'`) и импортирует UsersModule (для общего CommandBus/QueryBus в графе Nest); экспортирует JwtModule и JwtAuthGuard для использования другими модулями
    auth.controller.ts                — POST /auth/register (CommandBus), POST /auth/login (QueryBus), оба ограничены декоратором `@Throttle` до 5 запросов/мин
    auth-token.service.ts               — общая выдача JWT (payload sub/email), используется обоими хендлерами
    jwt-auth.guard.ts                    — гвард `JwtAuthGuard` (асинхронный): проверяет Bearer-токен (подпись/алгоритм `HS256`/срок действия) и `passwordChangedAt` через `PrismaService`, кладёт payload в `request.user` (401 при отсутствии/невалидности/протухании токена)
    current-user.decorator.ts             — параметр-декоратор `@CurrentUser()`, достаёт `request.user`
    express.d.ts                           — расширение типа `express.Request` полем `user`
    commands/impl/register.command.ts, commands/handlers/register.handler.ts — регистрация: отправляет `CreateUserCommand` в `UsersModule` через `CommandBus`, затем выдаёт JWT
    queries/impl/login.query.ts, queries/handlers/login.handler.ts           — логин: отправляет `FindUserByEmailQuery` в `UsersModule` через `QueryBus`, проверяет пароль (bcrypt.compare, 401 при отсутствии пользователя или неверном пароле), затем выдаёт JWT
    dto/register.dto.ts, dto/login.dto.ts — class-validator DTO
  meeting/
    meeting.module.ts                 — импортирует CqrsModule и AuthModule (для JwtAuthGuard)
    meeting.controller.ts               — POST /meetings, GET /meetings, GET /meetings/:id, DELETE /meetings/:id — все под `@UseGuards(JwtAuthGuard)`
    commands/impl/create-meeting.command.ts, commands/handlers/create-meeting.handler.ts — создание встречи для текущего пользователя (organizerId = sub из токена)
    commands/impl/delete-meeting.command.ts, commands/handlers/delete-meeting.handler.ts — удаляет встречу: 404, если не найдена; 403, если запрашивающий не организатор; удаление каскадно сносит запись MeetingFile (onDelete: Cascade в схеме), файл на диске (если был) удаляется тем же хендлером
    queries/impl/get-meetings.query.ts, queries/handlers/get-meetings.handler.ts — список встреч текущего пользователя
    queries/impl/get-meeting-by-id.query.ts, queries/handlers/get-meeting-by-id.handler.ts — встреча по id, ищется вместе с organizerId (404, если не найдена или принадлежит другому пользователю)
    dto/create-meeting.dto.ts — class-validator DTO (title, date как ISO8601-строка, description — необязательная строка, participants — массив строк)
  meeting-file/
    meeting-file.module.ts               — импортирует CqrsModule и AuthModule (для JwtAuthGuard)
    meeting-file.controller.ts             — POST /meetings/:id/files (загрузка), GET /meetings/:id/files (список метаданных, до 10), GET /meetings/:id/files/:fileId/download (скачивание, `StreamableFile`), DELETE /meetings/:id/files/:fileId (204 No Content) — все под `@UseGuards(JwtAuthGuard)`; все операции (загрузка/чтение/скачивание/удаление) доступны только организатору встречи (403 для остальных)
    meeting-file.constants.ts               — `MAX_FILE_SIZE_BYTES` (100 МБ), `MAX_FILES_PER_MEETING` (10), `ALLOWED_MIME_TYPES`, `STORAGE_DIR` (`apps/api/storage/meeting-files`, создаётся при загрузке модуля, в `.gitignore`)
    content-disposition.util.ts              — `buildContentDisposition(filename)` — обёртка над пакетом `content-disposition` (RFC 6266), корректно экранирует спецсимволы и не-ASCII (кириллица) имена файлов
    filters/multer-exception.filter.ts       — `MulterExceptionFilter` (`@Catch(MulterError)`), применяется на `POST :id/files` — превращает multer'овскую `LIMIT_FILE_SIZE` в понятный JSON-ответ 413, остальные multer-ошибки — 400
    commands/impl/upload-meeting-file.command.ts, commands/handlers/upload-meeting-file.handler.ts — проверяет существование встречи (404), что запрашивающий — организатор (403), допустимость MIME-типа (400, файл с диска удаляется при отказе) и лимит файлов на встречу (409 `ConflictException`, файл с диска удаляется при отказе, если у встречи уже `MAX_FILES_PER_MEETING` записей `MeetingFile`), затем создаёт новую запись `MeetingFile` (файлы не заменяют друг друга — встреча может иметь до 10 одновременно)
    commands/impl/delete-meeting-file.command.ts, commands/handlers/delete-meeting-file.handler.ts — удаляет один файл встречи по `fileId`: 404, если встреча не найдена или файл не найден/принадлежит другой встрече; 403, если запрашивающий не организатор встречи; удаляет запись в БД и файл с диска
    queries/impl/download-meeting-file.query.ts, queries/handlers/download-meeting-file.handler.ts — проверяет, что встреча существует и запрашивающий — организатор (иначе 404/403), затем находит `MeetingFile` по `fileId` (404, если не найден или `meetingId` не совпадает), для скачивания
    queries/impl/get-meeting-files.query.ts, queries/handlers/get-meeting-files.handler.ts — проверяет, что встреча существует и запрашивающий — организатор (иначе 404/403), затем список `MeetingFile` по `meetingId`, отсортированный по `uploadedAt` по убыванию (самые новые первыми); пустой список, если файлов нет
  profile/
    profile.module.ts                 — импортирует CqrsModule и AuthModule (для JwtAuthGuard)
    profile.controller.ts               — GET /users/me, PATCH /users/me/name, PATCH /users/me/password, POST /users/me/avatar (загрузка/замена, `FileInterceptor('avatar')`), DELETE /users/me/avatar, GET /users/me/avatar (отдача файла, `StreamableFile`) — все под `@UseGuards(JwtAuthGuard)`; загрузка переиспользует `MulterExceptionFilter` из `meeting-file/filters` (413 при превышении `MAX_AVATAR_SIZE_BYTES`)
    profile.constants.ts                 — `MAX_AVATAR_SIZE_BYTES` (5 МБ), `ALLOWED_AVATAR_MIME_TYPES` (JPEG/PNG/WebP), `AVATAR_STORAGE_DIR` (`apps/api/storage/avatars`, создаётся при загрузке модуля, в `.gitignore`)
    profile.types.ts                     — интерфейс `ProfileRecord` (email, name, avatarUrl — `/users/me/avatar` или `null`) — тип результата хендлеров
    commands/impl/update-profile-name.command.ts, commands/handlers/update-profile-name.handler.ts — обновляет `User.name` текущего пользователя (404, если пользователь не найден)
    commands/impl/change-password.command.ts, commands/handlers/change-password.handler.ts — сверяет `oldPassword` (`bcrypt.compare`, 401 при несовпадении), хеширует и сохраняет `newPassword` (404, если пользователь не найден)
    commands/impl/upload-avatar.command.ts, commands/handlers/upload-avatar.handler.ts — проверяет MIME-тип (400, файл удаляется с диска при отказе), сохраняет `avatarPath`/`avatarMimeType`/`avatarUploadedAt`; при замене удаляет старый файл
    commands/impl/delete-avatar.command.ts, commands/handlers/delete-avatar.handler.ts — удаляет файл аватара с диска, очищает `avatarPath`/`avatarMimeType`/`avatarUploadedAt` в БД
    queries/impl/get-profile.query.ts, queries/handlers/get-profile.handler.ts — email и имя текущего пользователя; если `User.name` не задано, вычисляет имя как часть email до `@`
    queries/impl/get-avatar-file.query.ts, queries/handlers/get-avatar-file.handler.ts — путь и MIME-тип файла аватара текущего пользователя для отдачи (404, если аватар не задан)
    dto/update-profile-name.dto.ts — class-validator DTO (name, обязательная непустая строка)
    dto/change-password.dto.ts — class-validator DTO (oldPassword — обязательная непустая строка, newPassword — строка минимум 8 символов)
test/
  auth.e2e-spec.ts             — e2e-тесты /auth/register и /auth/login (используют реальную БД, очищают таблицу User в beforeEach)
  meeting.e2e-spec.ts          — e2e-тесты /meetings (используют реальную БД, очищают таблицы Meeting и User в beforeEach; проверяют изоляцию встреч между пользователями)
  meeting-file.e2e-spec.ts     — e2e-тесты загрузки/списка/скачивания/удаления файлов встречи, включая лимит 10 файлов на встречу (409 на 11-й), выборочное удаление одного файла и 403 для не-организатора на всех четырёх операциях (используют реальную БД, очищают таблицы MeetingFile, Meeting и User в beforeEach)
  profile.e2e-spec.ts          — e2e-тесты GET /users/me, PATCH /users/me/name, PATCH /users/me/password (включая отклонение неверного старого пароля, логин новым паролем после смены и инвалидацию ранее выданного access-токена) и загрузки/замены/удаления/отдачи аватара (POST/DELETE/GET /users/me/avatar, включая отклонение недопустимого MIME-типа и файла > 5 МБ, замену с удалением старого файла с диска, `avatarUrl` в ответе `GET /users/me`) — используют реальную БД, очищают таблицы Meeting и User в beforeEach
  jest-e2e.json                 — конфиг Jest для e2e
```

## CQRS

Бизнес-логика организована по паттерну CQRS через `@nestjs/cqrs`. Разделение: **мутации** (создание/изменение данных) — Command, **чтения** — Query. Оба модуля с бизнес-логикой (`AuthModule`, `MeetingModule`) импортируют `CqrsModule` и следуют одной структуре.

Поток запроса: `Controller` → (`CommandBus.execute()` / `QueryBus.execute()`) → соответствующий `*Handler` → `PrismaService`. Контроллер не содержит бизнес-логики — только валидацию входа (DTO) и делегирование в шину.

Структура на модуль:

```
<module>/
  commands/
    impl/<action>.command.ts        — класс Command, поля readonly в конструкторе (данные запроса)
    handlers/<action>.handler.ts    — @CommandHandler(<Action>Command), implements ICommandHandler<Command, Result>
  queries/
    impl/<action>.query.ts          — класс Query, поля readonly в конструкторе
    handlers/<action>.handler.ts    — @QueryHandler(<Action>Query), implements IQueryHandler<Query, Result>
  <module>.module.ts                 — импортирует CqrsModule; providers = [...CommandHandlers, ...QueryHandlers] (массивы объявлены в начале файла модуля)
  <module>.controller.ts             — инжектит CommandBus и QueryBus, по одному методу на роут
```

Конкретные Command/Query-классы и что делают их хендлеры — см. «Структуру» ниже. Общий момент: `organizerId`/`requesterId` передаются в команды и запросы из `@CurrentUser()` (JWT `sub`), а не из тела запроса, чтобы нельзя было создать/прочитать/удалить чужую сущность от чужого имени.

Соглашения по CQRS:
- Один хендлер обрабатывает ровно один Command/Query (`@CommandHandler`/`@QueryHandler` принимает один класс).
- Хендлеры и Command/Query-классы не импортируются друг в друга напрямую за пределами своей пары — контроллер не обращается к хендлерам, только к шинам.
- HTTP-исключения (`NotFoundException`, `ConflictException`, `UnauthorizedException` и т.д.) кидаются из хендлера — Nest сам транслирует их в HTTP-ответ.
- При добавлении нового модуля с бизнес-логикой — придерживаться этой же структуры (`commands/impl`, `commands/handlers`, `queries/impl`, `queries/handlers`) вместо сервисов с прямой логикой в контроллере.
- **Межмодульное взаимодействие** (например, `AuthModule` → `UsersModule`) идёт только через `CommandBus`/`QueryBus`, а не через прямой импорт сервисов/хендлеров одного модуля в другой: `CqrsModule` (без `forRoot`) де-дуплицируется Nest'ом как один и тот же узел графа при импорте в нескольких модулях, поэтому `CommandBus`/`QueryBus`/`EventBus` — синглтоны на всё приложение, и хендлеры, зарегистрированные в одном модуле, доступны через шину из любого другого модуля вне зависимости от того, импортирует ли он модуль-владелец хендлеров напрямую. Модуль всё равно стоит импортировать явно (как `AuthModule` импортирует `UsersModule`) — это фиксирует зависимость в графе Nest и явно показывает связь между модулями, даже если технически не обязательно для работы шины.

## Соглашения

- Prettier конфиг — `.prettierrc`; ESLint — `eslint.config.mjs` (flat config, интегрирован с prettier через `eslint-config-prettier` / `eslint-plugin-prettier`).
- Новые модули/контроллеры/сервисы добавлять через Nest CLI (`nest g module|controller|service <name>`) для соблюдения структуры и автогенерации spec-файлов.
- Логин ищет пользователя и не создаёт его при отсутствии (401 Unauthorized); регистрация создаёт пользователя и возвращает 409 Conflict при дубликате email.
- Роуты `/meetings/*` требуют заголовок `Authorization: Bearer <accessToken>` (проверяется `JwtAuthGuard` из `AuthModule`); `Meeting.organizerId` имеет `onDelete: Cascade` на связи с `User`, чтобы удаление пользователя не оставляло висящих встреч и не ломало очистку таблиц в e2e-тестах.
- После изменения `prisma/schema.prisma` — прогонять `npm run prisma:migrate:dev` (создаёт и применяет миграцию) и `npm run prisma:generate`.
- `MeetingFile.mimeType` проверяется по заявленному `file.mimetype` от multer (значение из `Content-Type` части multipart-запроса) против allowlist в `meeting-file.constants.ts` — это значение подделывается клиентом, полноценная проверка по magic bytes не реализована (известный gap безопасности). Реализуя/меняя загрузку файлов — используй @docs/research-meeting-file-upload.md (там же §1 про этот gap).
- Авторизация на файл встречи симметрична авторизации самой встречи: загрузка/чтение метаданных/скачивание/удаление доступны только организатору встречи (403 для остальных, каждый хендлер сверяет `Meeting.organizerId` с `requesterId` из JWT).

## Поддержка документации в актуальном состоянии

При изменении архитектуры приложения (новые модули, изменение структуры `src/`, смена ключевых команд, добавление внешних зависимостей типа БД/очередей/кэша, изменение точки входа или конфигурации) — обновлять этот файл в том же коммите/PR, где вносится изменение. Если изменение затрагивает и корневой монорепозиторий (например, новый workspace-скрипт), обновлять также корневой `CLAUDE.md`.


