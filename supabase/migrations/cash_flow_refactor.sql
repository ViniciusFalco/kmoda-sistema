-- Refatoração do caixa: venda e gasto como fluxos principais.
-- Execute no SQL Editor do Supabase após a migration de cadastros/produtos.

create extension if not exists "pgcrypto";

create sequence if not exists public.cash_movement_code_seq;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.set_cash_movement_code()
returns trigger as $$
begin
  if new.movement_code is null or trim(new.movement_code) = '' then
    new.movement_code := 'CX-' || lpad(nextval('public.cash_movement_code_seq')::text, 6, '0');
  end if;

  return new;
end;
$$ language plpgsql;

alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sales
add constraint sales_payment_method_check
check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro'));
alter table public.sales add column if not exists installments_count integer not null default 1;
alter table public.sales drop constraint if exists sales_installments_count_check;
alter table public.sales
add constraint sales_installments_count_check
check (installments_count >= 1);

alter table public.sale_items add column if not exists pricing_kind text not null default 'cash';
alter table public.sale_items add column if not exists original_unit_price numeric(12, 2) not null default 0;
alter table public.sale_items add column if not exists installments_count integer not null default 1;
alter table public.sale_items add column if not exists installment_value numeric(12, 2) not null default 0;

alter table public.sale_items drop constraint if exists sale_items_pricing_kind_check;
alter table public.sale_items
add constraint sale_items_pricing_kind_check
check (pricing_kind in ('cash', 'installment'));

alter table public.sale_items drop constraint if exists sale_items_installments_count_check;
alter table public.sale_items
add constraint sale_items_installments_count_check
check (installments_count >= 1);

update public.sale_items si
set
  pricing_kind = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then 'installment'
    else 'cash'
  end,
  original_unit_price = case
    when coalesce(si.quantity, 0) > 0 then round((si.total_price / si.quantity)::numeric, 2)
    else 0
  end,
  unit_price = case
    when coalesce(si.quantity, 0) > 0 then round((si.total_price / si.quantity)::numeric, 2)
    else 0
  end,
  installments_count = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then s.installments_count
    else 1
  end,
  installment_value = case
    when coalesce(s.payment_method, 'dinheiro') = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then round((si.total_price / greatest(s.installments_count, 1))::numeric, 2)
    else si.total_price
  end
from public.sales s
where s.id = si.sale_id;

alter table public.cash_movements add column if not exists movement_code text;
alter table public.cash_movements add column if not exists origin text;
alter table public.cash_movements add column if not exists updated_at timestamptz not null default now();
alter table public.cash_movements add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.cash_movements add column if not exists sale_payment_id uuid;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  opening_amount numeric(12, 2) not null default 0,
  closing_amount numeric(12, 2),
  expected_amount numeric(12, 2),
  difference_amount numeric(12, 2),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references auth.users(id) on delete set null,
  closed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  source_kind text not null check (source_kind in ('cash_total', 'installment_group')),
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro')),
  amount numeric(12, 2) not null check (amount >= 0),
  installments_count integer not null default 1 check (installments_count >= 1),
  installment_value numeric(12, 2) not null default 0,
  cash_movement_id uuid references public.cash_movements(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.cash_sessions enable row level security;
alter table public.customers enable row level security;
alter table public.sale_payments enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view profiles." on public.profiles;
drop policy if exists "Authenticated users can create profiles." on public.profiles;
drop policy if exists "Authenticated users can update profiles." on public.profiles;
create policy "Authenticated users can view profiles." on public.profiles
for select to authenticated using (auth.uid() = user_id);
create policy "Authenticated users can create profiles." on public.profiles
for insert to authenticated with check (auth.uid() = user_id);
create policy "Authenticated users can update profiles." on public.profiles
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can view customers." on public.customers;
drop policy if exists "Authenticated users can create customers." on public.customers;
drop policy if exists "Authenticated users can update customers." on public.customers;
drop policy if exists "Authenticated users can delete customers." on public.customers;
create policy "Authenticated users can view customers." on public.customers
for select to authenticated using (true);
create policy "Authenticated users can create customers." on public.customers
for insert to authenticated with check (true);
create policy "Authenticated users can update customers." on public.customers
for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete customers." on public.customers
for delete to authenticated using (true);

drop policy if exists "Authenticated users can view cash sessions." on public.cash_sessions;
drop policy if exists "Authenticated users can create cash sessions." on public.cash_sessions;
drop policy if exists "Authenticated users can update cash sessions." on public.cash_sessions;
create policy "Authenticated users can view cash sessions." on public.cash_sessions
for select to authenticated using (true);
create policy "Authenticated users can create cash sessions." on public.cash_sessions
for insert to authenticated with check (true);
create policy "Authenticated users can update cash sessions." on public.cash_sessions
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view sale payments." on public.sale_payments;
drop policy if exists "Authenticated users can create sale payments." on public.sale_payments;
create policy "Authenticated users can view sale payments." on public.sale_payments
for select to authenticated using (true);
create policy "Authenticated users can create sale payments." on public.sale_payments
for insert to authenticated with check (true);

alter table public.cash_movements add column if not exists cash_session_id uuid references public.cash_sessions(id) on delete set null;
alter table public.cash_movements drop constraint if exists cash_movements_sale_payment_id_fkey;
alter table public.cash_movements
add constraint cash_movements_sale_payment_id_fkey
foreign key (sale_payment_id) references public.sale_payments(id) on delete set null;

alter table public.cash_movements drop constraint if exists cash_movements_type_check;
update public.cash_movements
set type = case
  when type = 'entrada' then 'income'
  when type = 'saida' then 'expense'
  else type
end;
alter table public.cash_movements
add constraint cash_movements_type_check
check (type in ('income', 'expense'));

update public.cash_movements cm
set origin = case
  when cm.origin is not null then cm.origin
  when cm.sale_id is not null then 'sale'
  when cm.type = 'income' then 'manual_income'
  else 'manual_expense'
end;

alter table public.cash_movements drop constraint if exists cash_movements_origin_check;
alter table public.cash_movements
add constraint cash_movements_origin_check
check (origin in ('sale', 'manual_expense', 'manual_income', 'stock'));

alter table public.cash_movements drop constraint if exists cash_movements_payment_method_check;
alter table public.cash_movements alter column payment_method drop not null;
alter table public.cash_movements
add constraint cash_movements_payment_method_check
check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro'));

update public.cash_movements
set amount = abs(amount)
where amount < 0;

update public.cash_movements cm
set movement_code = 'CX-' || lpad(nextval('public.cash_movement_code_seq')::text, 6, '0')
where cm.movement_code is null;

alter table public.cash_movements alter column movement_code set not null;
create unique index if not exists cash_movements_movement_code_key on public.cash_movements (movement_code);

alter table public.stock_movements add column if not exists sale_id uuid references public.sales(id) on delete set null;
alter table public.stock_movements add column if not exists cash_movement_id uuid references public.cash_movements(id) on delete set null;

drop trigger if exists cash_movements_set_updated_at on public.cash_movements;
create trigger cash_movements_set_updated_at before update on public.cash_movements
for each row execute function public.set_updated_at();

drop trigger if exists cash_movements_set_code on public.cash_movements;
create trigger cash_movements_set_code before insert on public.cash_movements
for each row execute function public.set_cash_movement_code();

drop trigger if exists cash_sessions_set_updated_at on public.cash_sessions;
create trigger cash_sessions_set_updated_at before update on public.cash_sessions
for each row execute function public.set_updated_at();

create index if not exists cash_movements_type_idx on public.cash_movements (type);
create index if not exists cash_movements_origin_idx on public.cash_movements (origin);
create index if not exists cash_movements_cash_session_id_idx on public.cash_movements (cash_session_id);
create index if not exists cash_movements_sale_payment_id_idx on public.cash_movements (sale_payment_id);
create unique index if not exists cash_sessions_one_open_per_day_idx on public.cash_sessions (session_date) where status = 'open';
create index if not exists sale_payments_sale_id_idx on public.sale_payments (sale_id);
create unique index if not exists sale_payments_cash_movement_id_key on public.sale_payments (cash_movement_id);
create index if not exists stock_movements_sale_id_idx on public.stock_movements (sale_id);
create index if not exists stock_movements_cash_movement_id_idx on public.stock_movements (cash_movement_id);

insert into public.sale_payments (
  sale_id,
  source_kind,
  payment_method,
  amount,
  installments_count,
  installment_value
)
select
  s.id,
  case
    when s.payment_method = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then 'installment_group'
    else 'cash_total'
  end,
  s.payment_method,
  s.total_amount,
  greatest(1, coalesce(s.installments_count, 1)),
  case
    when s.payment_method = 'cartao_credito' and coalesce(s.installments_count, 1) > 1 then round((s.total_amount / greatest(s.installments_count, 1))::numeric, 2)
    else s.total_amount
  end
from public.sales s
where not exists (
  select 1
  from public.sale_payments sp
  where sp.sale_id = s.id
);

update public.cash_movements cm
set sale_payment_id = sp.id
from public.sale_payments sp
where cm.sale_id = sp.sale_id
  and cm.sale_payment_id is null
  and cm.origin = 'sale';

update public.sale_payments sp
set cash_movement_id = cm.id
from public.cash_movements cm
where cm.sale_payment_id = sp.id
  and sp.cash_movement_id is null;

drop function if exists public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid);

create or replace function public.register_sale_with_cash_and_stock(
  p_items jsonb,
  p_payment_method text default null,
  p_installments_count integer default 1,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_cash_session_id uuid default null,
  p_customer_id uuid default null,
  p_payments jsonb default null
)
returns table (
  sale_id uuid,
  cash_movement_id uuid,
  movement_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_cash_movement_id uuid;
  v_first_cash_movement_id uuid;
  v_movement_code text;
  v_first_movement_code text;
  v_sale_reference text;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_pricing_kind text;
  v_original_unit_price numeric(12, 2);
  v_installments_count integer;
  v_installment_value numeric(12, 2);
  v_stock integer;
  v_product_name text;
  v_payments jsonb;
  v_payment jsonb;
  v_payment_total numeric(12, 2) := 0;
  v_payment_method_value text;
  v_payment_source_kind text;
  v_payment_amount numeric(12, 2);
  v_payment_installments_count integer;
  v_payment_installment_value numeric(12, 2);
  v_first_payment_method text;
  v_first_payment_installments integer;
  v_has_mixed_payment_method boolean := false;
  v_summary_payment_method text;
  v_summary_installments_count integer := 1;
  v_sale_payment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto para registrar a venda.';
  end if;

  if p_customer_id is not null then
    perform 1 from public.customers where id = p_customer_id;

    if not found then
      raise exception 'Cliente não encontrado.';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(trim(coalesce(v_item->>'product_id', '')), '')::uuid;
    v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 0));
    v_unit_price := round(coalesce((v_item->>'unit_price')::numeric, 0), 2);
    v_pricing_kind := coalesce(nullif(trim(coalesce(v_item->>'pricing_kind', '')), ''), 'cash');
    v_original_unit_price := round(coalesce((v_item->>'original_unit_price')::numeric, v_unit_price), 2);
    v_installments_count := greatest(1, coalesce((v_item->>'installments_count')::integer, 1));
    v_installment_value := round(
      coalesce((v_item->>'installment_value')::numeric, (v_unit_price * v_quantity) / greatest(v_installments_count, 1)),
      2
    );

    if v_pricing_kind not in ('cash', 'installment') then
      raise exception 'Condição comercial inválida.';
    end if;

    if v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    if v_unit_price < 0 or v_original_unit_price < 0 or v_installment_value < 0 then
      raise exception 'Valores inválidos do item.';
    end if;

    if v_pricing_kind = 'installment' and v_installments_count < 2 then
      raise exception 'Itens parcelados precisam de ao menos 2 parcelas.';
    end if;

    select name, stock_quantity
    into v_product_name, v_stock
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'Produto não encontrado.';
    end if;

    if v_stock < v_quantity then
      raise exception 'Estoque insuficiente para %.', v_product_name;
    end if;

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  v_payments := p_payments;

  if v_payments is null or jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments) = 0 then
    if p_payment_method is null then
      raise exception 'Informe ao menos uma forma de recebimento.';
    end if;

    if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
      raise exception 'Forma de pagamento inválida.';
    end if;

    if p_installments_count is null or p_installments_count < 1 then
      raise exception 'Quantidade de parcelas inválida.';
    end if;

    v_payments := jsonb_build_array(
      jsonb_build_object(
        'source_kind', 'cash_total',
        'payment_method', p_payment_method,
        'amount', v_total,
        'installments_count', greatest(1, p_installments_count),
        'installment_value', round((v_total / greatest(1, p_installments_count))::numeric, 2)
      )
    );
  end if;

  for v_payment in select * from jsonb_array_elements(v_payments)
  loop
    v_payment_source_kind := coalesce(nullif(trim(coalesce(v_payment->>'source_kind', '')), ''), 'cash_total');
    v_payment_method_value := v_payment->>'payment_method';
    v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
    v_payment_installments_count := greatest(1, coalesce((v_payment->>'installments_count')::integer, 1));
    v_payment_installment_value := round(
      coalesce((v_payment->>'installment_value')::numeric, v_payment_amount / greatest(v_payment_installments_count, 1)),
      2
    );

    if v_payment_method_value not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
      raise exception 'Forma de pagamento inválida.';
    end if;

    if v_payment_source_kind not in ('cash_total', 'installment_group') then
      raise exception 'Origem de recebimento inválida.';
    end if;

    if v_payment_amount <= 0 then
      raise exception 'Informe valores válidos para os recebimentos.';
    end if;

    if v_payment_source_kind = 'installment_group'
       and (v_payment_method_value <> 'cartao_credito' or v_payment_installments_count < 2) then
      raise exception 'Os itens parcelados precisam ser recebidos no crédito parcelado.';
    end if;

    v_payment_total := v_payment_total + v_payment_amount;

    if v_first_payment_method is null then
      v_first_payment_method := v_payment_method_value;
      v_first_payment_installments := v_payment_installments_count;
    elsif v_first_payment_method <> v_payment_method_value
      or v_first_payment_installments <> v_payment_installments_count then
      v_has_mixed_payment_method := true;
    end if;

    v_summary_installments_count := greatest(v_summary_installments_count, v_payment_installments_count);
  end loop;

  if abs(v_payment_total - v_total) > 0.01 then
    raise exception 'A soma dos recebimentos deve ser igual ao total da venda.';
  end if;

  v_summary_payment_method := case
    when v_has_mixed_payment_method then 'outro'
    else coalesce(v_first_payment_method, coalesce(p_payment_method, 'outro'))
  end;

  insert into public.sales (
    user_id,
    customer_id,
    total_amount,
    payment_method,
    installments_count,
    status,
    sale_date
  )
  values (
    coalesce(p_user_id, auth.uid()),
    p_customer_id,
    v_total,
    v_summary_payment_method,
    greatest(1, v_summary_installments_count),
    'finalizada',
    coalesce(p_movement_date, current_date)
  )
  returning id into v_sale_id;

  v_sale_reference := 'VD-' || upper(substr(v_sale_id::text, 1, 8));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(trim(coalesce(v_item->>'product_id', '')), '')::uuid;
    v_quantity := greatest(1, coalesce((v_item->>'quantity')::integer, 0));
    v_unit_price := round(coalesce((v_item->>'unit_price')::numeric, 0), 2);
    v_pricing_kind := coalesce(nullif(trim(coalesce(v_item->>'pricing_kind', '')), ''), 'cash');
    v_original_unit_price := round(coalesce((v_item->>'original_unit_price')::numeric, v_unit_price), 2);
    v_installments_count := greatest(1, coalesce((v_item->>'installments_count')::integer, 1));
    v_installment_value := round(
      coalesce((v_item->>'installment_value')::numeric, (v_unit_price * v_quantity) / greatest(v_installments_count, 1)),
      2
    );

    insert into public.sale_items (
      sale_id,
      product_id,
      quantity,
      pricing_kind,
      original_unit_price,
      unit_price,
      total_price,
      installments_count,
      installment_value
    )
    values (
      v_sale_id,
      v_product_id,
      v_quantity,
      v_pricing_kind,
      v_original_unit_price,
      v_unit_price,
      v_quantity * v_unit_price,
      v_installments_count,
      v_installment_value
    );

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product_id;

    insert into public.stock_movements (
      user_id,
      product_id,
      sale_id,
      type,
      reason,
      quantity,
      notes
    )
    values (
      coalesce(p_user_id, auth.uid()),
      v_product_id,
      v_sale_id,
      'saida',
      'venda',
      v_quantity,
      'Venda ' || coalesce(v_movement_code, v_sale_reference)
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(v_payments)
  loop
    v_payment_source_kind := coalesce(nullif(trim(coalesce(v_payment->>'source_kind', '')), ''), 'cash_total');
    v_payment_method_value := v_payment->>'payment_method';
    v_payment_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
    v_payment_installments_count := greatest(1, coalesce((v_payment->>'installments_count')::integer, 1));
    v_payment_installment_value := round(
      coalesce((v_payment->>'installment_value')::numeric, v_payment_amount / greatest(v_payment_installments_count, 1)),
      2
    );

    insert into public.sale_payments (
      sale_id,
      source_kind,
      payment_method,
      amount,
      installments_count,
      installment_value
    )
    values (
      v_sale_id,
      v_payment_source_kind,
      v_payment_method_value,
      v_payment_amount,
      v_payment_installments_count,
      v_payment_installment_value
    )
    returning id into v_sale_payment_id;

    insert into public.cash_movements as cm (
      user_id,
      created_by,
      sale_id,
      sale_payment_id,
      cash_session_id,
      type,
      origin,
      description,
      amount,
      movement_date,
      payment_method,
      notes
    )
    values (
      coalesce(p_user_id, auth.uid()),
      auth.uid(),
      v_sale_id,
      v_sale_payment_id,
      p_cash_session_id,
      'income',
      'sale',
      'Venda',
      v_payment_amount,
      coalesce(p_movement_date, current_date),
      v_payment_method_value,
      p_notes
    )
    returning id, cm.movement_code
    into v_cash_movement_id, v_movement_code;

    update public.sale_payments
    set cash_movement_id = v_cash_movement_id
    where id = v_sale_payment_id;

    if v_first_cash_movement_id is null then
      v_first_cash_movement_id := v_cash_movement_id;
      v_first_movement_code := v_movement_code;
    end if;
  end loop;

  update public.cash_movements cm
  set description = coalesce(
    (
      select string_agg(product_names.name, ', ' order by product_names.name)
      from (
        select distinct p.name
        from public.sale_items si
        join public.products p on p.id = si.product_id
        where si.sale_id = v_sale_id
      ) as product_names
    ),
    'Venda ' || coalesce(v_first_movement_code, v_sale_reference)
  )
  where cm.sale_id = v_sale_id
    and cm.origin = 'sale';

  return query
  select
    v_sale_id as sale_id,
    v_first_cash_movement_id as cash_movement_id,
    v_first_movement_code as movement_code;
end;
$$;

grant execute on function public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb) to authenticated;

create or replace function public.get_sales_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language sql
stable
as $$
  select coalesce(sum(total_amount), 0)
  from public.sales
  where status = 'finalizada'
    and (p_start_date is null or sale_date::date >= p_start_date)
    and (p_end_date is null or sale_date::date < p_end_date)
$$;

create or replace function public.get_cash_expense_total(
  p_start_date date default null,
  p_end_date date default null
)
returns numeric
language sql
stable
as $$
  select coalesce(sum(amount), 0)
  from public.cash_movements
  where type = 'expense'
    and (p_start_date is null or movement_date >= p_start_date)
    and (p_end_date is null or movement_date < p_end_date)
$$;
