# booking-api

Stripe checkout + Google Calendar + Telegram bot + Resend mailer.
Deployed on Railway from `main`. `git push` = deploy.

## Auth model

Uses Google OAuth2 with a long-lived refresh token, acting as the Workspace user
`talkwith@levashou.pl`. The user owns the calendar, so events appear in their
calendar and Google Meet links are generated automatically per event.

(Old setup used a service account against `goalcoachup@gmail.com` with a
hardcoded Meet link. That setup is retired; existing bookings made under it stay
in the old calendar and are managed manually.)

## Required env vars (Railway)

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
TELEGRAM_BOT_TOKEN

GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_CALENDAR_ID=talkwith@levashou.pl

CONTACT_EMAIL=goalcoachup@gmail.com  (optional, defaults to this)
```

Old (no longer used; remove after the new setup is verified):
```
GOOGLE_SERVICE_ACCOUNT_JSON
```

## One-time: get the refresh token

1. In Google Cloud Console, create OAuth 2.0 Client ID, type **Desktop app**.
   Copy Client ID + Client Secret.
2. Locally:
   ```
   cd booking-api
   cp .env.local.example .env.local
   # edit .env.local: paste GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET
   npm install
   node scripts/get-refresh-token.js
   ```
3. Browser opens. Sign in as `talkwith@levashou.pl`, allow Calendar access.
4. Copy the printed `refresh_token` into Railway as `GOOGLE_OAUTH_REFRESH_TOKEN`.

If Google does not return a `refresh_token`, revoke access at
<https://myaccount.google.com/permissions> and re-run.

## Smoke test before every push

```
cd booking-api
node test-flow.js
```

Creates a `[SMOKE TEST]` event 28+ days out on a scheduled weekday, verifies:
- event has a unique Google Meet link
- event time is correct in Europe/Warsaw
- attendee was added
- freebusy reports the slot as busy

then deletes the event. Exits non-zero on any failure. Do not push if it fails.

If cleanup fails for any reason, you will see the event ID in the output:
delete it manually in Google Calendar.

## Deploy checklist

1. **Google Cloud**: OAuth Desktop app credentials exist
2. **Local**: `node scripts/get-refresh-token.js` succeeded, you have the token
3. **Railway env**: 4 new vars added (`GOOGLE_OAUTH_*` + updated `GOOGLE_CALENDAR_ID`)
4. **Local sanity**: `node test-flow.js` passes
5. **Push**: `git push` triggers Railway deploy
6. **Post-deploy**: do one real test booking on the site to verify the full
   chain (Stripe checkout, webhook, calendar event, Meet link in email)
7. **Cleanup**: once verified working for ~1 week, remove `GOOGLE_SERVICE_ACCOUNT_JSON`
   from Railway

## Operational notes

- Refresh tokens can be revoked by Google after long inactivity or password
  change. If the API starts erroring with auth failures, re-run
  `scripts/get-refresh-token.js` and update the Railway env.
- If `events.insert` fails after a Stripe payment, the bot pings Telegram with
  a `🚨 ПЛАТЁЖ ПРОШЁЛ, КАЛЕНДАРЬ НЕ ЗАПИСАН` alert. Handle manually:
  create the event yourself, email the client with date/time/Meet link.
- Reminder emails parse `Google Meet:` line from event description (or the
  event's `hangoutLink` field). Both should match the unique per-booking link.
