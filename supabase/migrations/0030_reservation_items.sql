-- =============================================================================
-- DavetPro · 0030 · Rezervasyona ek hizmet kalemleri
--
-- Teklifte "Ek hizmetler" bölümü vardı (quote_items) ama teklif rezervasyona
-- dönüşürken kalemler tek bir tutara çöküyordu. Rezervasyona sonradan eklenen
-- bir hizmet (dış çekim gibi) ise hiçbir yere yazılamıyordu: brüt tutarı elle
-- artırıp not düşmek gerekiyordu, döküm kayboluyordu.
--
-- Kurulan kural TEK cümle: brüt = paket tutarı + kalemler toplamı.
-- Bu bir CHECK ile zorlanıyor, yani "aspirasyon" değil garanti.
--
-- gross_amount üretilen (generated) kolona ÇEVRİLMEDİ: net_amount ondan
-- türüyor ve iki görünüm ile birkaç fonksiyon ona bağlı. Üretilen kolona
-- çevirmek gross ve net'i düşürüp yeniden oluşturmayı, dolayısıyla canlı
-- finansal veride zincirleme bir göçü gerektirirdi. Aynı garanti CHECK ve
-- tetikleyiciyle, çok daha küçük bir yüzeyle sağlanıyor.
-- =============================================================================

-- --- Kalemler ----------------------------------------------------------------

create table if not exists public.reservation_items (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null default public.current_business_id()
                   references public.businesses (id) on delete cascade,
  reservation_id uuid not null,
  name           text not null check (length(btrim(name)) > 0),
  amount         numeric(12, 2) not null check (amount >= 0),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),

  unique (id, business_id),

  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete cascade
);

create index if not exists reservation_items_reservation_idx
  on public.reservation_items (reservation_id, sort_order);

alter table public.reservation_items enable row level security;
alter table public.reservation_items force row level security;

-- Tutar taşıdığı için finans yetkisine bağlı; reservation_pricing ile aynı.
drop policy if exists reservation_items_select on public.reservation_items;
create policy reservation_items_select on public.reservation_items
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

drop policy if exists reservation_items_insert on public.reservation_items;
create policy reservation_items_insert on public.reservation_items
  for insert to authenticated
  with check (business_id = public.current_business_id() and public.can_see_finance());

drop policy if exists reservation_items_update on public.reservation_items;
create policy reservation_items_update on public.reservation_items
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

drop policy if exists reservation_items_delete on public.reservation_items;
create policy reservation_items_delete on public.reservation_items
  for delete to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

grant select, insert, update, delete on public.reservation_items to authenticated;

-- --- Fiyat tablosu -----------------------------------------------------------

alter table public.reservation_pricing
  add column if not exists package_amount numeric(12, 2) not null default 0
    check (package_amount >= 0);

alter table public.reservation_pricing
  add column if not exists extras_amount numeric(12, 2) not null default 0
    check (extras_amount >= 0);

comment on column public.reservation_pricing.package_amount is
  'Paket/temel tutar. Brüt = paket + ek hizmetler.';

-- Mevcut kayıtlarda kalem yok; brütün tamamı paket tutarıdır.
update public.reservation_pricing
   set package_amount = gross_amount
 where package_amount = 0 and gross_amount > 0;

alter table public.reservation_pricing
  drop constraint if exists pricing_gross_is_package_plus_extras;
alter table public.reservation_pricing
  add constraint pricing_gross_is_package_plus_extras
  check (gross_amount = package_amount + extras_amount);

-- --- Kalem değişince toplamlar güncel kalsın ---------------------------------
-- security definer: kural her koşulda korunmalı, çağıranın yetkisine
-- bırakılmamalı. Kalem yazma yetkisi zaten politikada denetleniyor.
create or replace function public.sync_reservation_extras()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_reservation uuid := coalesce(new.reservation_id, old.reservation_id);
  v_extras      numeric;
begin
  select coalesce(sum(amount), 0) into v_extras
    from public.reservation_items where reservation_id = v_reservation;

  update public.reservation_pricing
     set extras_amount = v_extras,
         gross_amount  = package_amount + v_extras
   where reservation_id = v_reservation;

  return null;
end;
$fn$;

drop trigger if exists reservation_items_sync on public.reservation_items;
create trigger reservation_items_sync
  after insert or update or delete on public.reservation_items
  for each row execute function public.sync_reservation_extras();

-- --- save_reservation --------------------------------------------------------
-- Yeni parametre (p_items) arity değiştiriyor; eski imza düşürülmeli.
-- convert_lead bu fonksiyonu çağırıyor ama PostgreSQL fonksiyon gövdesindeki
-- çağrılar için bağımlılık tutmuyor, çözüm çalışma anında yapılıyor.
drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric);

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
  p_items             jsonb default null
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
      event_date, start_time, end_time, guest_count, notes
    ) values (
      p_customer_id, p_venue_id, p_package_id, p_organization_type, p_status,
      p_event_date, p_start_time, p_end_time, p_guest_count, nullif(btrim(p_notes), '')
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
      notes             = nullif(btrim(p_notes), '')
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

grant execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb
) to authenticated;


-- --- Görünüme paket ve ek hizmet tutarları --------------------------------
-- Rezervasyon düzenlenirken formun PAKET tutarını geri yükleyebilmesi için
-- gerekiyor; brütten kalemleri çıkararak tahmin etmek kırılgan olurdu.
-- Kolonlar SONA ekleniyor: create or replace view mevcut kolonların adını,
-- tipini ve sırasını değiştirmeye izin vermiyor.
create or replace view public.reservation_financials with (security_invoker = true) as
select
  r.id                                  as reservation_id,
  r.business_id,
  r.venue_id,
  r.customer_id,
  r.package_id,
  r.event_date,
  r.status,
  r.organization_type,
  coalesce(p.gross_amount, 0)           as gross_amount,
  coalesce(p.discount_amount, 0)        as discount_amount,
  coalesce(p.net_amount, 0)             as net_amount,
  p.due_date,
  coalesce(pay.collected, 0)            as collected_amount,
  coalesce(p.net_amount, 0) - coalesce(pay.collected, 0) as balance_amount,
  coalesce(exp.total, 0)                as expense_amount,
  coalesce(p.net_amount, 0) - coalesce(exp.total, 0)     as profit_amount,
  case
    when coalesce(p.net_amount, 0) > 0
    then round((coalesce(p.net_amount, 0) - coalesce(exp.total, 0)) * 100 / p.net_amount, 2)
  end                                   as profit_margin,
  p.unit_price,
  coalesce(p.package_amount, 0)         as package_amount,
  coalesce(p.extras_amount, 0)          as extras_amount
from public.reservations r
left join public.reservation_pricing p on p.reservation_id = r.id
left join lateral (
  select sum(amount) as collected
  from public.payments
  where reservation_id = r.id and voided_at is null
) pay on true
left join lateral (
  select sum(amount) as total
  from public.expenses
  where reservation_id = r.id and voided_at is null
) exp on true;

grant select on public.reservation_financials to authenticated;
