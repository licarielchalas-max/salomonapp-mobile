import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from '../AppText';
import { colors, fonts } from '../../theme';
import { scorePosition, type Grade } from '../../lib/score';

interface Props {
  score: number;
  grade: Grade;
  /** Ancho en px. */
  width?: number;
  /** El puntaje es provisional: el escudo se dibuja con trazo punteado. */
  provisional?: boolean;
}

const VB_W = 300;
const VB_H = 200;
const CX = 150;
const CY = 158;
const R = 118;

// Medidor en arco de F a A: degradado de rojo a verde, marcador en el puntaje y escudo con la nota.
export function ScoreArc({ score, grade, width = 300, provisional }: Props) {
  const gid = `arc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pos = scorePosition(score);
  const ang = Math.PI * (1 - pos);
  const kx = CX + R * Math.cos(ang);
  const ky = CY - R * Math.sin(ang);
  const scale = width / VB_W;
  const height = VB_H * scale;

  return (
    <View style={{ width, height }} accessibilityLabel={`Score ${score} de 850, nivel ${grade}`}>
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF4A3D" />
            <Stop offset="0.45" stopColor="#F7B84B" />
            <Stop offset="1" stopColor="#5FD39A" />
          </LinearGradient>
        </Defs>
        <Path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} stroke="rgba(255,255,255,0.10)" strokeWidth={26} fill="none" strokeLinecap="round" />
        <Path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} stroke={`url(#${gid})`} strokeWidth={22} fill="none" strokeLinecap="round" />
        {/* escudo */}
        <Path
          d="M150 70 L196 86 V128 C196 150 176 166 150 176 C124 166 104 150 104 128 V86 Z"
          fill="rgba(6,48,26,0.85)"
          stroke="#E2BE4B"
          strokeWidth={2.4}
          strokeDasharray={provisional ? '5 4' : undefined}
          strokeLinejoin="round"
        />
        {/* marcador */}
        <Circle cx={kx} cy={ky} r={13} fill="#06301A" />
        <Circle cx={kx} cy={ky} r={10} fill="#FBEBB0" stroke="#E2BE4B" strokeWidth={3} />
      </Svg>
      <Text style={[styles.grade, { left: 0, width, top: 98 * scale, fontSize: 46 * scale }]}>{grade}</Text>
      <Text style={[styles.end, { left: 6 * scale, top: (CY + 22) * scale, fontSize: 14 * scale }]}>F</Text>
      <Text style={[styles.end, { right: 6 * scale, top: (CY + 22) * scale, fontSize: 14 * scale }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { position: 'absolute', textAlign: 'center', fontFamily: fonts.heading, fontWeight: '800', color: colors.goldBright },
  end: { position: 'absolute', fontWeight: '800', color: colors.onDarkMuted },
});
