const NON_PRODUCTION_ENVS = new Set(['development', 'test']);

/**
 * Fail-closed по умолчанию: production-режим безопасности (throttling,
 * Secure-кука и т.п.) включён при любом NODE_ENV, кроме явно известных
 * dev/test-значений. Опечатка или незаданный NODE_ENV на проде не должны
 * тихо отключать защиту.
 */
export function isProductionLikeEnv(): boolean {
  return !NON_PRODUCTION_ENVS.has(process.env.NODE_ENV ?? '');
}
