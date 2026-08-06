-- Run in Supabase SQL Editor if you already created `products` from an older schema.sql

create table if not exists public.admin_users (
  id text primary key,
  username text not null,
  password text not null,
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

insert into public.admin_users (id, username, password, display_name)
values ('default', 'admin', 'chandhu@123', 'Shop Admin')
on conflict (id) do nothing;

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
  created_at timestamptz not null
);

alter table public.orders enable row level security;
create index if not exists orders_customer_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_tracking_idx on public.orders (tracking_code);
