export const accountPersistenceUnavailableMessage = "Account data is temporarily unavailable. Try again shortly.";

export class AccountPersistenceUnavailableError extends Error {
  readonly cause?: unknown;
  readonly scope: string;
  readonly status = 503;

  constructor(scope: string, cause?: unknown) {
    super(accountPersistenceUnavailableMessage);
    this.name = "AccountPersistenceUnavailableError";
    this.scope = scope;
    this.cause = cause;
  }
}

export function hasConfiguredAccountPersistence() {
  return Boolean(process.env.DATABASE_URL);
}

export function logAccountPersistenceFailure(scope: string, error: unknown) {
  const errorName =
    error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name) ? error.name : "UnknownError";
  const detail: { code?: string; name: string } = {
    name: errorName
  };

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z0-9_]+$/.test(code)) detail.code = code;
  }

  console.error(`[account-persistence] ${scope} failed`, detail);
}

export function throwAccountPersistenceUnavailable(scope: string, cause?: unknown): never {
  if (cause instanceof AccountPersistenceUnavailableError) throw cause;
  console.error(`[account-persistence] ${scope} unavailable`);
  throw new AccountPersistenceUnavailableError(scope, cause);
}

export function assertAccountMemoryPersistenceAllowed(scope: string) {
  if (hasConfiguredAccountPersistence()) throwAccountPersistenceUnavailable(scope);
}

export function isAccountPersistenceUnavailableError(error: unknown): error is AccountPersistenceUnavailableError {
  return error instanceof AccountPersistenceUnavailableError;
}

export function fallbackUnlessAccountPersistenceUnavailable<T>(error: unknown, fallback: T): T {
  if (isAccountPersistenceUnavailableError(error)) throw error;
  return fallback;
}

export async function runAccountPersistenceOperation<T>(scope: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throwAccountPersistenceUnavailable(scope, error);
  }
}

type AccountPersistenceRouteHandler<Arguments extends unknown[]> = (...args: Arguments) => Promise<Response>;

export function withAccountPersistenceRoute<Arguments extends unknown[]>(
  handler: AccountPersistenceRouteHandler<Arguments>
): AccountPersistenceRouteHandler<Arguments> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (!isAccountPersistenceUnavailableError(error)) throw error;

      return Response.json(
        { error: accountPersistenceUnavailableMessage },
        {
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "30"
          },
          status: 503
        }
      );
    }
  };
}
