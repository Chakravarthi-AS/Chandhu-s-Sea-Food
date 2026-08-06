-- Chandhu Sea Food — run in Supabase SQL Editor (Project → SQL → New query)

create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text not null,
  description text not null default '',
  price_per_kg integer not null check (price_per_kg > 0),
  bulk_price_per_kg integer not null check (bulk_price_per_kg > 0),
  featured boolean not null default true,
  category text not null check (category in ('prawns', 'fish', 'crab', 'other')),
  image_emoji text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public read products" on public.products;
create policy "Public read products"
  on public.products for select
  using (true);

-- Writes go through Next.js API using the service role key (not exposed to browsers).

create index if not exists products_featured_idx on public.products (featured);
create index if not exists products_active_idx on public.products (active);

-- Admin portal login (single shop admin row)
create table if not exists public.admin_users (
  id text primary key,
  username text not null,
  password text not null,
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No public policies — access via service role API only.

insert into public.admin_users (id, username, password, display_name)
values ('default', 'admin', 'chandhu@123', 'Shop Admin')
on conflict (id) do nothing;

-- Customers (OTP login, saved addresses)
create table if not exists public.customers (
  id text primary key,
  phone text not null unique,
  name text not null,
  saved_locations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  last_login_at timestamptz not null
);

alter table public.customers enable row level security;

create index if not exists customers_phone_idx on public.customers (phone);

-- Orders (all storefront + admin orders)
create table if not exists public.orders (
  id text primary key,
  tracking_code text not null unique,
  customer_id text references public.customers (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  items jsonb not null default '[]'::jsonb,
  product_id text not null,
  product_name text not null,
  mode text not null check (mode in ('retail', 'bulk')),
  quantity_kg numeric not null,
  price_per_kg integer not null,
  total_inr integer not null,
  address text not null,
  lat numeric not null,
  lng numeric not null,
  distance_km numeric not null,
  status text not null,
  agent_note text,
  delivery_partner_id text,
  created_at timestamptz not null,
  payment_method text,
  payment_status text,
  payment_amount_inr integer,
  razorpay_qr_id text,
  razorpay_payment_id text,
  paid_at timestamptz
);

alter table public.orders enable row level security;

create index if not exists orders_customer_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_tracking_idx on public.orders (tracking_code);

-- If `orders` already existed without payment columns, add them (idempotent).
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists payment_amount_inr integer;
alter table public.orders add column if not exists razorpay_qr_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists paid_at timestamptz;

create index if not exists orders_razorpay_qr_idx on public.orders (razorpay_qr_id);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
