import type { Metadata } from "next";
import { canSeeFinance, isAdmin, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ContractTemplate,
  ExpenseCategory,
  Profile,
} from "@/lib/database.types";
import { BusinessForm } from "./business-form";
import { ContractTemplateForm } from "./contract-template-form";
import { CategoryManager } from "./category-manager";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const { user, profile, business } = await requireSession();
  const admin = isAdmin(profile);
  const showFinance = canSeeFinance(profile);

  const supabase = await createClient();
  const [categoriesResult, membersResult, templateResult] = await Promise.all([
    showFinance
      ? supabase
          .from("expense_categories")
          .select("*")
          .order("is_active", { ascending: false })
          .order("name")
          .returns<ExpenseCategory[]>()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("*")
      .order("role")
      .order("full_name")
      .returns<Profile[]>(),
    supabase
      .from("contract_templates")
      .select("*")
      .eq("is_default", true)
      .maybeSingle<ContractTemplate>(),
  ]);

  // Daveti kabul etmemiş hesaplar: auth tarafında last_sign_in_at boş olanlar.
  // Ekip küçük olduğu için kişi başına tek sorgu yeterli; listUsers tüm
  // işletmelerin kullanıcılarını tarardı.
  const members = membersResult.data ?? [];
  const pendingIds = admin ? await bekleyenDavetler(members) : new Set<string>();

  return (
    <>
      <PageHeader title="Ayarlar" description={business.name} />
      <PageBody>
        {/* forceMount: sekme değiştirince paneller unmount olmasın. Aksi halde
              yarım bırakılan form (işletme bilgisi, kategori adı, davet formu)
              geri dönüldüğünde sıfırlanıyordu. Pasif panel CSS ile gizlenir. */}
        <Tabs defaultValue="isletme">
          <TabsList>
            <TabsTrigger value="isletme">İşletme</TabsTrigger>
            {showFinance && (
              <TabsTrigger value="kategoriler">Gider kategorileri</TabsTrigger>
            )}
            {showFinance && (
              <TabsTrigger value="sozlesme">Sözleşme</TabsTrigger>
            )}
            <TabsTrigger value="kullanicilar">Kullanıcılar</TabsTrigger>
          </TabsList>

          <TabsContent value="isletme" forceMount className="pt-6">
            <SectionTitle
              title="İşletme bilgileri"
              description={
                admin
                  ? "Bu bilgiler panelde ve raporlarda görünür."
                  : "Bu bilgileri yalnızca yöneticiler değiştirebilir."
              }
            />
            <BusinessForm business={business} disabled={!admin} />
          </TabsContent>

          {showFinance && (
            <TabsContent value="kategoriler" forceMount className="pt-6">
              <SectionTitle
                title="Gider kategorileri"
                description="Kendi kategorilerinizi ekleyebilir, kullanmadıklarınızı pasife alabilirsiniz."
              />
              <CategoryManager categories={categoriesResult.data ?? []} />
            </TabsContent>
          )}

          {showFinance && (
            <TabsContent value="sozlesme" forceMount className="pt-6">
              <SectionTitle
                title="Sözleşme ayarları"
                description="Rezervasyon sözleşmelerinde kullanılan metni buradan düzenleyebilirsiniz."
              />
              {templateResult.data ? (
                <ContractTemplateForm
                  body={templateResult.data.body}
                  disabled={!admin}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sözleşme şablonu bulunamadı. Veritabanı güncellemelerinin
                  uygulandığından emin olun.
                </p>
              )}
            </TabsContent>
          )}

          <TabsContent value="kullanicilar" forceMount className="pt-6">
            <SectionTitle
              title="Kullanıcılar ve yetkiler"
              description={
                admin
                  ? "Personelinizi davet edin ve hangi verilere erişebileceklerini belirleyin."
                  : "İşletmenizdeki kullanıcılar."
              }
            />
            <TeamManager
              members={members}
              pendingIds={pendingIds}
              currentUserId={user.id}
              canManage={admin}
            />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5">
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

/**
 * Hiç giriş yapmamış (daveti bekleyen) kullanıcıların kimlikleri.
 *
 * Servis rolü gerektiriyor; anahtar tanımsızsa liste boş dönüyor ve arayüz
 * yalnızca davet durumunu göstermiyor — sayfa çalışmaya devam ediyor.
 */
async function bekleyenDavetler(members: Profile[]): Promise<Set<string>> {
  try {
    const admin = createAdminClient();
    const sonuclar = await Promise.all(
      members.map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.id);
        return data?.user && !data.user.last_sign_in_at ? m.id : null;
      }),
    );
    return new Set(sonuclar.filter((id): id is string => id !== null));
  } catch {
    return new Set();
  }
}
