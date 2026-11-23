import { DeliveryList } from "~/features/delivery-list";
import { LargeHeader } from "~/ui/Screen";

/** Fotoğrafçıda alt sekme: Finans'ın yerini alır (Finans, Daha'dan açılır). */
export default function DeliveryTab() {
  return <DeliveryList header={<LargeHeader title="Teslimat" />} />;
}
