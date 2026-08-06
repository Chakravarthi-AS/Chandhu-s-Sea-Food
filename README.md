# Chandhu Sea Food

Website demo for **Chandhu Sea Food** — fresh prawns & seafood shop in Tirupati, Andhra Pradesh. Daily imports from Nellore, never frozen, hygienically cleaned in-house.

## Stack

- **Next.js 15** + **React** + **TypeScript**
- **Leaflet / OpenStreetMap** for delivery & hub maps (no API key for demo)
- **Supabase** (optional) for shared menu — without it, demo uses `localStorage` per browser
- Client-side demo store for orders, partners, settings (local until backend phase 2)

## Shared menu (Supabase)

Admin menu items can sync for **everyone** on the live site (not only your browser).

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/schema.sql` from this repo (new projects), or `supabase/migration-v2-orders-customers.sql` if `products` already exists.
3. **Project Settings → API Keys** → copy URL, **anon / publishable** key, and **service role** key (LEGACY JWT `eyJ...` for `SUPABASE_SERVICE_ROLE_KEY` if `sb_secret_` fails).
4. Copy `.env.example` to `.env.local` and fill values (never commit `.env.local`).
5. On **Vercel** → **Settings → Environment Variables** → add at least:

   | Variable | Required for cloud menu |
   |----------|-------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes |
   | `ADMIN_API_SECRET` | Yes (same as admin password) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional today (set for parity with local) |

   Then **Redeploy** production.
6. Log in to **Admin** on the live site (so API auth works), then add/edit menu items.

**Cloud tables:** `products` (menu), `admin_users` (portal login), `customers` (phone + saved addresses), `orders` (all orders; customers see theirs by phone after OTP login).

`ADMIN_API_SECRET` should match your admin password (or set a dedicated secret).

Without Supabase env vars, the app still runs with browser-only storage (localhost vs live stay separate).

## Features

- Retail: **kg + grams** dropdowns (e.g. 4 kg + 500 g = 4.5 kg)
- Multi-item cart in one order
- Orders **under 2 kg** → agent confirmation; **≥ 2 kg** → auto-accept
- **Resend OTP** on customer login
- App bar shows customer **name** after login

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Storefront: `/`
- Order: `/order`
- Track: `/track`
- Account: `/account`
- Admin: `/admin` (login required)

## Access

- **Storefront / landing** — open to everyone (no login)
- **Order confirm** — mobile + OTP login (demo OTP shown on screen)
- **Admin** — username/password (default `admin` / `chandhu@123`)
- **Hub** — Opposite to DCC Bank and near Navajeevan, Tiruchanoor, 517503

## Demo walkthrough

1. Browse the home page freely.
2. Open **Order**, fill the form, submit → verify with mobile OTP (demo code shown).
3. Open **Admin** → login → **Orders**, confirm, assign partner, **Start delivery**.
4. Open **Track** / **My orders** — partner details and saved locations appear.
5. Change rates or admin password under **Admin → Shop & delivery**.

## Later (when you are ready)

- Real backend / database & SMS / WhatsApp alerts
- Payment gateway (UPI / Razorpay)
- Google Maps Places autocomplete (optional)
- Auth for admin (done in demo; replace with real auth later)
- Real SMS OTP gateway
- Your real hub GPS fine-tuning + contact numbers
