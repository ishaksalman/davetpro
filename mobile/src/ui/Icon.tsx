import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  ArrowDownLeft, ArrowUpRight, Ban, Bell, Calendar, CalendarCheck, CalendarClock, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleX, Clock,
  CloudOff, Ellipsis, Eye, EyeOff, FileText, Info, Inbox, LayoutGrid, Lock, Mail, MapPin,
  MessageCircle, Minus, Package, Phone, Plus, RotateCcw, Search, SlidersHorizontal, TrendingDown,
  TrendingUp, TriangleAlert, User, UserRound, Users, Wallet, WifiOff, X, House, Building2,
  Camera, Images, Trash2, Truck, Settings, LogOut, UserPlus, Tag, Receipt, Banknote, ChartColumn, Briefcase,
  type LucideIcon,
} from "lucide-react-native";
import { useTheme } from "~/design/theme";
import type { Colors } from "~/design/tokens";

const ICONS = {
  "arrow-down-left": ArrowDownLeft, "arrow-up-right": ArrowUpRight, ban: Ban, bell: Bell,
  calendar: Calendar, "calendar-check": CalendarCheck, "calendar-clock": CalendarClock,
  "calendar-days": CalendarDays, check: Check, "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft, "chevron-right": ChevronRight, "circle-alert": CircleAlert,
  "circle-check": CircleCheck, "circle-x": CircleX, clock: Clock, "cloud-off": CloudOff,
  ellipsis: Ellipsis, eye: Eye, "eye-off": EyeOff, "file-text": FileText, info: Info, inbox: Inbox,
  "layout-grid": LayoutGrid, lock: Lock, mail: Mail, "map-pin": MapPin,
  "message-circle": MessageCircle, minus: Minus, package: Package, phone: Phone, plus: Plus,
  "rotate-ccw": RotateCcw, search: Search, sliders: SlidersHorizontal,
  "trending-down": TrendingDown, "trending-up": TrendingUp, "triangle-alert": TriangleAlert,
  user: User, "user-round": UserRound, users: Users, wallet: Wallet, "wifi-off": WifiOff, x: X,
  house: House, building: Building2, camera: Camera, images: Images, trash: Trash2, truck: Truck, settings: Settings,
  "log-out": LogOut, "user-plus": UserPlus, tag: Tag, receipt: Receipt, banknote: Banknote,
  chart: ChartColumn, briefcase: Briefcase,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * Dolgulu (etkin sekme) çizimde kullanılacak kapalı siluet. Bazı simgeler açık yollardan oluşur ve düz dolgu
 * gövdeyi tam kaplamaz (cüzdan); onlar için dış hattı izleyen kapalı bir şekil verilir. 24×24 uzayında.
 */
const FILL_SHAPES: Partial<Record<IconName, string>> = {
  wallet: "M5 3h13a1 1 0 0 1 1 1v3h1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
};

export function Icon({
  name,
  size = 20,
  color = "iconPrimary",
  strokeWidth = 2,
  tint,
  fill,
}: {
  name: IconName;
  size?: number;
  color?: keyof Colors;
  strokeWidth?: number;
  /** Tema renginin yerine ham renk (koyu degrade üstü gibi tema dışı zeminler için). */
  tint?: string;
  /** İç dolgu rengi (çizgi rengi `color`/`tint` olarak kalır); yoksa içi boş. */
  fill?: string;
}) {
  const { colors } = useTheme();
  const Cmp = ICONS[name];
  const stroke = tint ?? colors[color];
  if (!fill) return <Cmp size={size} color={stroke} fill="none" strokeWidth={strokeWidth} />;
  // Dolgulu simge iki katman: altta yalnızca dolgu, üstte yalnızca çizgi. Tek katmanda sonra çizilen şekillerin
  // dolgusu önce çizilen iç çizgilerin (takvim ızgarası, onay işareti vb.) üstünü örterdi.
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute" }}>
        {FILL_SHAPES[name] ? (
          <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={FILL_SHAPES[name]} fill={fill} /></Svg>
        ) : (
          <Cmp size={size} color="transparent" fill={fill} strokeWidth={0} />
        )}
      </View>
      <View style={{ position: "absolute" }}><Cmp size={size} color={stroke} fill="none" strokeWidth={strokeWidth} /></View>
    </View>
  );
}
