# Turning on payments (Dodo)

Payments work on the website and the desktop apps. The phone apps show no buy
buttons until store billing is added. Do these steps once Dodo has approved
your account. Never paste keys or secrets into chat; they only go into the
Supabase and GitHub settings named below.

## 1. Database (once)
Supabase → SQL Editor → paste `supabase/migrations/0004_payments.sql` → Run.

## 2. Let GitHub deploy the server functions (once)
1. Supabase → your avatar (top right) → Account preferences → Access Tokens → Generate new token. Copy it.
2. GitHub → study-app → Settings → Secrets and variables → Actions → New repository secret.
   Name: `SUPABASE_ACCESS_TOKEN`, value: the token.
3. GitHub → Actions → Server functions → Run workflow. It should finish green.

## 3. Create the products in Dodo (start in Test mode)
Dodo dashboard → Products → Create product, three times:
| Name | Type | Price |
|---|---|---|
| Monthly | Subscription, every 1 month | ₹99 |
| Yearly | Subscription, every 1 year | ₹699 |
| Lifetime | One-time payment | ₹1,499 |
Copy each product's id (it starts with `pdt_`).

## 4. Add the secrets to Supabase
Supabase → Edge Functions → Secrets → add each:
| Name | Value |
|---|---|
| `DODO_MODE` | `test` (later `live`) |
| `DODO_API_KEY` | Dodo → Developer → API Keys → create a key |
| `DODO_PRODUCT_MONTHLY` | the Monthly product id |
| `DODO_PRODUCT_YEARLY` | the Yearly product id |
| `DODO_PRODUCT_LIFETIME` | the Lifetime product id |
| `SITE_URL` | your live site, e.g. `https://study-app-one-rho.vercel.app` |

## 5. Connect the payment notices (webhook)
Dodo → Developer → Webhooks → Add endpoint:
- URL: `https://xcaioljuutfvujmitwfc.supabase.co/functions/v1/dodo-webhook`
- Events: all subscription, payment and refund events.
Copy the signing secret (starts with `whsec_`) into Supabase secrets as `DODO_WEBHOOK_SECRET`.

## 6. Test, then go live
1. On the live site, sign in, open Upgrade, pick a plan and pay with Dodo's test card.
2. You land on the Account page, and within a few seconds the plan shows as active.
3. "Manage billing" opens Dodo's portal, where you can cancel.
4. To go live: switch Dodo to Live mode, create the same three products there, and repeat steps 4 and 5 with the live key, live product ids, `DODO_MODE=live` and a live webhook.
