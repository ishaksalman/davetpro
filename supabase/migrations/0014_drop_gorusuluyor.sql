-- =============================================================================
-- DavetPro · 0014 · 'gorusuluyor' durumu kaldırılıyor
--
-- Pratikte "Yeni talep" ile "Görüşülüyor" ayrımı yapılmıyor: müşteriyle
-- konuşulmuş ama teklif verilmemiş bir talep hâlâ yeni taleptir. Hattı
-- kısaltmak panoyu da sadeleştiriyor.
--
-- Yeni hat: yeni → teklif_verildi → opsiyonlu → kazanildi / kaybedildi
--
-- Enum değeri ölü bırakılmıyor, tip yeniden kuruluyor. Tipe bağlı tek nesne
-- leads.status kolonu; fonksiyon gövdeleri metin olarak saklandığı için
-- bağımlılık oluşturmuyor, ancak içlerindeki referanslar aşağıda güncelleniyor.
-- =============================================================================

update public.leads set status = 'yeni' where status = 'gorusuluyor';

-- Kolon tipini değiştirmek için, tanımında 'status' kolonunu adıyla anan
-- trigger'lar geçici olarak kaldırılmalı; sonunda geri kuruluyorlar.
drop trigger if exists leads_hold_status_guard on public.leads;
drop trigger if exists leads_conflict_guard on public.leads;

-- Aynı şekilde, status'ü karşılaştıran CHECK kısıtı da eski tipe bağlı.
alter table public.leads drop constraint if exists leads_lost_reason_required;

-- Kısmi indeksin WHERE koşulu da eski tipe bağlı.
drop index if exists public.leads_follow_up_idx;

alter type public.lead_status rename to lead_status_old;

create type public.lead_status as enum (
  'yeni',            -- Yeni talep
  'teklif_verildi',  -- Teklif verildi
  'opsiyonlu',       -- Tarih opsiyona alındı
  'kazanildi',       -- Rezervasyona dönüştü
  'kaybedildi'       -- Kaybedildi
);

alter table public.leads
  alter column status drop default,
  alter column status type public.lead_status using status::text::public.lead_status,
  alter column status set default 'yeni';

drop type public.lead_status_old;

create index leads_follow_up_idx on public.leads (business_id, next_follow_up_at)
  where status not in ('kazanildi', 'kaybedildi');

alter table public.leads
  add constraint leads_lost_reason_required check (
    (status = 'kaybedildi' and lost_reason is not null)
    or (status <> 'kaybedildi' and lost_reason is null)
  );

create trigger leads_conflict_guard
  before insert or update of venue_id, event_date, start_time, end_time, status
  on public.leads
  for each row execute function public.lead_conflict_guard();

create trigger leads_hold_status_guard
  before update of status on public.leads
  for each row execute function public.lead_hold_status_guard();

-- --- Eski değere bakan fonksiyonlar ------------------------------------------

-- Teklif verilince talep hattın bir sonraki adımına geçiyordu; koşuldaki
-- 'gorusuluyor' değeri artık yok. Gövde 0008'dekiyle birebir aynı.
create or replace function public.save_quote(
  p_lead_id         uuid,
  p_venue_id        uuid,
  p_package_id      uuid,
  p_guest_count     integer,
  p_package_amount  numeric,
  p_discount_amount numeric,
  p_valid_until     date,
  p_notes           text,
  p_items           jsonb default '[]'::jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_business uuid := public.current_business_id();
  v_year     integer := extract(year from (now() at time zone 'Europe/Istanbul'))::int;
  v_seq      integer;
  v_number   text;
  v_version  integer;
  v_row      public.quotes;
begin
  if v_business is null or not public.can_see_finance() then
    raise exception 'Teklif oluşturmak için finansal yetki gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Talep gerçekten bu işletmenin mi? RLS'i security definer atladığı için
  -- tenant kontrolü burada elle yapılıyor.
  if not exists (
    select 1 from public.leads
     where id = p_lead_id and business_id = v_business
  ) then
    raise exception 'Talep bulunamadı.' using errcode = 'no_data_found';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
    from public.quotes where lead_id = p_lead_id;

  -- Numara tahsisi tek ifadede, satır kilidiyle: eşzamanlı iki teklif aynı
  -- numarayı alamaz ve sıra atlamaz.
  insert into public.quote_counters (business_id, year, last_no)
  values (v_business, v_year, 1)
  on conflict (business_id, year)
    do update set last_no = public.quote_counters.last_no + 1
  returning last_no into v_seq;

  v_number := 'TKL-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');

  insert into public.quotes (
    business_id, lead_id, quote_number, version, venue_id, package_id,
    guest_count, package_amount, discount_amount, valid_until, notes, created_by
  ) values (
    v_business, p_lead_id, v_number, v_version, p_venue_id, p_package_id,
    p_guest_count, coalesce(p_package_amount, 0), coalesce(p_discount_amount, 0),
    p_valid_until, nullif(btrim(p_notes), ''), auth.uid()
  )
  returning * into v_row;

  insert into public.quote_items (business_id, quote_id, name, amount, sort_order)
  select v_business, v_row.id, btrim(item ->> 'name'),
         (item ->> 'amount')::numeric, (ordinality - 1)::int
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, ordinality)
   where length(btrim(coalesce(item ->> 'name', ''))) > 0;

  -- extras_amount trigger ile güncellendi; güncel satırı geri oku.
  select * into v_row from public.quotes where id = v_row.id;

  -- Teklif verilen talep hattın bir sonraki adımına geçer; kazanılmış veya
  -- kaybedilmiş bir talebin durumu geri alınmaz.
  update public.leads
     set status = 'teklif_verildi', last_contact_at = now()
   where id = p_lead_id
     and status = 'yeni';

  return v_row;
end;
$fn$;

grant execute on function public.save_quote(
  uuid, uuid, uuid, integer, numeric, numeric, date, text, jsonb
) to authenticated;

-- Opsiyon kapanınca talep geri düşerken artık 'yeni'ye dönüyor.
create or replace function public.lead_hold_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_lead record;
begin
  if old.status <> 'aktif' or new.status = 'aktif' or new.status = 'donusturuldu' then
    return new;
  end if;

  select id, status into v_lead from public.leads where id = new.lead_id;
  if not found or v_lead.status <> 'opsiyonlu' then
    return new;
  end if;

  if exists (
    select 1 from public.venue_holds
     where lead_id = new.lead_id and id <> new.id
       and status = 'aktif' and expires_at > now()
  ) then
    return new;
  end if;

  update public.leads
     set status = case
       when exists (select 1 from public.quotes where lead_id = new.lead_id)
         then 'teklif_verildi'::public.lead_status
       else 'yeni'::public.lead_status
     end
   where id = new.lead_id;

  return new;
end;
$fn$;
