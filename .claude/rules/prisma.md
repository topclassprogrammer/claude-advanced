---
globs: "**/*.prisma"
---

# Prisma Rules

- UUID для всех id: @id @default(uuid())
- Всегда добавляй createdAt и updatedAt
- ENUM значения в UPPER_CASE
- Связи через @relation с явным именем
- Индексы на foreign keys через @@index


