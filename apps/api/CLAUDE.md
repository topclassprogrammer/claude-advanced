# apps/api

Бэкенд на NestJS 11 (TypeScript). Пока в стартовом шаблонном состоянии — только `AppModule` / `AppController` / `AppService`, реальная доменная логика ещё не добавлена.

## Команды (запускать из этой директории или через `--workspace=api` из корня)

```
npm run start:dev     # dev-сервер с watch
npm run start:debug    # dev-сервер с inspector
npm run build           # сборка в dist/
npm run start:prod      # запуск собранного билда (node dist/main)
npm run lint             # eslint --fix
npm run format            # prettier --write
npm run test              # unit-тесты (jest)
npm run test:watch
npm run test:cov
npm run test:e2e          # e2e-тесты (jest, конфиг test/jest-e2e.json)
```

По умолчанию сервер слушает порт из `process.env.PORT`, иначе `3000`.

## Структура

```
src/
  main.ts              — точка входа, bootstrap Nest-приложения
  app.module.ts         — корневой модуль
  app.controller.ts      — контроллер (+ app.controller.spec.ts — unit-тест)
  app.service.ts          — сервис
test/
  app.e2e-spec.ts         — e2e-тест
  jest-e2e.json            — конфиг Jest для e2e
```

## Соглашения

- Jest для unit-тестов настроен прямо в `package.json` (`rootDir: src`, паттерн `*.spec.ts`), для e2e — отдельный `test/jest-e2e.json`.
- Prettier конфиг — `.prettierrc`; ESLint — `eslint.config.mjs` (flat config, интегрирован с prettier через `eslint-config-prettier` / `eslint-plugin-prettier`).
- Новые модули/контроллеры/сервисы добавлять через Nest CLI (`nest g module|controller|service <name>`) для соблюдения структуры и автогенерации spec-файлов.

## Поддержка документации в актуальном состоянии

При изменении архитектуры приложения (новые модули, изменение структуры `src/`, смена ключевых команд, добавление внешних зависимостей типа БД/очередей/кэша, изменение точки входа или конфигурации) — обновлять этот файл в том же коммите/PR, где вносится изменение. Если изменение затрагивает и корневой монорепозиторий (например, новый workspace-скрипт), обновлять также корневой `CLAUDE.md`.
