-- Payment fields for Razorpay UPI QR + COD
-- Run this in Supabase → SQL Editor (one shot). Safe to re-run.

-- 1) Add columns one-by-one (works even if orders already exists)
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists payment_amount_inr integer;
alter table public.orders add column if not exists razorpay_qr_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists paid_at timestamptz;

-- 2) Backfill older rows
update public.orders
set
  payment_method = coalesce(payment_method, 'cod'),
  payment_status = coalesce(payment_status, 'cod_pending'),
  payment_amount_inr = coalesce(payment_amount_inr, total_inr)
where payment_method is null
   or payment_status is null
   or payment_amount_inr is null;

-- 3) Indexes (only after columns exist)
create index if not exists orders_razorpay_qr_idx on public.orders (razorpay_qr_id);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
