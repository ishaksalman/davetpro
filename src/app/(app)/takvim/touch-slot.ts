import { addDays, addMinutes, startOfDay, startOfMonth, startOfWeek } from "date-fns";

/**
 * Dokunmatik ekranda kısa dokunuşun hangi güne / saate denk geldiği.
 *
 * NEDEN GEREKLİ: react-big-calendar dokunmada seçimi ancak 250 ms basılı
 * tutunca başlatıyor; kısa dokunuşu iptal ediyor. Eşiği düşürmek de olmuyor —
 * o zaman takvimi parmakla kaydırmak seçim yapar. Bu yüzden kısa dokunuşu
 * takvimin dışında yakalayıp hücreyi konumdan hesaplıyoruz. Kütüphane
 * hücrelere tarih yazmadığı için ızgaradaki sıra ve sütundan gidiliyor.
 *
 * Etkinliğe, "+N daha"ya, gün numarasına ya da başlığa dokunuş null döner:
 * onları kütüphanenin kendisi ele alıyor.
 */
export function slotFromTap({
  target,
  x,
  y,
  view,
  date,
  minHour,
  stepMinutes,
}: {
  target: Element;
  x: number;
  y: number;
  view: "month" | "week" | "day";
  date: Date;
  minHour: number;
  stepMinutes: number;
}): { start: Date; end: Date } | null {
  if (
    target.closest(
      ".rbc-event, .rbc-show-more, .rbc-button-link, .rbc-overlay, .rbc-time-header, .rbc-header",
    )
  ) {
    return null;
  }

  if (view === "month") {
    const row = target.closest(".rbc-month-row");
    const month = row?.closest(".rbc-month-view");
    if (!row || !month) return null;
    const rowIndex = [...month.querySelectorAll(".rbc-month-row")].indexOf(row);
    const cells = [...row.querySelectorAll(".rbc-row-bg > .rbc-day-bg")];
    const col = cells.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return x >= r.left && x < r.right;
    });
    if (rowIndex < 0 || col < 0) return null;
    const first = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const day = addDays(first, rowIndex * 7 + col);
    return { start: day, end: day };
  }

  const column = target.closest(".rbc-day-slot");
  const grid = column?.closest(".rbc-time-content");
  if (!column || !grid) return null;
  const columns = [...grid.querySelectorAll(".rbc-day-slot")];
  const index = columns.indexOf(column);
  const base =
    view === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date);
  const day = addDays(base, view === "week" ? index : 0);

  const r = column.getBoundingClientRect();
  const span = (24 - minHour) * 60;
  const offset = Math.max(0, Math.min(span - stepMinutes, ((y - r.top) / r.height) * span));
  const minutes = minHour * 60 + Math.floor(offset / stepMinutes) * stepMinutes;
  const start = addMinutes(startOfDay(day), minutes);
  return { start, end: addMinutes(start, stepMinutes) };
}
