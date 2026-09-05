-- =============================================================================
-- DavetPro · 0007 · Rezervasyon sözleşmeleri
--
-- Tasarım notları:
--  • Sözleşme oluşturulduğu andaki tüm veriler snapshot olarak donuyor.
--    Rezervasyon/müşteri/fiyat sonradan değişse bile geçmiş sözleşme aynen
--    kalıyor; güncellemek için açıkça yeni sürüm oluşturuluyor.
--  • Sözleşme numarası işletme + yıl bazında ayrı bir sayaç tablosundan
--    atomik olarak alınıyor (eşzamanlı iki istek aynı numarayı alamaz).
--  • Numara rezervasyon başına bir kez veriliyor; yeni sürümler aynı numarayı
--    taşıyıp version alanını artırıyor — gerçek hayattaki sözleşme mantığı bu.
--  • Finansal veri YENİDEN HESAPLANMIYOR; reservation_financials view'ından
--    okunup snapshot'a yazılıyor. Tahsilat kaydı oluşturulmuyor.
-- =============================================================================

-- --- İşletme ve müşteri: sözleşmede gereken alanlar -------------------------

alter table public.businesses
  add column authorized_person text,
  add column email             text,
  add column address           text,
  add column tax_office        text,
  add column tax_number        text,
  add column logo_url          text;

comment on column public.businesses.logo_url is
  'Sözleşme başlığında kullanılacak logo adresi. Yükleme arayüzü yok; boşsa işletme adı yazıyla gösterilir.';

alter table public.customers
  add column address text,
  -- KVKK: zorunlu değil. Yalnızca işletme sözleşmesinde talep ediyorsa girilir.
  add column national_id text
    check (national_id is null or national_id ~ '^[0-9]{11}$');

comment on column public.customers.national_id is
  'T.C. Kimlik No — opsiyonel. Hassas kişisel veri; yalnızca gerekliyse doldurulmalı.';

-- --- Sözleşme şablonu -------------------------------------------------------

create table public.contract_templates (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null default 'Varsayılan şablon'
                 check (length(btrim(name)) between 1 and 120),
  body         text not null,
  is_default   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, name)
);

create index contract_templates_business_idx on public.contract_templates (business_id);

-- --- Sözleşme numarası sayacı ----------------------------------------------

create table public.contract_counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  year        integer not null,
  last_no     integer not null default 0,
  primary key (business_id, year)
);

-- --- Sözleşmeler ------------------------------------------------------------

create type public.contract_status as enum (
  'taslak', 'olusturuldu', 'imzalandi', 'iptal'
);

create table public.contracts (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  reservation_id  uuid not null,
  contract_number text not null,
  version         integer not null default 1 check (version > 0),
  status          public.contract_status not null default 'olusturuldu',

  -- Oluşturulduğu andaki işletme/müşteri/organizasyon/finans bilgileri.
  snapshot        jsonb not null,
  -- Değişkenleri yerine konmuş, dondurulmuş sözleşme metni.
  content         text not null check (length(btrim(content)) > 0),

  created_by      uuid references public.profiles (id) on delete set null,
  signed_at       timestamptz,
  cancelled_at    timestamptz,
  cancelled_by    uuid references public.profiles (id) on delete set null,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (business_id, contract_number, version),
  unique (reservation_id, version),
  foreign key (reservation_id, business_id)
    references public.reservations (id, business_id) on delete restrict,
  constraint contracts_cancel_reason_required
    check (cancelled_at is null or length(btrim(coalesce(cancel_reason, ''))) > 0)
);

create index contracts_business_idx on public.contracts (business_id, created_at desc);
create index contracts_reservation_idx on public.contracts (reservation_id, version desc);

-- --- Varsayılan alanlar ve updated_at --------------------------------------

alter table public.contract_templates alter column business_id set default public.current_business_id();
alter table public.contracts          alter column business_id set default public.current_business_id();

create trigger contract_templates_set_updated_at before update on public.contract_templates
  for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger contracts_set_created_by before insert on public.contracts
  for each row execute function public.set_created_by();

-- --- RLS --------------------------------------------------------------------
-- Sözleşme finansal tutar içerdiği için finans yetkisi kapısının arkasında.

alter table public.contract_templates enable row level security;
alter table public.contract_counters  enable row level security;
alter table public.contracts          enable row level security;
alter table public.contract_templates force row level security;
alter table public.contract_counters  force row level security;
alter table public.contracts          force row level security;

create policy contract_templates_select on public.contract_templates
  for select to authenticated
  using (business_id = public.current_business_id());
create policy contract_templates_insert on public.contract_templates
  for insert to authenticated
  with check (business_id = public.current_business_id() and public.is_business_admin());
create policy contract_templates_update on public.contract_templates
  for update to authenticated
  using (business_id = public.current_business_id() and public.is_business_admin())
  with check (business_id = public.current_business_id() and public.is_business_admin());

create policy contracts_select on public.contracts
  for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());
create policy contracts_update on public.contracts
  for update to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

-- INSERT policy'si yok: sözleşme yalnızca create_contract() ile oluşturulur
-- (numara tahsisi ve snapshot orada yapılıyor). DELETE de yok — iptal edilir.
revoke insert, delete on public.contracts from authenticated;
revoke delete on public.contract_templates from authenticated;
-- Sayaç tablosuna doğrudan erişim yok; yalnızca fonksiyon üzerinden.
revoke all on public.contract_counters from authenticated;

-- --- Varsayılan şablon metni ------------------------------------------------

create or replace function public.default_contract_body()
returns text
language sql
immutable
as $fn$
select $tpl$# ORGANİZASYON HİZMET SÖZLEŞMESİ

## 1. TARAFLAR
İşbu sözleşme, bir tarafta {{business_name}} ("İŞLETME") ile diğer tarafta
{{customer_name}} ("MÜŞTERİ") arasında aşağıdaki şartlarda düzenlenmiştir.

## 2. SÖZLEŞMENİN KONUSU
Sözleşmenin konusu, MÜŞTERİ'nin {{event_date}} tarihinde {{venue_name}} adlı
mekânda düzenleyeceği {{event_type}} organizasyonu için İŞLETME tarafından
sunulacak hizmetlerin kapsamı ile tarafların hak ve yükümlülükleridir.

## 3. ORGANİZASYON TARİHİ VE KULLANIM SÜRESİ
Organizasyon {{event_date}} tarihinde {{start_time}} - {{end_time}} saatleri
arasında gerçekleştirilecektir. Mekân, belirtilen saat aralığı için tahsis
edilmiştir. Sürenin aşılması hâlinde ek ücret talep edilebilir.

## 4. HİZMET KAPSAMI
Tahmini davetli sayısı {{guest_count}} kişidir. Seçilen paket: {{package_name}}.
Pakete dahil hizmetler ve varsa özel talepler aşağıdaki notlarda belirtilmiştir:
{{notes}}

## 5. TOPLAM HİZMET BEDELİ
Anlaşılan toplam bedel {{total_price}} olup, uygulanan indirim {{discount_amount}},
net sözleşme bedeli {{net_price}} tutarındadır.

## 6. KAPORA VE ÖDEME KOŞULLARI
İşbu sözleşmenin imzalandığı tarih itibarıyla tahsil edilen tutar
{{paid_amount}}'dir. Kapora, rezervasyonun kesinleşmesi amacıyla alınmıştır.

## 7. KALAN ÖDEME
Kalan bakiye {{remaining_amount}} tutarındadır ve {{due_date}} tarihine kadar
ödenecektir. Ödeme yapılmaması hâlinde İŞLETME rezervasyonu iptal etme hakkını
saklı tutar.

## 8. REZERVASYON İPTALİ
MÜŞTERİ'nin organizasyonu iptal etmesi hâlinde uygulanacak iptal koşulları
taraflarca ayrıca kararlaştırılır. İptal hâlinde kapora iadesine ilişkin
şartlar bu maddede açıkça belirtilmelidir.

## 9. TARİH DEĞİŞİKLİĞİ
Tarih değişikliği talepleri, İŞLETME'nin takvim uygunluğuna bağlıdır ve
yazılı olarak bildirilmelidir.

## 10. İŞLETMENİN YÜKÜMLÜLÜKLERİ
İŞLETME, sözleşmede belirtilen mekânı ve hizmetleri kararlaştırılan tarih ve
saatte, hizmet standartlarına uygun şekilde sunmakla yükümlüdür.

## 11. MÜŞTERİNİN YÜKÜMLÜLÜKLERİ
MÜŞTERİ, ödeme planına uymak, davetlilerinin mekân kurallarına uymasını
sağlamak ve organizasyona ilişkin bilgileri zamanında bildirmekle yükümlüdür.

## 12. MÜCBİR SEBEPLER
Tarafların kontrolü dışında gelişen ve ifayı imkânsız kılan durumlarda
(doğal afet, salgın, resmî yasaklama vb.) taraflar sorumlu tutulamaz.

## 13. ORGANİZASYON SIRASINDA OLUŞABİLECEK ZARARLAR
Organizasyon süresince MÜŞTERİ veya davetlileri tarafından mekâna verilecek
zararlardan MÜŞTERİ sorumludur.

## 14. EK HİZMETLER
Sözleşme kapsamı dışında talep edilecek ek hizmetler ayrıca ücretlendirilir ve
yazılı olarak mutabık kalınır.

## 15. UYUŞMAZLIK VE YETKİLİ MERCİLER
İşbu sözleşmeden doğabilecek uyuşmazlıklarda yetkili merciler taraflarca
belirlenir.

## 16. YÜRÜRLÜK
İşbu sözleşme {{contract_date}} tarihinde, {{contract_number}} numarası ile
iki nüsha olarak düzenlenmiş ve taraflarca imzalanarak yürürlüğe girmiştir.
$tpl$;
$fn$;

-- Mevcut işletmeler için şablon oluştur
insert into public.contract_templates (business_id, body)
select b.id, public.default_contract_body()
from public.businesses b
left join public.contract_templates t on t.business_id = b.id
where t.id is null;

-- Yeni işletmelerde de otomatik oluşsun
create or replace function public.create_business_with_owner(
  p_business_name text,
  p_full_name     text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid         uuid := auth.uid();
  v_business_id uuid;
  v_category    text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Bu kullanıcı zaten bir işletmeye bağlı.' using errcode = 'unique_violation';
  end if;

  insert into public.businesses (name)
  values (btrim(p_business_name))
  returning id into v_business_id;

  insert into public.profiles (id, business_id, full_name, role, can_view_finance)
  values (v_uid, v_business_id, btrim(p_full_name), 'owner', true);

  foreach v_category in array array[
    'Personel', 'Catering / Yemek', 'İçecek', 'Dekorasyon', 'Müzik / DJ',
    'Fotoğraf / Video', 'Temizlik', 'Elektrik / Doğalgaz', 'Kira',
    'Bakım / Onarım', 'Reklam', 'Vergi', 'Diğer'
  ] loop
    insert into public.expense_categories (business_id, name)
    values (v_business_id, v_category);
  end loop;

  insert into public.contract_templates (business_id, body)
  values (v_business_id, public.default_contract_body());

  return v_business_id;
end;
$fn$;

-- --- Sözleşme oluşturma -----------------------------------------------------

create or replace function public.create_contract(
  p_reservation_id uuid,
  p_content        text,
  p_snapshot       jsonb
)
returns public.contracts
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_business uuid := public.current_business_id();
  v_year     integer := extract(year from now())::integer;
  v_number   text;
  v_version  integer;
  v_seq      integer;
  v_row      public.contracts;
begin
  if v_business is null or not public.can_see_finance() then
    raise exception 'Sözleşme oluşturmak için finansal yetki gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.reservations
    where id = p_reservation_id and business_id = v_business
  ) then
    raise exception 'Rezervasyon bulunamadı.' using errcode = 'no_data_found';
  end if;

  -- Aynı rezervasyonun önceki sürümü varsa numara korunur, sürüm artar.
  select contract_number, max(version) + 1
  into v_number, v_version
  from public.contracts
  where reservation_id = p_reservation_id
  group by contract_number
  order by max(version) desc
  limit 1;

  if v_number is null then
    -- Atomik sıra: eşzamanlı iki istek aynı numarayı alamaz.
    insert into public.contract_counters (business_id, year, last_no)
    values (v_business, v_year, 1)
    on conflict (business_id, year)
      do update set last_no = public.contract_counters.last_no + 1
    returning last_no into v_seq;

    v_number := 'DVP-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');
    v_version := 1;
  end if;

  -- Numara ancak burada belli olduğu için metindeki yer tutucusu şimdi doluyor.
  insert into public.contracts
    (business_id, reservation_id, contract_number, version, snapshot, content, created_by)
  values
    (v_business, p_reservation_id, v_number, v_version, p_snapshot,
     replace(p_content, '{{contract_number}}', v_number), auth.uid())
  returning * into v_row;

  return v_row;
end;
$fn$;

grant execute on function public.create_contract(uuid, text, jsonb) to authenticated;
grant execute on function public.default_contract_body() to authenticated;

grant select, insert, update on public.contract_templates to authenticated;
grant select, update on public.contracts to authenticated;
