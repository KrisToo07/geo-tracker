# Deploying GEO Tracker → live, earning on Stripe

Everything below is the path from "code on GitHub" to "a stranger can pay you." Do it in order.
Steps marked **🔴 you** need your own login/credentials — nobody should do those for you.

---

## 1. Create the Stripe products (income wiring)

Your billing code reads two price IDs from the environment. Create them once:

```bash
# with your Stripe TEST key first (from Stripe → Developers → API keys)
node scripts/setup-stripe.mjs
```

It prints:

```
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
```

Paste those into `.env.local` (and into Vercel in step 3). The script is idempotent and never
charges or deletes anything. **This is where your revenue lands** — subscriptions bill into your
Stripe balance and pay out to your bank.

---

## 2. Deploy to Vercel — 🔴 you (Vercel login)

1. [vercel.com/new](https://vercel.com/new) → **Import** `KrisToo07/geo-tracker`.
2. Framework auto-detects as Next.js. Don't deploy yet — add env vars first (step 3).
3. Deploy. You get a URL like `https://geo-tracker-xxxx.vercel.app` (or your custom domain).

The daily-scan cron is already configured in `vercel.json` (`0 6 * * *`) — it runs automatically
once deployed, authorized by `CRON_SECRET` (Vercel sends it as `Authorization: Bearer <CRON_SECRET>`).

---

## 3. Environment variables (set all of these in Vercel → Settings → Environment Variables)

| Var | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (server-only, keep secret) |
| `OPENAI_API_KEY` | platform.openai.com |
| `PERPLEXITY_API_KEY` | perplexity.ai |
| `GEMINI_API_KEY` | ai.google.dev |
| `STRIPE_SECRET_KEY` | Stripe → API keys (**live** key for production) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys |
| `STRIPE_PRO_PRICE_ID` | from step 1 |
| `STRIPE_AGENCY_PRICE_ID` | from step 1 |
| `STRIPE_WEBHOOK_SECRET` | from step 4 |
| `NEXT_PUBLIC_APP_URL` | your deployed URL, e.g. `https://geo-tracker-xxxx.vercel.app` |
| `CRON_SECRET` | any long random string you invent |

> Never commit real values — `.env*.local` is gitignored. In Vercel they live in the dashboard.

---

## 4. Stripe webhook — turns "paid" into "subscribed" — 🔴 you

1. Stripe → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-domain>/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Copy the **Signing secret** (`whsec_...`) → set `STRIPE_WEBHOOK_SECRET` in Vercel → redeploy.

Fulfilment happens on the webhook (not the redirect), so this step is what actually activates a
customer's plan after they pay.

---

## 4b. (Optional) Enable "Continue with Google"
The Google button is hidden until you configure OAuth — email/password works without it.
To turn it on:
1. **Google Cloud** → APIs & Services → Credentials → Create OAuth client ID (Web). Authorized
   redirect URI: `https://ilubszxuqlrptbrvxjdz.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → **Google** → enable, paste the Client ID + Secret.
3. **Supabase** → Authentication → URL Configuration → add `https://geo-tracker-rouge.vercel.app/**`
   to redirect URLs, set Site URL to your production URL.
4. In Vercel, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and redeploy — the button reappears.

## 5. Go live

1. Run `node scripts/setup-stripe.mjs` again with your **`sk_live_`** key → new live price IDs.
2. Swap all Stripe env vars in Vercel to the **live** keys + live price IDs. Redeploy.
3. Do one real test purchase (a small card charge to yourself), confirm the plan activates, then
   refund it in Stripe.

---

## 6. First customers (the actual work)

The app is done; income needs users. Who wants GEO/AI-visibility tracking: SEO agencies, brands
worried about how they show up in ChatGPT/Perplexity/Gemini answers, indie founders.

- Offer a **free AI-visibility scan** of a prospect's brand as the hook (the free tier already
  supports this).
- Post where they are: r/SEO, indie-hacker/startup communities, LinkedIn, X.
- DM agencies with a one-line result: "here's how invisible your client is in AI answers."

No autopilot here — this is the part that turns a built product into money.
