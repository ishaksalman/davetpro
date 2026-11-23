import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { todayISO } from "@/lib/time";
import { useSessionContext } from "~/lib/auth/session";
import { useCalendarRange } from "~/lib/data/calendar";
import { useLookups } from "~/lib/data/lookups";
import { buildAgenda, dayDots, dayHeading, type AgendaItem } from "~/lib/domain/agenda";
import { monthGrid, shiftMonth } from "~/lib/domain/calendar";
import { useRefetchOnFocus } from "~/lib/hooks";
import { CardSkeleton, EmptyState, ErrorState } from "~/ui/Feedback";
import { IconButton } from "~/ui/Button";
import { FilterChip, SegmentedControl } from "~/ui/Inputs";
import { SectionHeader } from "~/ui/List";
import { MonthCalendar } from "~/ui/MonthCalendar";
import { LargeHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { AgendaEvent } from "~/features/agenda";
import { AvailabilitySheet } from "~/features/availability-sheet";

type View3 = "ay" | "hafta" | "liste";

export default function CalendarScreen() {
  const { vertical: v } = useSessionContext();
  const lookups = useLookups();
  const today = todayISO();
  const [view, setView] = useState<View3>("ay");
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [availOpen, setAvailOpen] = useState(false);

  // Görünen ayın hafta sınırlarıyla genişletilmiş aralığı (dış günlerin noktaları için).
  const weeks = useMemo(() => monthGrid(month), [month]);
  const weekStart = format(startOfWeek(parseISO(selected), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(parseISO(selected), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const from = view === "hafta" ? weekStart : weeks[0][0];
  const to = view === "hafta" ? weekEnd : weeks[weeks.length - 1][6];
  const q = useCalendarRange(from, to);
  useRefetchOnFocus(q.refetch);

  const agenda = useMemo(() => buildAgenda(q.data?.rows ?? [], q.data?.holds ?? [], venueId), [q.data, venueId]);
  const dots = useMemo(() => dayDots(agenda), [agenda]);
  const venues = (lookups.data?.venues ?? []).filter((x) => x.is_active && !x.allows_overlap);

  const open = (it: AgendaItem) => {
    if (it.kind === "reservation") router.push({ pathname: "/rezervasyon/[id]", params: { id: it.row.id } });
  };
  const add = (date: string) => router.push({ pathname: "/rezervasyon/form", params: { tarih: date, ...(venueId ? { salon: venueId } : {}) } });

  const dayList = (date: string) => {
    const items = agenda.get(date) ?? [];
    return items.length === 0 ? (
      <Text variant="subhead" color="textSecondary" style={{ paddingVertical: 8 }}>Bu gün için kayıt yok.</Text>
    ) : (
      items.map((it) => <AgendaEvent key={it.key} item={it} onPress={it.kind === "reservation" ? () => open(it) : undefined} />)
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"));
  const listDates = [...agenda.keys()].filter((d) => d.slice(0, 7) === month.slice(0, 7)).sort();

  return (
    <Screen>
      <LargeHeader
        title="Takvim"
        actions={[
          ...(v.usesResource ? [{ icon: "calendar-clock" as const, label: "Müsaitlik kontrolü", onPress: () => setAvailOpen(true) }] : []),
          { icon: "plus", label: "Yeni rezervasyon", onPress: () => add(selected) },
        ]}
      />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching && !q.isLoading} bottomPad={32}>
        <SegmentedControl
          options={[{ value: "ay", label: "Ay" }, { value: "hafta", label: "Hafta" }, { value: "liste", label: "Liste" }]}
          value={view}
          onChange={setView}
        />

        {v.usesResource && venues.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
            <FilterChip label={`Tüm ${v.resource.plural.toLocaleLowerCase("tr-TR")}`} selected={venueId === null} onPress={() => setVenueId(null)} />
            {venues.map((x) => <FilterChip key={x.id} label={x.name} selected={venueId === x.id} onPress={() => setVenueId(x.id)} />)}
          </ScrollView>
        ) : null}

        {q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <View style={{ gap: 10 }}><CardSkeleton /><CardSkeleton /></View>
        ) : view === "ay" ? (
          <>
            <MonthCalendar
              month={month}
              onMonthChange={(m) => { setMonth(m); }}
              selected={selected}
              onSelect={(iso) => { setSelected(iso); if (iso.slice(0, 7) !== month.slice(0, 7)) setMonth(`${iso.slice(0, 7)}-01`); }}
              dots={dots}
            />
            <View style={{ gap: 12 }}>
              <SectionHeader title={dayHeading(selected)} action="Ekle" onAction={() => add(selected)} />
              {dayList(selected)}
            </View>
          </>
        ) : view === "hafta" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <IconButton icon="chevron-left" label="Önceki hafta" onPress={() => setSelected(format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd"))} />
              <Text variant="headline">{format(parseISO(weekStart), "d MMM", { locale: tr })} – {format(parseISO(weekEnd), "d MMM yyyy", { locale: tr })}</Text>
              <IconButton icon="chevron-right" label="Sonraki hafta" onPress={() => setSelected(format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd"))} />
            </View>
            {weekDays.map((d) => (
              <View key={d} style={{ gap: 10 }}>
                <SectionHeader title={dayHeading(d)} action="Ekle" onAction={() => add(d)} />
                {dayList(d)}
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <IconButton icon="chevron-left" label="Önceki ay" onPress={() => setMonth(shiftMonth(month, -1))} />
              <Text variant="headline">{format(parseISO(month), "MMMM yyyy", { locale: tr })}</Text>
              <IconButton icon="chevron-right" label="Sonraki ay" onPress={() => setMonth(shiftMonth(month, 1))} />
            </View>
            {listDates.length === 0 ? (
              <EmptyState title={`Bu ay ${v.event.singular} yok`} description="Başka bir ay seçin ya da yeni kayıt oluşturun." action={{ label: "Yeni rezervasyon", icon: "plus", onPress: () => add(selected) }} />
            ) : (
              listDates.map((d) => (
                <View key={d} style={{ gap: 10 }}>
                  <SectionHeader title={dayHeading(d)} />
                  {dayList(d)}
                </View>
              ))
            )}
          </>
        )}
      </ScrollScreen>
      <AvailabilitySheet visible={availOpen} onClose={() => setAvailOpen(false)} initialDate={selected} />
    </Screen>
  );
}
