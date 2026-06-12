import * as Sentry from "@sentry/node";

export function initSentryServer() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
