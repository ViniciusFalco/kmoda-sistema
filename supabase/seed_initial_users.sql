-- Seed inicial de perfis do KModa
-- Execute depois da migração `20260610_pin_auth.sql`.
-- Pré-requisito: as contas precisam existir no Supabase Auth.
-- Se ainda não existirem, crie primeiro em Authentication > Users ou via convite.

with seed_data(email, name, role) as (
  values
    ('mixviniciusfalco@gmail.com', 'Vinicius Falco', 'admin'),
    ('admin2@exemplo.com', 'Administradora 2', 'admin'),
    ('caixa1@exemplo.com', 'Operadora Caixa 1', 'cashier')
)
insert into public.profiles (user_id, name, role, active)
select
  u.id,
  s.name,
  s.role,
  true
from seed_data s
join auth.users u
  on lower(u.email) = lower(s.email)
on conflict (user_id) do update
set name = excluded.name,
    role = excluded.role,
    active = true,
    updated_at = now();

-- Conferência rápida:
select
  u.email,
  p.name,
  p.role,
  p.active,
  p.pin_hash is not null as pin_configured
from auth.users u
left join public.profiles p on p.user_id = u.id
where lower(u.email) in (
  lower('mixviniciusfalco@gmail.com'),
  lower('admin2@exemplo.com'),
  lower('caixa1@exemplo.com')
)
order by u.email;
