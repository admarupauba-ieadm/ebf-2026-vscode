let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    const err = (event as ErrorEvent).error ?? event;
    record(err);
    void import("@sentry/react").then(({ captureException }) => captureException(err));
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    record(reason);
    void import("@sentry/react").then(({ captureException }) => captureException(reason));
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
