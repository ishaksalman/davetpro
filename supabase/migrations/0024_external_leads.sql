-- =============================================================================
-- DavetPro · 0024 · Dış kaynaklı talepler (DavetMekanı entegrasyonu)
--
-- DavetMekanı pazaryerinden gelen teklif talepleri buraya lead olarak
-- düşüyor. Kontrat: DavetMekanı deposunda docs/DAVETPRO-ENTEGRASYON.md
--
-- İki şey gerekiyordu:
--  1. Talebin nereden geldiğini ayırt etmek. `source = 'web'` kendi
--     sitemizden gelen formla pazaryerini ayırmıyor.
--  2. Idempotency. Ağ hatası sonrası yeniden gönderim ve geçmiş toplu
--     aktarım aynı talebi iki kez lead'e çevirmemeli.
-- =============================================================================

alter table public.leads
  add column if not exists external_source text,
  add column if not exists external_id     text;

comment on column public.leads.external_source is
  'Dış kaynak anahtarı (ör. ''davetmekani''). Kendi formumuzdan gelenlerde null.';
comment on column public.leads.external_id is
  'Kaynak sistemdeki kayıt id''si. external_source ile birlikte tekildir.';

-- Idempotency anahtarı. Kısmi indeks: kendi lead''lerimizde iki alan da null
-- ve onların tekil olması gerekmiyor.
create unique index if not exists leads_external_ref_idx
  on public.leads (external_source, external_id)
  where external_source is not null;

-- İkisi birlikte dolu ya da birlikte boş olmalı; yarım referans idempotency''yi
-- sessizce devre dışı bırakır.
alter table public.leads
  drop constraint if exists leads_external_ref_complete;
alter table public.leads
  add constraint leads_external_ref_complete check (
    (external_source is null and external_id is null)
    or (external_source is not null and external_id is not null)
  );

-- --- Dış lead ekleme --------------------------------------------------------
-- Entegrasyon uç noktası service_role ile çağırıyor; RLS atlanıyor ama
-- business_id her zaman ARGÜMANDAN geliyor ve tüm yazmalar onunla
-- kapsanıyor. Fonksiyon başka bir işletmenin verisine yazamaz.

create or replace function public.upsert_external_lead(
  p_business_id       uuid,
  p_external_source   text,
  p_external_id       text,
  p_full_name         text,
  p_phone             text,
  p_email             text default null,
  p_venue_id          uuid default null,
  p_organization_type public.organization_type default 'dugun',
  p_event_date        date default null,
  p_guest_count       integer default null,
  p_notes             text default null,
  p_created_at        timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_lead_id     uuid;
  v_phone       text := btrim(p_phone);
begin
  if p_business_id is null then
    raise exception 'business_id zorunlu.' using errcode = 'null_value_not_allowed';
  end if;
  if coalesce(p_external_source, '') = '' or coalesce(p_external_id, '') = '' then
    raise exception 'external_source ve external_id zorunlu.'
      using errcode = 'null_value_not_allowed';
  end if;

  -- Zaten aktarılmışsa dokunma. Aktarım sonrası DavetPro tarafında yapılan
  -- düzenlemeleri (durum, atama, not) EZMİYORUZ — tek yön kuralı.
  select id into v_lead_id
    from public.leads
   where external_source = p_external_source
     and external_id = p_external_id;

  if v_lead_id is not null then
    return jsonb_build_object('lead_id', v_lead_id, 'created', false);
  end if;

  -- Müşteriyi telefona göre bul; yoksa oluştur. Aynı kişi için ikinci bir
  -- müşteri kaydı üremesin.
  select id into v_customer_id
    from public.customers
   where business_id = p_business_id and btrim(phone) = v_phone
   order by created_at
   limit 1;

  if v_customer_id is null then
    insert into public.customers (business_id, full_name, phone, email, notes)
    values (p_business_id, btrim(p_full_name), v_phone, nullif(btrim(coalesce(p_email, '')), ''),
            'DavetMekanı üzerinden geldi.')
    returning id into v_customer_id;
  elsif p_email is not null then
    -- Elimizde e-posta varsa ve kayıtta yoksa tamamla; varsa dokunma.
    update public.customers
       set email = nullif(btrim(p_email), '')
     where id = v_customer_id and coalesce(btrim(email), '') = '';
  end if;

  insert into public.leads (
    business_id, customer_id, venue_id, organization_type,
    status, source, event_date, guest_count, notes,
    external_source, external_id, created_at, last_contact_at
  ) values (
    p_business_id, v_customer_id, p_venue_id, coalesce(p_organization_type, 'dugun'),
    -- Aktarılan her talep 'yeni' başlar; durum yönetimi DavetPro'nun işi.
    'yeni', 'web', p_event_date, p_guest_count, p_notes,
    p_external_source, p_external_id, coalesce(p_created_at, now()),
    coalesce(p_created_at, now())
  )
  returning id into v_lead_id;

  return jsonb_build_object('lead_id', v_lead_id, 'created', true);
end;
$$;

revoke all on function public.upsert_external_lead(
  uuid, text, text, text, text, text, uuid, public.organization_type,
  date, integer, text, timestamptz
) from public, anon, authenticated;
