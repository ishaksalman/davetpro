-- =============================================================================
-- DavetPro · 0025 · DavetMekanı bağlama kodları
--
-- Mekan sahibinin her iki üründe de hesabı varken kullandığı akış:
--   DavetPro › Ayarlar › "DavetMekanı'nda yayınla" → kod üretilir
--   DavetMekanı › Panel › "DavetPro hesabımı bağla" → kod girilir
--   DavetMekanı sunucusu kodu doğrular ve business_id/venue_id'yi öğrenir
--
-- Kod tek kullanımlık ve kısa ömürlü. Amacı iki hesabın aynı kişiye ait
-- olduğunu kanıtlamak; kalıcı bir sır değil.
-- =============================================================================

create table public.integration_link_codes (
  code        text primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Hangi salonun eşleştirileceği. Boşsa yalnızca işletme bağlanır.
  venue_id    uuid,
  created_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (venue_id, business_id)
    references public.venues (id, business_id) on delete cascade
);

create index integration_link_codes_business_idx
  on public.integration_link_codes (business_id, created_at desc);

alter table public.integration_link_codes enable row level security;

-- Kodu yalnızca kendi işletmesinin sahibi/yöneticisi görebilir.
create policy integration_link_codes_read on public.integration_link_codes
  for select using (business_id = public.current_business_id());

-- --- Kod üretimi ------------------------------------------------------------
-- Karışabilen karakterler (I, O, 0, 1) alfabeden çıkarıldı; kod telefonda
-- okunup elle giriliyor.

create or replace function public.generate_integration_link_code(
  p_venue_id uuid default null
)
-- ÇIKTI ADLARI tablo kolonlarıyla çakışmamalı: `code` / `expires_at` OUT
-- parametresi olarak tanımlanınca gövdedeki aynı adlı kolon referansları
-- "ambiguous" hatası veriyor.
returns table (link_code text, valid_until timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_code        text;
  v_alphabet    text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_expires     timestamptz := now() + interval '15 minutes';
  i             integer;
begin
  if v_business_id is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if p_venue_id is not null and not exists (
    select 1 from public.venues
     where id = p_venue_id and business_id = v_business_id
  ) then
    raise exception 'Salon bu işletmeye ait değil.' using errcode = 'insufficient_privilege';
  end if;

  -- Aynı işletmenin bekleyen kodlarını geçersiz kıl; ekranda tek geçerli
  -- kod olsun, kullanıcı hangisini gireceğini düşünmesin.
  update public.integration_link_codes c
     set consumed_at = now()
   where c.business_id = v_business_id
     and c.consumed_at is null
     and c.expires_at > now();

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.integration_link_codes c where c.code = v_code);
  end loop;

  insert into public.integration_link_codes (code, business_id, venue_id, created_by, expires_at)
  values (v_code, v_business_id, p_venue_id, auth.uid(), v_expires);

  return query select v_code, v_expires;
end;
$$;

grant execute on function public.generate_integration_link_code(uuid) to authenticated;

-- --- Kod tüketimi -----------------------------------------------------------
-- DavetMekanı sunucusu service_role ile çağırır. Kod tek kullanımlık.

create or replace function public.consume_integration_link_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.integration_link_codes;
  v_business_name text;
  v_venue_name text;
begin
  select * into v_row
    from public.integration_link_codes
   where code = upper(btrim(p_code))
   for update;

  if v_row.code is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.consumed_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_used');
  end if;
  if v_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  update public.integration_link_codes
     set consumed_at = now()
   where code = v_row.code;

  select name into v_business_name from public.businesses where id = v_row.business_id;
  if v_row.venue_id is not null then
    select name into v_venue_name from public.venues where id = v_row.venue_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'business_id', v_row.business_id,
    'business_name', v_business_name,
    'venue_id', v_row.venue_id,
    'venue_name', v_venue_name
  );
end;
$$;

revoke all on function public.consume_integration_link_code(text)
  from public, anon, authenticated;
