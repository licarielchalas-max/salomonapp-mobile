import React, { useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { SalomonCrown } from './SalomonEmblem';

interface SparkProps {
  values: number[];
  width: number;
  height?: number;
  color?: string;
}

// Línea de tendencia con área degradada y punto final resaltado.
export function Sparkline({ values, width, height = 56, color = '#E2BE4B' }: SparkProps) {
  const areaId = `spark-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { line, area, end } = useMemo(() => {
    const pts = values.length > 1 ? values : [0, 0];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const pad = 6;
    const xs = (i: number) => (i / (pts.length - 1)) * width;
    const ys = (v: number) => (max === min ? height / 2 : height - pad - ((v - min) / span) * (height - pad * 2));
    const coords = pts.map((v, i) => [xs(i), ys(v)] as const);
    // Curva suave (Catmull-Rom a Bézier).
    let d = `M${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i - 1] ?? coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const last = coords[coords.length - 1];
    return { line: d, area: `${d} L${width} ${height} L0 ${height} Z`, end: last };
  }, [values, width, height]);

  return (
    <Svg width={width} height={height} accessibilityLabel="Tendencia del balance del mes">
      <Defs>
        <LinearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.38" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${areaId})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={end[0] - 3} cy={end[1]} r={4.5} fill="#FBEBB0" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

interface GaugeProps {
  /** Score en escala 300–850. */
  score: number;
  size?: number;
}

const TICKS = 40;

// Medidor del Score Salomón: marcas alrededor, corona sobre el anillo y el número al centro.
export function ScoreGauge({ score, size = 100 }: GaugeProps) {
  const pct = Math.max(0, Math.min(1, (score - 300) / 550));
  const c = size / 2;
  const cy = size * 0.58;
  const r = size * 0.36;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    // Sin marcas bajo la corona (parte alta del anillo).
    if (i === 0 || i === 1 || i === TICKS - 1) return null;
    const rad = ((-90 + (i * 360) / TICKS) * Math.PI) / 180;
    return {
      key: i,
      x1: c + (r - size * 0.05) * Math.cos(rad),
      y1: cy + (r - size * 0.05) * Math.sin(rad),
      x2: c + (r + size * 0.05) * Math.cos(rad),
      y2: cy + (r + size * 0.05) * Math.sin(rad),
      on: i / TICKS <= pct,
    };
  });

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Score ${score} de 850`}>
      <Svg width={size} height={size}>
        {ticks.map(
          (t) =>
            t && (
              <Line
                key={t.key}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.on ? '#E2BE4B' : 'rgba(255,255,255,0.22)'}
                strokeWidth={size * 0.028}
                strokeLinecap="round"
              />
            ),
        )}
      </Svg>
      <View style={[styles.crown, { left: c - size * 0.11, top: 0 }]}>
        <SalomonCrown size={size * 0.22} />
      </View>
      <Text style={[styles.num, { top: cy - size * 0.17, width: size, fontSize: size * 0.27 }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  crown: { position: 'absolute' },
  num: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.heading,
    color: colors.onDark,
    fontWeight: '800',
  },
});
