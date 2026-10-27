import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Def = {
  d?: string[];
  c?: [number, number, number][];
  r?: [number, number, number, number, number][];
};

// Íconos de línea (viewBox 24×24, trazo redondeado) para toda la interfaz.
const ICONS = {
  home: { d: ['M3 11l9-8 9 8', 'M5 10v10h14V10'] },
  list: { d: ['M8 6h13M8 12h13M8 18h13'], c: [[4, 6, 1], [4, 12, 1], [4, 18, 1]] },
  pie: { d: ['M12 3a9 9 0 1 0 9 9h-9z', 'M15 3.5A9 9 0 0 1 20.5 9H15z'] },
  dots: { c: [[5, 12, 1], [12, 12, 1], [19, 12, 1]] },
  back: { d: ['m15 6-6 6 6 6'] },
  chevron: { d: ['m9 6 6 6-6 6'] },
  close: { d: ['M6 6l12 12M18 6 6 18'] },
  plus: { d: ['M12 5v14M5 12h14'] },
  check: { d: ['M5 12.5l4.5 4.5L19 7.5'] },
  menu: { d: ['M4 7h16M4 12h16M4 17h10'] },
  chat: { d: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'] },
  settings: { d: ['M4 7h9M17 7h3M4 17h3M11 17h9'], c: [[15, 7, 2], [9, 17, 2]] },
  bell: { d: ['M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z', 'M10 20a2 2 0 0 0 4 0'] },
  bars: { d: ['M5 20V10M12 20V4M19 20v-7'] },
  target: { c: [[12, 12, 9], [12, 12, 5], [12, 12, 1.2]] },
  wallet: {
    d: ['M3 7a2 2 0 0 1 2-2h13v4', 'M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2'],
    c: [[16.5, 14.5, 1.2]],
  },
  card: { r: [[3, 6, 18, 13, 2.5]], d: ['M3 10.5h18'] },
  trending: { d: ['M3 17l6-6 4 4 7-8', 'M15 7h5v5'] },
  up: { d: ['M7 17 17 7M8 7h9v9'] },
  down: { d: ['M17 7 7 17M16 17H7V8'] },
  send: { d: ['M12 19V5M5 12l7-7 7 7'] },
  cart: { c: [[9, 20, 1.4], [18, 20, 1.4]], d: ['M3 4h2l2.4 11h11l2-8H6.5'] },
  car: { d: ['M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16'], r: [[3, 16, 18, 4, 1]] },
  ticket: { r: [[3, 5, 18, 14, 2]], d: ['M8 5v14M16 5v14M3 10h5M16 10h5M3 14h5M16 14h5'] },
  alert: { d: ['M12 3 2.5 20h19z', 'M12 10v5M12 18h.01'] },
  briefcase: { r: [[3, 7, 18, 13, 2]], d: ['M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'] },
  user: { c: [[12, 8, 4]], d: ['M4 21a8 8 0 0 1 16 0'] },
  users: { c: [[9, 8, 3.5], [17, 9, 2.6]], d: ['M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 14.2A5.2 5.2 0 0 1 21.5 19.5'] },
  calendar: { r: [[3, 5, 18, 16, 2.5]], d: ['M3 10h18M8 3v4M16 3v4'] },
  bank: { d: ['M3 10l9-6 9 6', 'M5 10v8M9.5 10v8M14.5 10v8M19 10v8', 'M3 20h18'] },
  refresh: { d: ['M20 12a8 8 0 0 1-14 5.3L4 15', 'M4 12a8 8 0 0 1 14-5.3L20 9', 'M4 20v-5h5M20 4v5h-5'] },
  book: { d: ['M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z', 'M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z'] },
  bag: { d: ['M5 8h14l-1 12H6z', 'M9 8V6a3 3 0 0 1 6 0v2'] },
  gift: { r: [[3, 9, 18, 5, 1]], d: ['M5 14v7h14v-7M12 9v12', 'M12 9c-2.5 0-4-1-4-2.5S9.5 4 12 9c2.5-5 4-3.5 4-2.5S14.5 9 12 9z'] },
  star: { d: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'] },
  lock: { r: [[5, 11, 14, 10, 2.5]], d: ['M8 11V8a4 4 0 0 1 8 0v3'] },
  shield: { d: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2.2 2.2L15.5 10'] },
  camera: { r: [[3, 7, 18, 13, 2.5]], d: ['M8 7l1.5-3h5L16 7'], c: [[12, 13.5, 3.5]] },
  image: { r: [[3, 4, 18, 16, 2.5]], c: [[9, 10, 1.6]], d: ['M21 16l-5-5-8 8'] },
  mic: { r: [[9, 3, 6, 11, 3]], d: ['M5 11a7 7 0 0 0 14 0M12 18v3'] },
  logout: { d: ['M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4', 'M16 8l4 4-4 4M20 12H9'] },
  info: { c: [[12, 12, 9]], d: ['M12 11v5M12 8h.01'] },
  trash: { d: ['M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13', 'M10 11v6M14 11v6'] },
  edit: { d: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'] },
  coin: { c: [[12, 12, 9]], d: ['M14.5 9a3 3 0 0 0-5 1.5c0 3 5.5 1.5 5.5 4.5a3 3 0 0 1-5 1.5M12 6.5v1.5M12 16v1.5'] },
  search: { c: [[11, 11, 7]], d: ['m20 20-3.8-3.8'] },
  fire: { d: ['M12 3c1 4 5 5.5 5 10.5A5 5 0 0 1 7 13.5C7 11 8.5 10 9 8c1 1 1.5 1.5 2 2.5C11.5 8 11.5 5.5 12 3z'] },
} satisfies Record<string, Def>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#F4F0E2', strokeWidth = 1.9 }: Props) {
  const def = ICONS[name] as Def;
  const common = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {def.r?.map(([x, y, w, h, rx], i) => (
        <Rect key={`r${i}`} x={x} y={y} width={w} height={h} rx={rx} {...common} />
      ))}
      {def.c?.map(([cx, cy, r], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} {...common} />
      ))}
      {def.d?.map((d, i) => (
        <Path key={`d${i}`} d={d} {...common} />
      ))}
    </Svg>
  );
}
