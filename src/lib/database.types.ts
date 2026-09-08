// Supabase şemasının el ile tutulan tip karşılığı.
// Şema değişirse: supabase/migrations ile birlikte burayı da güncelle.

export type UserRole = "owner" | "manager" | "staff";

export type ReservationStatus =
  | "kesinlesti"
  | "tamamlandi"
  | "iptal_edildi";

export type OrganizationType =
  | "dugun"
  | "nisan"
  | "kina"
  | "soz"
  | "sunnet"
  | "davet"
  | "kurumsal"
  | "diger";

export type PricingType = "sabit" | "kisi_basi";

export type PaymentMethod = "nakit" | "kredi_karti" | "havale_eft" | "diger";

export type IncomeCategory =
  | "kapora"
  | "ara_odeme"
  | "son_odeme"
  | "ek_hizmet"
  | "diger";

type Timestamps = { created_at: string; updated_at: string };

export type Business = Timestamps & {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  /** Sözleşme başlığı ve taraflar bölümü için. */
  authorized_person: string | null;
  email: string | null;
  address: string | null;
  tax_office: string | null;
  tax_number: string | null;
  logo_url: string | null;
};

export type Profile = Timestamps & {
  /** Ticari ileti için açık rızanın alındığı an; yoksa izin verilmemiş. */
  marketing_consent_at: string | null;
  id: string;
  business_id: string;
  full_name: string;
  role: UserRole;
  can_view_finance: boolean;
  is_active: boolean;
};

export type Venue = Timestamps & {
  id: string;
  business_id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  color: string;
  is_active: boolean;
};

export type Package = Timestamps & {
  id: string;
  business_id: string;
  /** Boşsa tüm salonlarda geçerli; doluysa yalnızca o salonda. */
  venue_id: string | null;
  name: string;
  description: string | null;
  /** pricing_type = "sabit" ise toplam, "kisi_basi" ise kişi başı fiyat. */
  base_price: number;
  pricing_type: PricingType;
  included_services: string[];
  is_active: boolean;
};

export type Customer = Timestamps & {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  address: string | null;
  /** T.C. Kimlik No — opsiyonel, KVKK gereği yalnızca gerekliyse doldurulur. */
  national_id: string | null;
  notes: string | null;
};

export type Reservation = Timestamps & {
  id: string;
  business_id: string;
  venue_id: string;
  customer_id: string;
  package_id: string | null;
  organization_type: OrganizationType;
  status: ReservationStatus;
  event_date: string;
  start_time: string;
  end_time: string;
  guest_count: number | null;
  notes: string | null;
  created_by: string | null;
  starts_at: string;
  ends_at: string;
};

export type ReservationPricing = Timestamps & {
  reservation_id: string;
  business_id: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  due_date: string | null;
  /** Kişi başı anlaşıldıysa birim fiyat; toplam yine net_amount'tadır. */
  unit_price: number | null;
};

export type Payment = Timestamps & {
  id: string;
  business_id: string;
  reservation_id: string | null;
  customer_id: string | null;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  category: IncomeCategory;
  description: string | null;
  voided_at: string | null;
  void_reason: string | null;
  voided_by: string | null;
  created_by: string | null;
};

export type ExpenseCategory = Timestamps & {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
};

export type Expense = Timestamps & {
  id: string;
  business_id: string;
  category_id: string;
  reservation_id: string | null;
  amount: number;
  expense_date: string;
  method: PaymentMethod;
  description: string | null;
  vendor: string | null;
  voided_at: string | null;
  void_reason: string | null;
  voided_by: string | null;
  created_by: string | null;
};

/** reservation_financials view — kârlılık ve nakit akışı ayrı kolonlarda. */
export type ReservationFinancials = {
  reservation_id: string;
  business_id: string;
  venue_id: string;
  customer_id: string;
  package_id: string | null;
  event_date: string;
  status: ReservationStatus;
  organization_type: OrganizationType;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  due_date: string | null;
  collected_amount: number;
  balance_amount: number;
  expense_amount: number;
  profit_amount: number;
  profit_margin: number | null;
  unit_price: number | null;
};

export type CustomerBalance = {
  customer_id: string;
  business_id: string;
  reservation_count: number;
  total_sales: number;
  total_paid: number;
  total_balance: number;
  last_event_date: string | null;
};

export type FinanceSummary = {
  total_sales: number;
  collected_in_range: number;
  outstanding: number;
  total_expenses: number;
  net_cash: number;
  profit: number;
  profit_margin: number | null;
  reservation_count: number;
  avg_sale: number | null;
};

export type MonthlySeriesRow = {
  month: string;
  sales: number;
  collected: number;
  expenses: number;
};

export type VenuePerformanceRow = {
  venue_id: string;
  venue_name: string;
  reservation_count: number;
  sales: number;
  expenses: number;
  profit: number;
};

export type TypeBreakdownRow = {
  organization_type: OrganizationType;
  reservation_count: number;
  sales: number;
};

export type PackageBreakdownRow = {
  package_id: string;
  package_name: string;
  reservation_count: number;
  sales: number;
};

export type WeekdayBreakdownRow = {
  weekday: number;
  reservation_count: number;
};

export type ContractStatus = "taslak" | "olusturuldu" | "imzalandi" | "iptal";

export type ContractTemplate = Timestamps & {
  id: string;
  business_id: string;
  name: string;
  body: string;
  is_default: boolean;
};

export type Contract = Timestamps & {
  id: string;
  business_id: string;
  reservation_id: string;
  contract_number: string;
  version: number;
  status: ContractStatus;
  /** Oluşturulduğu andaki dondurulmuş veriler. */
  snapshot: ContractSnapshot;
  /** Değişkenleri yerine konmuş, dondurulmuş sözleşme metni. */
  content: string;
  created_by: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
};

export type ContractSnapshot = {
  business: {
    name: string;
    authorized_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    tax_office: string | null;
    tax_number: string | null;
    logo_url: string | null;
  };
  customer: {
    full_name: string;
    phone: string;
    email: string | null;
    address: string | null;
    national_id: string | null;
  };
  organization: {
    type: OrganizationType;
    venue_name: string;
    event_date: string;
    start_time: string;
    end_time: string;
    guest_count: number | null;
    package_name: string | null;
    /** Paketin kapsadığı hizmetler; sözleşmede madde madde yazılır. */
    included_services: string[];
    notes: string | null;
  };
  finance: {
    gross_amount: number;
    discount_amount: number;
    net_amount: number;
    collected_amount: number;
    balance_amount: number;
    unit_price: number | null;
    due_date: string | null;
  };
  meta: {
    contract_date: string;
    created_by_name: string | null;
  };
};

// --- Talepler, teklifler ve opsiyonlar (satış hattı) -------------------------

export type LeadStatus =
  | "yeni"
  | "teklif_verildi"
  | "opsiyonlu"
  | "kazanildi"
  | "kaybedildi";

export type LeadSource =
  | "whatsapp"
  | "instagram"
  | "telefon"
  | "yuz_yuze"
  | "web"
  | "referans"
  | "google"
  | "diger";

export type LeadLostReason =
  | "fiyat"
  | "tarih"
  | "baska_salon"
  | "vazgecti"
  | "ulasilamadi"
  | "diger";

export type LeadActivityType =
  | "telefon"
  | "whatsapp"
  | "instagram"
  | "yuz_yuze"
  | "eposta"
  | "not"
  | "sistem";

export type QuoteStatus =
  | "taslak"
  | "gonderildi"
  | "kabul"
  | "reddedildi"
  | "suresi_doldu";

export type HoldStatus = "aktif" | "suresi_doldu" | "donusturuldu" | "iptal";

export type Lead = Timestamps & {
  id: string;
  business_id: string;
  customer_id: string;
  venue_id: string | null;
  package_id: string | null;
  organization_type: OrganizationType;
  status: LeadStatus;
  source: LeadSource;
  event_date: string | null;
  alt_event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  assigned_to: string | null;
  next_follow_up_at: string | null;
  last_contact_at: string;
  lost_reason: LeadLostReason | null;
  lost_note: string | null;
  reservation_id: string | null;
  converted_at: string | null;
  notes: string | null;
  created_by: string | null;
  /**
   * Dış kaynak referansı (DavetMekanı entegrasyonu, 0024).
   * Kendi formumuzdan gelen talepler için ikisi de null. Birlikte tekildirler
   * ve aktarımın idempotency anahtarıdır.
   */
  external_source: string | null;
  external_id: string | null;
};

export type LeadActivity = {
  id: string;
  business_id: string;
  lead_id: string;
  type: LeadActivityType;
  note: string | null;
  is_system: boolean;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
};

export type Quote = Timestamps & {
  id: string;
  business_id: string;
  lead_id: string;
  quote_number: string;
  version: number;
  status: QuoteStatus;
  venue_id: string | null;
  package_id: string | null;
  guest_count: number | null;
  package_amount: number;
  extras_amount: number;
  discount_amount: number;
  total_amount: number;
  valid_until: string | null;
  notes: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_by: string | null;
};

export type QuoteItem = {
  id: string;
  business_id: string;
  quote_id: string;
  name: string;
  amount: number;
  sort_order: number;
  created_at: string;
};

export type VenueHold = Timestamps & {
  id: string;
  business_id: string;
  lead_id: string;
  venue_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  expires_at: string;
  status: HoldStatus;
  reservation_id: string | null;
  note: string | null;
  created_by: string | null;
};

/** venue_availability() RPC'sinin bir satırı. */
export type VenueAvailability = {
  venue_id: string;
  venue_name: string;
  is_available: boolean;
  conflict_kind: "rezervasyon" | "opsiyon" | null;
  conflict_label: string | null;
  conflict_start: string | null;
  conflict_end: string | null;
  hold_expires_at: string | null;
  /** 'engel' kaydı durdurur, 'uyari' yalnızca bilgilendirir. */
  severity: "engel" | "uyari" | null;
  /** Komşu organizasyonla arada kalan dakika; gerçek çakışmada null. */
  gap_minutes: number | null;
};
