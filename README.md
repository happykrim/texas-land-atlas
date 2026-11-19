# Texas Land Atlas · County valuation dashboard

A light, responsive county-valuation web application backed by the **existing Supabase `txgio_*` tables and private SVG Storage bucket**. The React client never sees a Supabase secret key. By default `AUTH_ENABLED=false` permits public *report-only* reads through a Node server. Change it to `true` to require an email/password Supabase login and the existing `txgio_report_access` allowlist.

## Project layout

```
client/                  React + TypeScript + Vite + Tailwind
  src/App.tsx             App shell, county dropdown, theme, login state
  src/components/         Login and county report sections
  src/lib/stats.ts        Same linear-quantile middle-range math as Step 08
  src/lib/api.ts          Fetches reports and Supabase login helper
server/                  Reusable server-only Supabase service
  core.ts                Access mode, JWT validation, RLS client
  routes.ts              Config, county list, report, signed SVG URLs
  dev.ts                 Local Express adapter
api/                     Tiny Vercel Node function adapters
.env.example             Environment variables
vercel.json              Static site + Vercel function configuration
```

## 1. Start locally (authentication OFF)

Use Node.js **20 or 22**. Open PowerShell in the project root.

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` (exact names):

```dotenv
AUTH_ENABLED=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_OR_SERVICE_ROLE_KEY
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

**Security:** `SUPABASE_SECRET_KEY` bypasses RLS. It must exist only on the server (`.env` locally, Vercel environment settings on deployment). Never use a `VITE_` prefix for it or commit `.env`. When auth is off, **anyone who can reach this app can see report data and receive short-lived map links**. Use this only for controlled local testing, and enable login *before making the deployed site available publicly*.

```powershell
npm run dev
```

Open **http://localhost:5173**. The Node API runs on port 3001. `npm run dev` starts both; the Vite dev server proxies `/api` to the Node server.

Check the server directly: http://localhost:3001/api/health and http://localhost:3001/api/config. If county dropdown is empty, ensure `txgio_counties` and `txgio_county_reports` contain `status='ready'` data. Storage bucket must be **`txgio-report-maps`**; map objects should be `image/svg+xml`.

## 2. Turn authentication ON and add one user

1. In Supabase dashboard open **Authentication → Users → Add user** (button name may vary). Create the user with an email and a strong password. If you set it to auto-confirm, the user can log in immediately; otherwise complete email confirmation. **Disable public signups** in Authentication settings if only an admin should add users.
2. Copy the new user's **Auth UID** (UUID), not their email address.
3. In **SQL Editor**, allowlist only that user:

   ```sql
   insert into public.txgio_report_access (user_id, access_level)
   values ('REPLACE_WITH_AUTH_USER_UUID', 'admin')
   on conflict (user_id)
   do update set access_level = excluded.access_level;
   ```

4. Confirm your initial `01_txgio_reporting_schema.sql` migration created the `txgio_report_access` table, RLS read policies for counties/reports, and private `txgio-report-maps` SELECT policy.
5. Change `.env` to `AUTH_ENABLED=true`, restart `npm run dev`. The login screen appears. Sign in with the new user. Report API calls now use this user's **JWT** and existing RLS; they do not use a server admin key.
6. Test an unauthorized account: it should not see county report rows or map objects. Test logout and reload. Light/dark themes work on the login page as well as the dashboard.

In production, set `AUTH_ENABLED=true`. You can omit `SUPABASE_SECRET_KEY` when authentication is enabled; it is not needed for authenticated report retrieval.

## 3. Understand the reports

- List available counties from `txgio_county_reports` **ready** rows joined with `txgio_counties` by `county_id` (no new database changes).
- Choose a county and click **Generate report**. The server fetches its latest ready report, signs short-lived links for the two private SVG maps, and returns a single JSON payload to the client.
- The frontend calculates the selected middle 1–100% of `report_data.price_rows`: linear-interpolated quantile endpoints, include values within both endpoints (same algorithm as Step 08). Default 80%. Ties at thresholds can result in more or fewer than exactly 80% of parcels.
- Display county price per acre, 4 quadrants, acreage bands (Standard, Rural, Detailed), land-value and GIS coverage, quality audit, and both maps.
- A missing/unmatched GIS location remains unassigned; countywide values still include usable unmapped observations.
- Signed map links expire after 10 minutes; clicking Generate again refreshes them. A static image already loaded normally remains visible.

## 4. Build and test

```powershell
npm run check
npm test
npm run build
```

Expected output: `dist/` contains the static site. **Never open `dist/index.html` as a file:** serve it through Vercel or `npm run preview` alongside the API for functioning requests.

## 5. GitHub → Vercel

1. Create an **empty, private GitHub repository** (for example `texas-land-atlas`). Ensure `.env` is ignored.
2. In PowerShell, inside the extracted project folder:

   ```powershell
   git init
   git add .
   git commit -m "Build Texas Land Atlas dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/texas-land-atlas.git
   git push -u origin main
   ```

3. In **Vercel → Add New → Project**, import that GitHub repository. Use **Other / Vite** as framework if detection is unclear. The included `vercel.json` sets `npm run build` and static output `dist`.
4. In Vercel Project **Settings → Environment Variables**, add:
   - `AUTH_ENABLED=true` (recommended for deployment)
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Only if using auth-off mode**: `SUPABASE_SECRET_KEY` (server-only; never VITE-prefixed)
5. Deploy. Open the generated Vercel URL. Confirm `/api/health` shows `{ "ok": true }`, `/api/config` says authentication is on, and the login/report/maps work.
6. In Supabase **Authentication → URL Configuration**, set Site URL to the Vercel domain and configure redirect URLs if you later use invitation/recovery links. Email/password sign-in works without a redirect. If using a custom domain, update those settings too.
7. Pushing future commits to `main` triggers a new Vercel deployment. Never commit `.env` or any Supabase secret; Vercel owns production environment settings.

### Common fixes

- **API 500:** Missing or misspelled Vercel environment variables, database error, or storage bucket missing. Check Vercel Function logs.
- **API 401:** User not signed in, session expired, or invalid JWT; sign in again.
- **No counties:** No ready reports imported, or user missing from `txgio_report_access` so RLS denies rows.
- **Map blank:** Verify SVG exists under `txgio-report-maps` and has correct MIME type; user must be allowlisted for Storage RLS. Refresh report to renew map URL.
- **`dist` works but `/api` fails:** Check that the root `api/*.ts` functions are deployed and Vercel environment variables are configured.
- **Login error:** Browser publishable key or user email/password incorrect; check Supabase Auth user confirmation.

## Privacy and deploy safeguards

- `AUTH_ENABLED=false` is a server-side setting; it is intentionally public read access to the reporting data only. **Do not deploy publicly in this mode** if reports should remain private.
- Auth enabled uses the client session JWT and Supabase Row Level Security. A normal user must also exist in `txgio_report_access`.
- `txgio_county_reports.report_data` includes parcel observations but the app only displays aggregates. Review your data-sharing policy before enabling public access.
- Private SVGs are presented through short-lived signed URLs and embedded as `<img>`, not injected as HTML.
- The app does not modify original TxGIO parcel CSVs, GIS files, or existing `txgio_` tables.
