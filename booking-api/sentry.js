// Sentry wrapper. Inits only when SENTRY_DSN env var is present, so the same
// code runs unchanged with or without an active Sentry account: captureException
// becomes a no-op locally and on Railway until the env var is set.
//
// Why this exists: console.error currently dies in Railway logs. Nothing alerts
// when /api/stripe-webhook starts failing, when calendar event creation throws,
// or when the bot crashes. Sentry gives a per-error trace + a single dashboard
// where the operator can see error rate over time without grep'ing logs.

const Sentry = require('@sentry/node');

const enabled = !!process.env.SENTRY_DSN;

if (enabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'production',
    // Send 10% of transactions for performance traces. Free tier on sentry.io is
    // 10K errors + 10K transactions / month; this keeps headroom for spikes.
    tracesSampleRate: 0.1,
    // Trim noise: ECONNRESET on long-running pollers is normal for node-telegram-bot-api.
    ignoreErrors: ['ECONNRESET', 'EFATAL'],
  });
  console.log('Sentry: initialized');
} else {
  console.log('Sentry: SENTRY_DSN not set, skipping (errors stay in console only)');
}

// Safe to call regardless of init state. Adds optional context as Sentry "extras"
// so a single error report shows the full surrounding state (sessionId, date, etc).
function captureException(err, context) {
  if (!enabled) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

module.exports = { Sentry, captureException, enabled };
