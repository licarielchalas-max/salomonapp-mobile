import React, { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  CROWN_BAND,
  CROWN_BODY,
  CROWN_GEMS,
  CROWN_TIPS,
  MINI_CROWN,
  S_PATH,
  S_TRANSFORM,
} from './brandPaths';

// Los ids de los degradados son iguales en todas las instancias: las definiciones
// son idénticas, así que compartirlos es inofensivo.
const FOIL_STOPS = [
  { offset: '0', color: '#FFF3C4' },
  { offset: '0.46', color: '#EBC95E' },
  { offset: '0.47', color: '#D8AE3C' },
  { offset: '1', color: '#9A7116' },
];

interface EmblemProps {
  /** Ancho en px. El alto sigue la proporción del dibujo. */
  size?: number;
  /** Con anillo (emblema completo) o solo corona + S (ícono). */
  ring?: boolean;
  /** "foil" = oro metálico; "ink" = una sola tinta (fondos claros). */
  tone?: 'foil' | 'ink';
  /** Color de la tinta cuando tone="ink". */
  ink?: string;
  /** Color de las joyas de la corona. */
  gem?: string;
}

export function SalomonEmblem({
  size = 160,
  ring = true,
  tone = 'foil',
  ink = '#0A4A2A',
  gem = '#0B5430',
}: EmblemProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const foilId = `sal-foil-${uid}`;
  const lineId = `sal-line-${uid}`;
  const discId = `sal-disc-${uid}`;
  const cutId = `sal-cut-${uid}`;
  const foil = tone === 'foil';
  const fill = foil ? `url(#${foilId})` : ink;
  const line = foil ? `url(#${lineId})` : ink;
  const viewBox = ring ? '0 0 200 210' : '36 0 128 210';
  const ratio = ring ? 210 / 200 : 210 / 128;

  return (
    <Svg width={size} height={Math.round(size * ratio)} viewBox={viewBox} accessibilityLabel="Salomón">
      <Defs>
        <LinearGradient id={foilId} x1="0.15" y1="0" x2="0.85" y2="1">
          {FOIL_STOPS.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
        <LinearGradient id={lineId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F6E3A1" />
          <Stop offset="1" stopColor="#C9A227" />
        </LinearGradient>
        <RadialGradient id={discId} cx="50%" cy="38%" r="70%">
          <Stop offset="0" stopColor="#127A47" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#06301A" stopOpacity="0.15" />
        </RadialGradient>
        <Mask id={cutId} x="0" y="0" width="200" height="210">
          <Rect width="200" height="210" fill="#fff" />
          <Rect x={55} y={0} width={90} height={78} fill="#000" />
          <Path d={CROWN_BODY} fill="#000" stroke="#000" strokeWidth={13} strokeLinejoin="round" />
          <Rect
            x={CROWN_BAND.x}
            y={CROWN_BAND.y}
            width={CROWN_BAND.width}
            height={CROWN_BAND.height}
            fill="#000"
            stroke="#000"
            strokeWidth={13}
            strokeLinejoin="round"
          />
        </Mask>
      </Defs>

      {ring && (
        <G mask={`url(#${cutId})`}>
          {foil && <Circle cx={100} cy={118} r={82} fill={`url(#${discId})`} />}
          <Circle cx={100} cy={118} r={82} fill="none" stroke={line} strokeWidth={2.8} />
          <Circle cx={100} cy={118} r={75.5} fill="none" stroke={line} strokeWidth={0.9} opacity={0.65} />
        </G>
      )}
      {ring && (
        <>
          <Path d="M9.5 118 l4.5 -4.5 l4.5 4.5 l-4.5 4.5 z" fill={line} />
          <Path d="M181.5 118 l4.5 -4.5 l4.5 4.5 l-4.5 4.5 z" fill={line} />
        </>
      )}

      <Path d={CROWN_BODY} fill={fill} stroke={fill} strokeWidth={ring ? 2.4 : 4} strokeLinejoin="round" />
      {CROWN_TIPS.map((t) => (
        <Circle key={`${t.cx}-${t.cy}`} cx={t.cx} cy={t.cy} r={t.r} fill={fill} />
      ))}
      <Rect
        x={CROWN_BAND.x}
        y={CROWN_BAND.y}
        width={CROWN_BAND.width}
        height={ring ? CROWN_BAND.height : 9}
        rx={CROWN_BAND.rx}
        fill={fill}
      />
      {ring &&
        CROWN_GEMS.map((g) => <Circle key={`${g.cx}-${g.cy}`} cx={g.cx} cy={g.cy} r={g.r} fill={gem} />)}
      <Path transform={S_TRANSFORM} d={S_PATH} fill={fill} />
    </Svg>
  );
}

interface CrownProps {
  size?: number;
  tone?: 'foil' | 'ink';
  color?: string;
}

// Corona sencilla para detalles de interfaz (score, niveles de plan, marcas de agua).
export function SalomonCrown({ size = 20, tone = 'foil', color = '#E2BE4B' }: CrownProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const crownId = `sal-crown-foil-${uid}`;
  const foil = tone === 'foil';
  const fill = foil ? `url(#${crownId})` : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Corona">
      {foil && (
        <Defs>
          <LinearGradient id={crownId} x1="0.15" y1="0" x2="0.85" y2="1">
            {FOIL_STOPS.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
      )}
      <Path d={MINI_CROWN.body} fill={fill} />
      {MINI_CROWN.tips.map((t) => (
        <Circle key={t.cx} cx={t.cx} cy={t.cy} r={t.r} fill={fill} />
      ))}
      <Rect
        x={MINI_CROWN.band.x}
        y={MINI_CROWN.band.y}
        width={MINI_CROWN.band.width}
        height={MINI_CROWN.band.height}
        rx={MINI_CROWN.band.rx}
        fill={fill}
      />
    </Svg>
  );
}
