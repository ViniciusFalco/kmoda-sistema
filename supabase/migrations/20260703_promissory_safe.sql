-- Migração segura para adicionar promissórias.
-- Esta versão não faz backfill de dados antigos nem reescreve itens de venda já existentes.

create extension if not exists "pgcrypto";

-- Garante que os valores novos sejam aceitos sem mexer nos registros antigos.
alter table public.sales drop constraint if exists sales_payment_method_check;
alter table public.sales
add constraint sales_payment_method_check
check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria'));

alter table public.cash_movements drop constraint if exists cash_movements_origin_check;
alter table public.cash_movements
add constraint cash_movements_origin_check
check (origin in ('sale', 'promissory', 'manual_expense', 'manual_income', 'stock'));

alter table public.cash_movements drop constraint if exists cash_movements_payment_method_check;
alter table public.cash_movements
add constraint cash_movements_payment_method_check
check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria'));

alter table public.sale_payments drop constraint if exists sale_payments_source_kind_check;
alter table public.sale_payments
add constraint sale_payments_source_kind_check
check (source_kind in ('cash_total', 'installment_group', 'promissory_group'));

alter table public.sale_payments drop constraint if exists sale_payments_payment_method_check;
alter table public.sale_payments
add constraint sale_payments_payment_method_check
check (payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria'));

-- Tabelas novas da promissória.
create table if not exists public.promissory_notes (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  total_amount numeric(12, 2) not null default 0,
  installments_count integer not null default 1 check (installments_count >= 1),
  interval_days integer not null default 30 check (interval_days >= 1),
  first_due_date date not null,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promissory_installments (
  id uuid primary key default gen_random_uuid(),
  promissory_note_id uuid not null references public.promissory_notes(id) on delete cascade,
  installment_number integer not null check (installment_number >= 1),
  due_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria')),
  cash_movement_id uuid references public.cash_movements(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promissory_note_id, installment_number)
);

alter table public.promissory_notes enable row level security;
alter table public.promissory_installments enable row level security;

drop policy if exists "Authenticated users can view promissory notes." on public.promissory_notes;
drop policy if exists "Authenticated users can create promissory notes." on public.promissory_notes;
drop policy if exists "Authenticated users can update promissory notes." on public.promissory_notes;
create policy "Authenticated users can view promissory notes." on public.promissory_notes
for select to authenticated using (true);
create policy "Authenticated users can create promissory notes." on public.promissory_notes
for insert to authenticated with check (true);
create policy "Authenticated users can update promissory notes." on public.promissory_notes
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view promissory installments." on public.promissory_installments;
drop policy if exists "Authenticated users can create promissory installments." on public.promissory_installments;
drop policy if exists "Authenticated users can update promissory installments." on public.promissory_installments;
create policy "Authenticated users can view promissory installments." on public.promissory_installments
for select to authenticated using (true);
create policy "Authenticated users can create promissory installments." on public.promissory_installments
for insert to authenticated with check (true);
create policy "Authenticated users can update promissory installments." on public.promissory_installments
for update to authenticated using (true) with check (true);

drop trigger if exists promissory_notes_set_updated_at on public.promissory_notes;
create trigger promissory_notes_set_updated_at before update on public.promissory_notes
for each row execute function public.set_updated_at();

drop trigger if exists promissory_installments_set_updated_at on public.promissory_installments;
create trigger promissory_installments_set_updated_at before update on public.promissory_installments
for each row execute function public.set_updated_at();

create index if not exists promissory_notes_sale_id_idx on public.promissory_notes (sale_id);
create index if not exists promissory_notes_customer_id_idx on public.promissory_notes (customer_id);
create index if not exists promissory_notes_status_idx on public.promissory_notes (status);
create unique index if not exists promissory_notes_sale_id_key on public.promissory_notes (sale_id);
create index if not exists promissory_installments_note_id_idx on public.promissory_installments (promissory_note_id);
create index if not exists promissory_installments_due_date_idx on public.promissory_installments (due_date);
create index if not exists promissory_installments_status_idx on public.promissory_installments (status);
create unique index if not exists promissory_installments_cash_movement_id_key on public.promissory_installments (cash_movement_id);

alter table public.cash_movements add column if not exists sale_payment_id uuid;
alter table public.cash_movements drop constraint if exists cash_movements_sale_payment_id_fkey;
alter table public.cash_movements
add constraint cash_movements_sale_payment_id_fkey
foreign key (sale_payment_id) references public.sale_payments(id) on delete set null;

alter table public.stock_movements add column if not exists cash_movement_id uuid references public.cash_movements(id) on delete set null;

drop function if exists public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, jsonb);

create or replace function public.register_sale_with_cash_and_stock(
  p_items jsonb,
  p_payment_method text default null,
  p_installments_count integer default 1,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_cash_session_id uuid default null,
  p_customer_id uuid default null,
  p_payments jsonb default null,
  p_promissory_plan jsonb default null
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
  v_has_promissory_payment boolean := false;
  v_has_non_promissory_payment boolean := false;
  v_summary_payment_method text;
  v_summary_installments_count integer := 1;
  v_sale_payment_id uuid;
  v_promissory_note_id uuid;
  v_promissory_installments_count integer := 1;
  v_promissory_interval_days integer := 30;
  v_promissory_first_due_date date;
  v_promissory_entry_amount numeric(12, 2) := 0;
  v_promissory_notes text;
  v_promissory_installment_amount numeric(12, 2);
  v_installment_number integer;
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

  if p_promissory_plan is not null then
    if p_customer_id is null then
      raise exception 'Informe um cliente para vendas com promissória.';
    end if;

    v_promissory_installments_count := greatest(1, coalesce((p_promissory_plan->>'installments_count')::integer, 1));
    v_promissory_interval_days := greatest(1, coalesce((p_promissory_plan->>'interval_days')::integer, 30));
    v_promissory_entry_amount := greatest(0, round(coalesce((p_promissory_plan->>'entry_amount')::numeric, 0), 2));

    if v_promissory_entry_amount >= v_total then
      raise exception 'A entrada precisa ser menor que o total da venda.';
    end if;

    if v_promissory_entry_amount > 0 and v_promissory_installments_count < 2 then
      raise exception 'Com entrada, use ao menos 2 parcelas.';
    end if;

    v_promissory_first_due_date := coalesce(
      nullif(trim(coalesce(p_promissory_plan->>'first_due_date', '')), '')::date,
      coalesce(p_movement_date, current_date) + v_promissory_interval_days
    );
    v_promissory_notes := nullif(trim(coalesce(p_promissory_plan->>'notes', '')), '');
  end if;

  v_payments := p_payments;
  if v_payments is null or jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments) = 0 then
    if p_promissory_plan is not null then
      v_payments := jsonb_build_array(
        jsonb_build_object(
          'source_kind', 'promissory_group',
          'payment_method', 'promissoria',
          'amount', v_total,
          'installments_count', v_promissory_installments_count,
          'installment_value', case
            when v_promissory_entry_amount > 0 then v_promissory_entry_amount
            else round((v_total / greatest(1, v_promissory_installments_count))::numeric, 2)
          end
        )
      );
    else
      if p_payment_method is null then
        raise exception 'Informe ao menos uma forma de recebimento.';
      end if;
      if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria') then
        raise exception 'Forma de pagamento inválida.';
      end if;
      if p_payment_method = 'promissoria' then
        raise exception 'Use a configuração de promissória para definir os períodos.';
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

    if v_payment_method_value not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro', 'promissoria') then
      raise exception 'Forma de pagamento inválida.';
    end if;
    if v_payment_source_kind not in ('cash_total', 'installment_group', 'promissory_group') then
      raise exception 'Origem de recebimento inválida.';
    end if;
    if v_payment_amount <= 0 then
      raise exception 'Informe valores válidos para os recebimentos.';
    end if;

    if v_payment_source_kind = 'promissory_group' then
      if p_promissory_plan is null then
        raise exception 'Informe a configuração da promissória antes de finalizar.';
      end if;
      if v_payment_method_value <> 'promissoria' then
        raise exception 'A promissória precisa ser recebida como promissória.';
      end if;
    elsif v_payment_source_kind = 'installment_group'
       and (v_payment_method_value <> 'cartao_credito' or v_payment_installments_count < 2) then
      raise exception 'Os itens parcelados precisam ser recebidos no crédito parcelado.';
    end if;

    if v_payment_source_kind = 'promissory_group' then
      v_has_promissory_payment := true;
    else
      v_has_non_promissory_payment := true;
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

  if v_has_promissory_payment and v_has_non_promissory_payment then
    raise exception 'A promissória não pode ser combinada com outras formas de recebimento nesta versão.';
  end if;

  v_summary_payment_method := case
    when v_has_mixed_payment_method then 'outro'
    when v_has_promissory_payment then 'promissoria'
    else coalesce(v_first_payment_method, coalesce(p_payment_method, 'outro'))
  end;

  insert into public.sales (
    user_id, customer_id, total_amount, payment_method, installments_count, status, sale_date
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

  if v_has_promissory_payment then
    v_promissory_installment_amount := case
      when v_promissory_entry_amount > 0 then round((v_total - v_promissory_entry_amount) / greatest(v_promissory_installments_count - 1, 1)::numeric, 2)
      else round((v_total / greatest(1, v_promissory_installments_count))::numeric, 2)
    end;

    insert into public.promissory_notes (
      sale_id, customer_id, total_amount, installments_count, interval_days, first_due_date, status, notes
    )
    values (
      v_sale_id,
      p_customer_id,
      v_total,
      v_promissory_installments_count,
      v_promissory_interval_days,
      v_promissory_first_due_date,
      'open',
      v_promissory_notes
    )
    returning id into v_promissory_note_id;

    for v_installment_number in 1..v_promissory_installments_count loop
      insert into public.promissory_installments (
        promissory_note_id, installment_number, due_date, amount, status
      )
      values (
        v_promissory_note_id,
        v_installment_number,
        v_promissory_first_due_date + ((v_installment_number - 1) * v_promissory_interval_days),
        case
          when v_promissory_entry_amount > 0 and v_installment_number = 1
            then v_promissory_entry_amount
          when v_promissory_entry_amount > 0 and v_installment_number = v_promissory_installments_count
            then round((v_total - v_promissory_entry_amount - (v_promissory_installment_amount * (v_promissory_installments_count - 2)))::numeric, 2)
          when v_promissory_entry_amount = 0 and v_installment_number = v_promissory_installments_count
            then round((v_total - (v_promissory_installment_amount * (v_promissory_installments_count - 1)))::numeric, 2)
          else v_promissory_installment_amount
        end,
        'pending'
      );
    end loop;
  end if;

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
      sale_id, product_id, quantity, pricing_kind, original_unit_price, unit_price, total_price, installments_count, installment_value
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
      user_id, product_id, sale_id, type, reason, quantity, notes
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
      sale_id, source_kind, payment_method, amount, installments_count, installment_value
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

    if v_payment_source_kind <> 'promissory_group' then
      insert into public.cash_movements as cm (
        user_id, created_by, sale_id, sale_payment_id, cash_session_id, type, origin, description, amount, movement_date, payment_method, notes
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

grant execute on function public.register_sale_with_cash_and_stock(jsonb, text, integer, date, text, uuid, uuid, uuid, jsonb, jsonb) to authenticated;

create or replace function public.register_promissory_installment_payment_with_cash(
  p_installment_id uuid,
  p_payment_method text,
  p_movement_date date default current_date,
  p_notes text default null,
  p_user_id uuid default auth.uid(),
  p_cash_session_id uuid default null,
  p_confirmation_pin text default null
)
returns table (
  installment_id uuid,
  note_id uuid,
  cash_movement_id uuid
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor_user_id uuid;
  v_actor_role text;
  v_installment record;
  v_customer_name text := 'Cliente';
  v_cash_movement_id uuid;
  v_movement_code text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_confirmation_pin is null or trim(p_confirmation_pin) = '' then
    raise exception 'Confirme a operação com o PIN antes de receber a promissória.';
  end if;

  if p_cash_session_id is null then
    raise exception 'Abra o caixa para receber a promissória.';
  end if;

  if p_payment_method not in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  select user_id, role
  into v_actor_user_id, v_actor_role
  from public.get_authenticated_user_by_pin(p_confirmation_pin, coalesce(p_user_id, auth.uid()));

  if v_actor_user_id is null then
    raise exception 'PIN inválido para o usuário autenticado.';
  end if;

  select
    pi.id as installment_id,
    pi.promissory_note_id as note_id,
    pi.installment_number,
    pi.due_date,
    pi.amount,
    pi.status,
    pi.notes as installment_notes,
    pn.sale_id,
    pn.customer_id,
    pn.installments_count,
    pn.status as note_status
  into v_installment
  from public.promissory_installments pi
  join public.promissory_notes pn on pn.id = pi.promissory_note_id
  where pi.id = p_installment_id
  for update;

  if not found then
    raise exception 'Parcela não encontrada.';
  end if;

  if v_installment.status <> 'pending' then
    raise exception 'Esta parcela já foi recebida.';
  end if;

  if v_installment.note_status = 'cancelled' then
    raise exception 'Esta promissória foi cancelada.';
  end if;

  if v_installment.customer_id is not null then
    select coalesce(c.name, 'Cliente')
    into v_customer_name
    from public.customers c
    where c.id = v_installment.customer_id;
  end if;

  insert into public.cash_movements as cm (
    user_id, created_by, sale_id, cash_session_id, type, origin, description, amount, movement_date, payment_method, notes
  )
  values (
    v_actor_user_id,
    auth.uid(),
    v_installment.sale_id,
    p_cash_session_id,
    'income',
    'promissory',
    'Promissória ' || v_installment.installment_number || '/' || v_installment.installments_count || ' - ' || v_customer_name,
    v_installment.amount,
    coalesce(p_movement_date, current_date),
    p_payment_method,
    p_notes
  )
  returning id, cm.movement_code
  into v_cash_movement_id, v_movement_code;

  update public.promissory_installments
  set
    status = 'paid',
    paid_at = now(),
    payment_method = p_payment_method,
    cash_movement_id = v_cash_movement_id,
    notes = coalesce(p_notes, notes)
  where id = v_installment.installment_id;

  update public.promissory_notes
  set status = case
    when exists (
      select 1
      from public.promissory_installments
      where promissory_note_id = v_installment.note_id
        and status <> 'paid'
    ) then 'open'
    else 'paid'
  end
  where id = v_installment.note_id;

  return query
  select
    v_installment.installment_id as installment_id,
    v_installment.note_id as note_id,
    v_cash_movement_id as cash_movement_id;
end;
$$;

grant execute on function public.register_promissory_installment_payment_with_cash(uuid, text, date, text, uuid, uuid, text) to authenticated;
