-- =============================================================================
-- DavetPro · 0038 · Ekipler
--
-- Plato ile ekip AYRI kavramlar. Plato kısıtlı kaynak: aynı platoda aynı
-- saatte iki çekim olmaz (0037). Ekip ise çekime atanan kişiler ve
-- ZORUNLU DEĞİL — atama sonradan yapılabilir, hiç yapılmayabilir.
--
-- NEDEN EKİPTE ÇAKIŞMA KISITI YOK: istenmedi ve varsayılan olarak koymak
-- yanlış olurdu. Aynı ekibin arka arkaya iki işe yetişmesi (nikâh + düğün)
-- bu işte olağan; kısıt koysak meşru kaydı engellerdik. İstenirse plato
-- kısıtının aynısı sonradan eklenebilir.
-- =============================================================================

create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null default public.current_business_id()
                 references public.businesses (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  -- Ekipte kimler var: serbest metin. Personel tablosu değil — fotoğrafçıların
  -- çoğu freelance çalışıyor, sabit kadro varsaymak yanlış olurdu.
  members      text,
  phone        text,
  note         text,
  color        text not null default '#0ea5e9' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Bileşik unique: rezervasyondan gelen FK'nın kiracıyı da doğrulaması için.
  unique (id, business_id),
  unique (business_id, name)
);

create index if not exists teams_business_id_idx on public.teams (business_id);

alter table public.teams enable row level security;
alter table public.teams force  row level security;

drop policy if exists teams_select on public.teams;
drop policy if exists teams_insert on public.teams;
drop policy if exists teams_update on public.teams;
drop policy if exists teams_delete on public.teams;

create policy teams_select on public.teams for select to authenticated
  using (business_id = public.current_business_id());
create policy teams_insert on public.teams for insert to authenticated
  with check (business_id = public.current_business_id());
create policy teams_update on public.teams for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
create policy teams_delete on public.teams for delete to authenticated
  using (business_id = public.current_business_id());

-- 0004'teki toplu grant yalnızca o an var olan tablolara işledi; sonradan
-- eklenen her tablo kendi iznini vermek zorunda.
grant select, insert, update, delete on public.teams to authenticated;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- --- Rezervasyona ekip alanı --------------------------------------------------

alter table public.reservations
  add column if not exists team_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservations_team_fk'
  ) then
    alter table public.reservations
      add constraint reservations_team_fk
      foreign key (team_id, business_id)
      references public.teams (id, business_id)
      -- Kolon listesi ŞART: bileşik FK'da düz "set null" business_id'yi de
      -- null'a çekmeye çalışır ve o kolon not null. Silinen ekipte yalnızca
      -- atama kalkmalı, rezervasyonun kiracısı değil.
      on delete set null (team_id);
  end if;
end $$;

create index if not exists reservations_team_id_idx
  on public.reservations (team_id) where team_id is not null;

comment on column public.reservations.team_id is
  'Çekimi yapacak ekip. Opsiyonel: atama sonradan yapılabilir.';

-- --- save_reservation: ekip parametresi ---------------------------------------
--
-- create or replace parametre listesini değiştiremiyor (42P13); eski imza
-- önce düşürülüyor. Çağıran istemci tek: yeni imzayı kullanıyor.

drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text
);
-- Yeni imza da düşürülüyor: yoksa bu dosya ikinci kez çalıştırıldığında
-- "already exists with same argument types" veriyor.
drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text, uuid
);

create function public.save_reservation(
  p_id                uuid,
  p_customer_id       uuid,
  p_venue_id          uuid,
  p_package_id        uuid,
  p_organization_type public.organization_type,
  p_status            public.reservation_status,
  p_event_date        date,
  p_start_time        time,
  p_end_time          time,
  p_guest_count       integer,
  p_notes             text,
  p_gross_amount      numeric,
  p_discount_amount   numeric,
  p_due_date          date,
  p_unit_price        numeric default null,
  -- Ek hizmet kalemleri: [{ "name": "Dış çekim", "amount": 12000 }]
  p_items             jsonb default null,
  -- Etkinliğin yapılacağı adres. Fotoğrafçı müşterinin mekânına gidiyor;
  -- salon kendi mekânında çalıştığı için orada boş kalıyor.
  p_location          text default null,
  -- Çekimi yapacak ekip. Opsiyonel: plato gibi bir çakışma kısıtı yok.
  p_team_id           uuid default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_id     uuid;
  v_extras numeric := 0;
begin
  if p_id is null then
    insert into public.reservations (
      customer_id, venue_id, package_id, organization_type, status,
      event_date, start_time, end_time, guest_count, notes, location, team_id
    ) values (
      p_customer_id, p_venue_id, p_package_id, p_organization_type, p_status,
      p_event_date, p_start_time, p_end_time, p_guest_count,
      nullif(btrim(p_notes), ''), nullif(btrim(p_location), ''), p_team_id
    )
    returning id into v_id;
  else
    update public.reservations set
      customer_id       = p_customer_id,
      venue_id          = p_venue_id,
      package_id        = p_package_id,
      organization_type = p_organization_type,
      status            = p_status,
      event_date        = p_event_date,
      start_time        = p_start_time,
      end_time          = p_end_time,
      guest_count       = p_guest_count,
      notes             = nullif(btrim(p_notes), ''),
      location          = nullif(btrim(p_location), ''),
      team_id           = p_team_id
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Rezervasyon bulunamadı.' using errcode = 'no_data_found';
    end if;
  end if;

  -- Finans yetkisi olmayan personel fiyat yazamaz; rezervasyon yine oluşur.
  if public.can_see_finance() and p_gross_amount is not null then
    /*
     * p_items VERİLDİYSE kalemler baştan yazılır. null ise kalemlere hiç
     * dokunulmaz: convert_lead bu fonksiyonu kalem göndermeden çağırıyor ve
     * oradaki davranış değişmemeli.
     *
     * Silip yeniden yazmak, satır satır eşleştirmekten basit ve kalemlerin
     * kendi kimliğine bağlı hiçbir kayıt yok (ödeme kaleme değil rezervasyona
     * bağlanıyor).
     */
    if p_items is not null then
      delete from public.reservation_items where reservation_id = v_id;

      insert into public.reservation_items (reservation_id, name, amount, sort_order)
      select v_id, btrim(item ->> 'name'),
             (item ->> 'amount')::numeric, (ordinality - 1)::int
        from jsonb_array_elements(p_items) with ordinality as t(item, ordinality)
       where length(btrim(coalesce(item ->> 'name', ''))) > 0;
    end if;

    select coalesce(sum(amount), 0) into v_extras
      from public.reservation_items where reservation_id = v_id;

    /*
     * p_gross_amount PAKET tutarı; brüt, kalemler eklenerek bulunuyor.
     * convert_lead teklifin toplamını gönderip kalem göndermediği için orada
     * brüt = toplam olarak kalıyor, yani davranış aynı.
     */
    insert into public.reservation_pricing
      (reservation_id, package_amount, extras_amount, gross_amount,
       discount_amount, due_date, unit_price)
    values
      (v_id, p_gross_amount, v_extras, p_gross_amount + v_extras,
       coalesce(p_discount_amount, 0), p_due_date, p_unit_price)
    on conflict (reservation_id) do update set
      package_amount  = excluded.package_amount,
      extras_amount   = excluded.extras_amount,
      gross_amount    = excluded.gross_amount,
      discount_amount = excluded.discount_amount,
      due_date        = excluded.due_date,
      unit_price      = excluded.unit_price;
  end if;

  return v_id;
end;
$fn$;

revoke execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text, uuid
) from public;
grant execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text, uuid
) to authenticated;
