# Setup guide (no coding needed)

Everything here is done in your browser. Each step says exactly where to click.

## 1. Supabase (accounts and database)

1. Go to https://supabase.com, sign in with GitHub, and click **New project**.
   - Name: `studyapp`. Region: **Mumbai (ap-south-1)**. Set a strong database password and save it somewhere safe.
2. When the project is ready, open **SQL Editor** → **New query**. Paste the whole contents of
   `supabase/migrations/0001_init.sql` from this repository and click **Run**. It should say "Success".
   Then do the same, in a new query, for each later file in `supabase/migrations/` in number order
   (`0002_sync.sql`, ...). Each file only needs to be run once.
3. Open **Project Settings** → **API**. Copy two values:
   - **Project URL**
   - **anon public** key
   Send them to Claude in the project chat. They are safe to share with the app (the anon key is designed to be public), but never share the **service_role** key in chat.
4. Open **Authentication** → **Sign In / Providers**:
   - **Email** is on by default. Keep "Confirm email" on.
   - **Google**: Claude will walk you through this on Day 2.

## 2. Vercel (the website)

The Supabase URL and anon key are already in `.env.production`, so Vercel
needs no environment variables.

1. Go to https://vercel.com/new and choose **Continue with GitHub**.
2. If `study-app` isn't listed, click **Adjust GitHub App Permissions** (or
   "Install"), pick the **prahladhaofficial-design** account, allow the
   `study-app` repository, and save.
3. Click **Import** next to `study-app`. Vercel detects Vite; leave every
   setting as it is and click **Deploy**.
4. Copy the site address Vercel shows (like `study-app-xxxx.vercel.app`).
5. Back in Supabase, open **Authentication** → **URL Configuration**. Set
   **Site URL** to that address and add `https://<that address>/**` under
   **Redirect URLs**. This makes sign-up confirmation emails open the app.

Every merge into `main` redeploys the site automatically.

## 3. Accounts to create early (approvals take days)

- **Dodo Payments** (https://dodopayments.com): business sign-up with your PAN and bank details.
- **Google Play Console** (https://play.google.com/console): $25 one-time.
- **Apple Developer** (https://developer.apple.com/programs): $99 per year.
