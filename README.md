# Chandhu Sea Food

Website demo for **Chandhu Sea Food** — fresh prawns & seafood shop in Tirupati, Andhra Pradesh. Daily imports from Nellore, never frozen, hygienically cleaned in-house.

## Stack

- **Next.js 15** + **React** + **TypeScript**
- **Leaflet / OpenStreetMap** for delivery & hub maps (no API key for demo)
- Client-side demo store (`localStorage`) — prices, orders, partners, settings

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
