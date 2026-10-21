/**
 * Alt çubuğun etkin sekmesi için dolu simgeler.
 *
 * lucide yalnızca çizgi simge veriyor; içi doldurulunca iç detaylar (takvim
 * günleri, kapı) aynı renge boyanıp kayboluyordu. Bunlar lucide'in
 * karşılıklarıyla aynı yerleşimde elle çizildi: gövde degradeyle dolu, iç
 * detaylar zemin renginde (var(--card)) — koyu temada da boşluk gibi durur.
 *
 * `fill` olarak verilen degrade bottom-nav'da bir kez tanımlanıyor.
 */
type Props = { fill: string; className?: string };

const CUT = "var(--card)";

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      {children}
    </svg>
  );
}

export function PanelFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7.5" height="9.5" rx="1.75" fill={fill} />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.75" fill={fill} />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.75" fill={fill} />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.75" fill={fill} />
    </Svg>
  );
}

export function CalendarFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="18" rx="3" fill={fill} />
      <rect x="7" y="1.75" width="2" height="5" rx="1" fill={fill} />
      <rect x="15" y="1.75" width="2" height="5" rx="1" fill={fill} />
      <rect x="3" y="9" width="18" height="1.5" fill={CUT} />
      {[8, 12, 16].map((cx) =>
        [14, 18].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.15" fill={CUT} />),
      )}
    </Svg>
  );
}

export function StoreFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      {/* Tente: üstü düz, altı üç dilim. */}
      <path
        d="M4.2 2.5h15.6c.45 0 .85.3.97.73L22 7.6v.9a3.3 3.3 0 0 1-5.5 2.46A3.3 3.3 0 0 1 12 11.4a3.3 3.3 0 0 1-4.5-.44A3.3 3.3 0 0 1 2 8.5v-.9l1.23-4.37c.12-.43.52-.73.97-.73Z"
        fill={fill}
      />
      <path d="M4 13.2V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.8a5 5 0 0 1-3.5-.4 5 5 0 0 1-4.5.6 5 5 0 0 1-4.5-.6 5 5 0 0 1-3.5.4Z" fill={fill} />
      <rect x="9.5" y="15.5" width="5" height="6.5" rx="1" fill={CUT} />
    </Svg>
  );
}

export function UsersFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      {/* Arkadaki kişi açık: iki baş üst üste karışmasın. */}
      <g opacity="0.55">
        <circle cx="17" cy="7.5" r="3.25" fill={fill} />
        <path d="M17.6 13.8A4.6 4.6 0 0 1 22 18.4V21h-4.5v-1.3a6.6 6.6 0 0 0-2.3-5 4.6 4.6 0 0 1 2.4-.9Z" fill={fill} />
      </g>
      <circle cx="9" cy="7" r="4" fill={fill} />
      <path d="M2 21v-1.2A5.3 5.3 0 0 1 7.3 14.5h3.4a5.3 5.3 0 0 1 5.3 5.3V21Z" fill={fill} />
    </Svg>
  );
}

export function MenuFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3" y="4.75" width="18" height="2.5" rx="1.25" fill={fill} />
      <rect x="3" y="10.75" width="18" height="2.5" rx="1.25" fill={fill} />
      <rect x="3" y="16.75" width="18" height="2.5" rx="1.25" fill={fill} />
    </Svg>
  );
}

export function CloseFilled({ fill, className }: Props) {
  return (
    <Svg className={className}>
      <rect x="10.75" y="2.5" width="2.5" height="19" rx="1.25" fill={fill} transform="rotate(45 12 12)" />
      <rect x="10.75" y="2.5" width="2.5" height="19" rx="1.25" fill={fill} transform="rotate(-45 12 12)" />
    </Svg>
  );
}
