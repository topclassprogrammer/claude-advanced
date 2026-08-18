# apps/web

Фронтенд на Next.js 16 (App Router) + React 19 + TypeScript. Реализованы страницы регистрации (`src/app/auth/register/page.tsx`, маршрут `/auth/register`) и входа (`src/app/auth/login/page.tsx`, маршрут `/auth/login`), подключённые к `POST /auth/register` и `POST /auth/login` в `apps/api`; страницы ссылаются друг на друга. Главная страница `src/app/page.tsx` (маршрут `/`) доступна только авторизованным пользователям: содержимое (лого + email + кнопка «Выйти», секции со встречами) выровнено по центру в колонке `max-w-2xl`. Показывает список встреч текущего пользователя, подключённый к `GET /meetings`: секция «Последние встречи» (3 самые новые по `createdAt`, подсвечены `bg-accent-soft`) и секция «Все встречи» (полный список, `bg-default`) — каждая внутри одной `Card` со строками-встречами (заголовок, дата с иконкой `IconCalendar`, участники с иконкой `UsersIcon`).

Защита `/` — клиентская: при отсутствии `accessToken` в `localStorage` страница редиректит на `/auth/login` через `next/navigation`; серверного middleware/проверки нет.

## UI-библиотека

Подключен HeroUI v3 (`@heroui/react`, `@heroui/styles`, `tailwind-variants`) поверх Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`). Провайдер не требуется (v3 не использует `HeroUIProvider`). Стили подключаются в `src/app/globals.css` через `@import "tailwindcss";` и `@import "@heroui/styles";` (порядок важен — эти импорты должны идти первыми в файле). PostCSS настроен в `postcss.config.mjs`. Компоненты HeroUI — compound-паттерн (`<Card><Card.Header>...`), события — `onPress` вместо `onClick`; страницы/компоненты, использующие обработчики событий, должны быть клиентскими (`"use client"`).

Тема — только светлая (HeroUI-переменные `--background`/`--foreground`/`--surface` и т.д. из `@heroui/styles` берутся как есть, без переопределения в `globals.css`). Переопределять `--background`/`--foreground` напрямую в `:root` через `@media (prefers-color-scheme: dark)` нельзя — эти имена совпадают с переменными темы HeroUI, которая переключает палитру по атрибуту `data-theme` (`light`/`dark`), а не по `prefers-color-scheme`; такое переопределение ломает контраст текста на поверхностях HeroUI (например, лейблы становятся нечитаемыми на карточках). Тёмную тему добавлять только через `next-themes` (`attribute="class"`) по инструкции HeroUI, если/когда она понадобится.

## Обращение к API

Адрес `apps/api` задаётся переменной окружения `NEXT_PUBLIC_API_URL` (см. `.env.example`, локально — `.env.local`, по умолчанию `http://localhost:3001`). Клиенты — тонкие обёртки над `fetch`, кидающие `ApiError` с сообщением из ответа API при ошибке: `src/lib/auth-api.ts` (`/auth/register`, `/auth/login`) и `src/lib/meeting-api.ts` (`GET /meetings`, требует `Authorization: Bearer <accessToken>`). API должен разрешать CORS для origin'а веб-приложения (см. `WEB_ORIGIN` в `apps/api/CLAUDE.md`).

Токен хранится в `localStorage` под ключом `accessToken`; доступ к нему — только через `src/lib/session.ts` (`getAccessToken`/`setAccessToken`/`clearAccessToken`), а не напрямую. `getEmailFromToken` там же декодирует email из payload JWT (без проверки подписи) для отображения в UI — эндпоинта `/auth/me` в API нет.

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
  page.tsx            — главная страница (маршрут /; список встреч текущего пользователя, требует авторизации)
  auth/
    register/
      page.tsx              — страница регистрации (маршрут /auth/register; форма email/пароль на HeroUI, вызывает src/lib/auth-api.ts, ссылка на /auth/login)
    login/
      page.tsx              — страница входа (маршрут /auth/login; форма email/пароль на HeroUI, вызывает src/lib/auth-api.ts, ссылка на /auth/register)
  globals.css           — глобальные стили (+ импорты tailwindcss и @heroui/styles)
src/components/
  BrandIcon.tsx              — иконка-лого (синий квадрат с камерой), переиспользуется в Logo.tsx и на главной странице
  Logo.tsx                  — логотип (BrandIcon + название) для страниц авторизации
  icons/EyeIcon.tsx           — SVG-иконки EyeIcon/EyeOffIcon (переключатель видимости пароля)
  icons/UsersIcon.tsx         — SVG-иконка участников встречи (список встреч на главной странице)
src/lib/
  auth-api.ts               — fetch-клиент для /auth/* эндпоинтов apps/api (NEXT_PUBLIC_API_URL)
  meeting-api.ts             — fetch-клиент для GET /meetings
  session.ts                 — хранение accessToken в localStorage, декодирование email из JWT
public/                    — статические ассеты (svg-иконки)
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
