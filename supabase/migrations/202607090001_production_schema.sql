-- Zeal Design Studio AI Credits Management System
-- Production Supabase schema, RLS, realtime, and storage policies.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('super_admin', 'admin', 'manager', 'employee', 'customer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('UPI', 'Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Net Banking', 'Other');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('Pending', 'Paid', 'Failed', 'Refunded');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.invoice_payment_status as enum ('Paid', 'Unpaid', 'Partially Paid', 'Unknown');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.app_role not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.roles (name, description)
values
  ('super_admin', 'Full system owner access'),
  ('admin', 'Administrative access'),
  ('manager', 'Operational management access'),
  ('employee', 'Internal team member access'),
  ('customer', 'Customer portal access')
on conflict (name) do update set description = excluded.description;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'employee',
  disabled boolean not null default false,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    'employee'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and disabled = false
      and role in ('super_admin', 'admin', 'manager')
  );
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.usage_categories (name, sort_order)
values ('Design Studio', 1), ('Ecommerce', 2), ('Others', 3)
on conflict (name) do update set active = true, sort_order = excluded.sort_order;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.suppliers (name, sort_order)
values
  ('Syad', 1),
  ('Priyanga', 2),
  ('Saravan', 3),
  ('Naveen', 4),
  ('Guru', 5),
  ('Nagaraj', 6),
  ('Krishnan', 7)
on conflict (name) do update set active = true, sort_order = excluded.sort_order;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  invoice_number text not null,
  vendor text not null,
  invoice_name text,
  invoice_date date,
  currency text not null default 'INR',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  file_url text,
  extracted_json jsonb not null default '{}'::jsonb,
  ocr_text text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);
create index if not exists invoices_vendor_idx on public.invoices(vendor);
create index if not exists invoices_user_id_idx on public.invoices(user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  payment_id text not null,
  transaction_id text not null,
  order_id text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency text not null default 'INR',
  payment_method public.payment_method not null default 'Other',
  payment_detail text,
  payment_status public.payment_status not null default 'Paid',
  credits integer not null default 0 check (credits >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  invoice_file_url text,
  invoice_file jsonb,
  vendor text not null default '',
  paid_at timestamptz not null default now(),
  invoice_number text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_invoice_number_unique_idx on public.payments(invoice_number) where invoice_number <> '';
create unique index if not exists payments_payment_id_unique_idx on public.payments(payment_id) where payment_id <> '';
create unique index if not exists payments_transaction_id_unique_idx on public.payments(transaction_id) where transaction_id <> '';
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_customer_email_idx on public.payments(lower(customer_email));
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  invoice_name text not null default '',
  purchase_date date not null default current_date,
  due_date date,
  subscription_plan text not null default '',
  invoice_number text not null,
  currency text not null default 'INR',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  purchase_amount numeric(14,2) not null default 0 check (purchase_amount >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) not null default 0 check (balance_due >= 0),
  payment_status public.invoice_payment_status not null default 'Unknown',
  total_credits_purchased integer not null default 0 check (total_credits_purchased >= 0),
  expiry_date date,
  payment_method public.payment_method not null default 'Other',
  vendor text not null default '',
  customer_name text,
  billing_address text,
  notes text,
  invoice_file jsonb,
  extracted_json jsonb,
  ocr_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_purchases_user_id_idx on public.credit_purchases(user_id);
create index if not exists credit_purchases_platform_idx on public.credit_purchases(platform);
create index if not exists credit_purchases_invoice_number_idx on public.credit_purchases(invoice_number);
create index if not exists credit_purchases_purchase_date_idx on public.credit_purchases(purchase_date desc);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  platform text not null,
  category text not null default 'Design Studio' check (category in ('Design Studio', 'Ecommerce', 'Others')),
  buy_credits integer not null default 0 check (buy_credits >= 0),
  description text not null default '',
  number_of_styles integer not null default 0 check (number_of_styles >= 0),
  number_of_images integer not null default 0 check (number_of_images >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  remaining_credits integer not null default 0 check (remaining_credits >= 0),
  supplier_requirements text check (supplier_requirements in ('Syad', 'Priyanga', 'Saravan', 'Naveen', 'Guru', 'Nagaraj', 'Krishnan')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_usage_user_id_idx on public.ai_usage(user_id);
create index if not exists ai_usage_platform_idx on public.ai_usage(platform);
create index if not exists ai_usage_category_idx on public.ai_usage(category);
create index if not exists ai_usage_date_idx on public.ai_usage(date desc);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  payment_id text not null,
  invoice_number text not null,
  credits_added integer not null,
  total_credits integer not null default 0 check (total_credits >= 0),
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_customer_email_idx on public.credit_ledger(lower(customer_email));
create index if not exists credit_ledger_created_at_idx on public.credit_ledger(created_at desc);

create table if not exists public.ai_tools (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null,
  description text not null default '',
  long_description text not null default '',
  logo_url text not null default '',
  pricing_type text not null default 'Freemium' check (pricing_type in ('Free', 'Freemium', 'Paid')),
  monthly_pricing text not null default 'Visit Official Website',
  update_status text not null default 'Stable' check (update_status in ('Latest', 'Recently Updated', 'Stable', 'Beta', 'New Release')),
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  popularity integer not null default 0 check (popularity >= 0),
  featured boolean not null default false,
  trending boolean not null default false,
  recommended boolean not null default false,
  new_release boolean not null default false,
  latest_update text not null default '',
  features text[] not null default '{}',
  pricing_plans text[] not null default '{}',
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  use_cases text[] not null default '{}',
  alternatives text[] not null default '{}',
  website_url text not null default '',
  pricing_url text not null default '',
  docs_url text not null default '',
  api_url text not null default '',
  download_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_tools_category_idx on public.ai_tools(category);
create index if not exists ai_tools_popularity_idx on public.ai_tools(popularity desc);
create index if not exists ai_tools_active_idx on public.ai_tools(active);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_actor_id_idx on public.activity_logs(actor_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_table_record_idx on public.audit_logs(table_name, record_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    case when tg_op = 'DELETE' then old.id::text else new.id::text end,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'projects', 'invoices', 'payments', 'credit_purchases',
    'ai_usage', 'credit_ledger', 'ai_tools', 'settings', 'notifications'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    if table_name not in ('roles', 'notifications', 'activity_logs', 'audit_logs', 'credit_ledger') then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
    end if;
  end loop;
end $$;

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'projects', 'invoices', 'payments', 'credit_purchases',
    'ai_usage', 'credit_ledger', 'ai_tools', 'settings', 'notifications'
  ]
  loop
    execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.write_audit_log()', table_name, table_name);
  end loop;
end $$;

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.usage_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.ai_usage enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.ai_tools enable row level security;
alter table public.settings enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "roles read authenticated" on public.roles;
create policy "roles read authenticated" on public.roles for select to authenticated using (true);

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles insert own safe role" on public.profiles;
create policy "profiles insert own safe role" on public.profiles for insert to authenticated with check (id = auth.uid() and role in ('employee', 'customer'));
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clients admin all" on public.clients;
create policy "clients admin all" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projects admin all" on public.projects;
create policy "projects admin all" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "usage categories read" on public.usage_categories;
create policy "usage categories read" on public.usage_categories for select to authenticated using (active or public.is_admin());
drop policy if exists "usage categories admin all" on public.usage_categories;
create policy "usage categories admin all" on public.usage_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "suppliers read" on public.suppliers;
create policy "suppliers read" on public.suppliers for select to authenticated using (active or public.is_admin());
drop policy if exists "suppliers admin all" on public.suppliers;
create policy "suppliers admin all" on public.suppliers for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invoices read own or admin" on public.invoices;
create policy "invoices read own or admin" on public.invoices for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "invoices admin write" on public.invoices;
create policy "invoices admin write" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payments read own or admin" on public.payments;
create policy "payments read own or admin" on public.payments for select to authenticated using (user_id = auth.uid() or lower(customer_email) = lower((auth.jwt() ->> 'email')) or public.is_admin());
drop policy if exists "payments admin write" on public.payments;
create policy "payments admin write" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "credit purchases read own or admin" on public.credit_purchases;
create policy "credit purchases read own or admin" on public.credit_purchases for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "credit purchases admin write" on public.credit_purchases;
create policy "credit purchases admin write" on public.credit_purchases for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ai usage read own or admin" on public.ai_usage;
create policy "ai usage read own or admin" on public.ai_usage for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "ai usage insert own or admin" on public.ai_usage;
create policy "ai usage insert own or admin" on public.ai_usage for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "ai usage update own or admin" on public.ai_usage;
create policy "ai usage update own or admin" on public.ai_usage for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "ai usage delete own or admin" on public.ai_usage;
create policy "ai usage delete own or admin" on public.ai_usage for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "credit ledger read own email or admin" on public.credit_ledger;
create policy "credit ledger read own email or admin" on public.credit_ledger for select to authenticated using (lower(customer_email) = lower(auth.jwt() ->> 'email') or public.is_admin());
drop policy if exists "credit ledger admin insert" on public.credit_ledger;
create policy "credit ledger admin insert" on public.credit_ledger for insert to authenticated with check (public.is_admin());

drop policy if exists "ai tools read active" on public.ai_tools;
create policy "ai tools read active" on public.ai_tools for select to authenticated using (active or public.is_admin());
drop policy if exists "ai tools admin all" on public.ai_tools;
create policy "ai tools admin all" on public.ai_tools for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read public or admin" on public.settings;
create policy "settings read public or admin" on public.settings for select to authenticated using (public_read or public.is_admin());
drop policy if exists "settings admin all" on public.settings;
create policy "settings admin all" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "notifications read own or admin" on public.notifications;
create policy "notifications read own or admin" on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications update own read state or admin" on public.notifications;
create policy "notifications update own read state or admin" on public.notifications for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications admin insert" on public.notifications;
create policy "notifications admin insert" on public.notifications for insert to authenticated with check (public.is_admin());

drop policy if exists "activity logs admin read" on public.activity_logs;
create policy "activity logs admin read" on public.activity_logs for select to authenticated using (public.is_admin());
drop policy if exists "activity logs insert own" on public.activity_logs;
create policy "activity logs insert own" on public.activity_logs for insert to authenticated with check (actor_id = auth.uid() or public.is_admin());

drop policy if exists "audit logs admin read" on public.audit_logs;
create policy "audit logs admin read" on public.audit_logs for select to authenticated using (public.is_admin());

do $$ declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'projects', 'invoices', 'payments', 'credit_purchases',
    'ai_usage', 'credit_ledger', 'ai_tools', 'settings', 'notifications', 'activity_logs'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('invoices', 'invoices', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('documents', 'documents', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']),
  ('images', 'images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage read public images" on storage.objects;
create policy "storage read public images" on storage.objects for select to public using (bucket_id = 'images');

drop policy if exists "storage authenticated read own or admin" on storage.objects;
create policy "storage authenticated read own or admin" on storage.objects for select to authenticated
using (
  bucket_id in ('invoices', 'documents')
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "storage authenticated upload own or admin" on storage.objects;
create policy "storage authenticated upload own or admin" on storage.objects for insert to authenticated
with check (
  bucket_id in ('invoices', 'documents', 'images')
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "storage authenticated update own or admin" on storage.objects;
create policy "storage authenticated update own or admin" on storage.objects for update to authenticated
using (
  bucket_id in ('invoices', 'documents', 'images')
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id in ('invoices', 'documents', 'images')
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "storage authenticated delete own or admin" on storage.objects;
create policy "storage authenticated delete own or admin" on storage.objects for delete to authenticated
using (
  bucket_id in ('invoices', 'documents', 'images')
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Run after the owner account signs up:
-- update public.profiles set role = 'super_admin' where email = 'niyas.zealdesigner@gmail.com';
