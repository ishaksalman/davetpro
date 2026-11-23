import { FinanceView } from "~/features/finance-view";

/** Fotoğrafçıda Finans alt sekmede değil: Daha'dan geri düğmeli ekran olarak açılır (gizli sekme doğrudan açılamaz). */
export default function FinancePushed() {
  return <FinanceView pushed />;
}
