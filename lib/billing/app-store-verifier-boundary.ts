export const appStoreMaximumActiveVerifications = 4;
export const appStoreVerificationTimeoutMs = 15 * 1000;

export type AppStoreVerificationBoundaryErrorCode =
  | "app_store_verification_capacity_exceeded"
  | "app_store_verification_timed_out";

export class AppStoreVerificationBoundaryError extends Error {
  readonly code: AppStoreVerificationBoundaryErrorCode;
  readonly retryable = true;

  constructor(code: AppStoreVerificationBoundaryErrorCode, message: string) {
    super(message);
    this.name = "AppStoreVerificationBoundaryError";
    this.code = code;
  }
}

type AppStoreVerificationBoundaryOptions = {
  maximumActive: number;
  timeoutMs: number;
};

export function createAppStoreVerificationBoundary({
  maximumActive,
  timeoutMs
}: AppStoreVerificationBoundaryOptions) {
  if (!Number.isInteger(maximumActive) || maximumActive < 1) {
    throw new TypeError("App Store verification capacity must be a positive integer.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("App Store verification timeout must be positive.");
  }

  let activeCount = 0;

  return {
    activeCount() {
      return activeCount;
    },
    async run<T>(operation: () => Promise<T>): Promise<T> {
      if (activeCount >= maximumActive) {
        throw new AppStoreVerificationBoundaryError(
          "app_store_verification_capacity_exceeded",
          "App Store verification capacity is temporarily exhausted."
        );
      }

      activeCount += 1;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        activeCount -= 1;
      };
      const pending = Promise.resolve().then(operation);
      // A caller deadline cannot abort Apple 3.1.0's internal node-fetch call.
      // Keep the slot occupied until the real operation settles so timed-out
      // requests cannot create unbounded background verifier work.
      void pending.then(release, release);

      let timeout: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(
            new AppStoreVerificationBoundaryError(
              "app_store_verification_timed_out",
              "App Store verification exceeded its end-to-end deadline."
            )
          ),
          timeoutMs
        );
      });

      try {
        return await Promise.race([pending, deadline]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }
  };
}

const appStoreVerificationBoundary = createAppStoreVerificationBoundary({
  maximumActive: appStoreMaximumActiveVerifications,
  timeoutMs: appStoreVerificationTimeoutMs
});

export function runAppStoreServerVerification<T>(operation: () => Promise<T>) {
  return appStoreVerificationBoundary.run(operation);
}
