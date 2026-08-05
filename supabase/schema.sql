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
