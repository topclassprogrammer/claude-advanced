# src/users

`UsersModule` — user creation and lookup. No controller: it is consumed only via `CommandBus`/`QueryBus`, exclusively by `AuthModule` (register/login). See the root `apps/api/CLAUDE.md` for the CQRS pattern shared across modules.

## Files

- `users.module.ts` — registers `CqrsModule`; `providers` = command/query handlers. Exports nothing — callers reach it only through the bus.
- `user.types.ts` — `UserRecord` interface (`id`, `email`, `password`), the handlers' result type, reused by `AuthModule`.
- `commands/impl/create-user.command.ts`, `commands/handlers/create-user.handler.ts` — creates a user: checks email uniqueness (409 `ConflictException` on duplicate), hashes the password with bcrypt (`PASSWORD_SALT_ROUNDS = 10`), saves via `PrismaService`.
- `queries/impl/find-user-by-email.query.ts`, `queries/handlers/find-user-by-email.handler.ts` — looks up a user by email via `PrismaService`, returns `UserRecord | null` (including the password hash — needed by `AuthModule` to verify login).

## Callers

- `RegisterCommand`/`RegisterHandler` (`auth/commands/`) — sends `CreateUserCommand` through `CommandBus`, then issues a JWT.
- `LoginQuery`/`LoginHandler` (`auth/queries/`) — sends `FindUserByEmailQuery` through `QueryBus`, checks the password, does not create a user on failure (401).
