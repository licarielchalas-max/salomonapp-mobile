import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, glass } from '../theme';
import { useUserZone } from '../hooks/useUserZone';
import { zoneMatch, type ZoneScoped } from '../lib/zones';
import { navigationRef } from '../navigation/navigationRef';
import { useMarketplace, type MarketplaceItem } from '../hooks/useMarketplace';

type Category = 'todos' | 'certificados' | 'fondos' | 'acciones' | 'credito' | 'seguros' | 'vivienda' | 'digital';

interface Product extends ZoneScoped {
  id: string;
  banco: string;
  nombre: string;
  tipo: string;
  categoria: Category;
  tasa: string;
  plazo: string;
  minimo: string;
  descripcion: string;
  badge: string | null;
  color: string;
  icon: string;
  comision: string;
  url?: string | null;
}

const GOLD_BG = 'rgba(226,190,75,0.14)';

function toProduct(i: MarketplaceItem): Product {
  return {
    id: i.id, banco: i.banco, nombre: i.nombre, tipo: i.tipo ?? '', categoria: i.categoria,
    tasa: i.tasa ?? '', plazo: i.plazo ?? '', minimo: i.minimo ?? '', comision: i.comision ?? '',
    descripcion: i.descripcion ?? '', badge: i.badge, color: GOLD_BG, icon: i.icono, url: i.url,
    paises: i.paises, ciudades: i.ciudades,
  };
}

// Solo se usan si no se puede leer el catálogo del servidor.
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: '1', paises: ['República Dominicana'], banco: 'Banco Popular', nombre: 'Certificado de Depósito', tipo: 'Certificado', categoria: 'certificados',
    tasa: '9.5% anual', plazo: '12 meses', minimo: 'RD$10,000', comision: '1.5%',
    descripcion: 'Rendimiento fijo garantizado. Ideal para ahorro sin riesgo.',
    badge: '🏆 Más Popular', color: 'rgba(226,190,75,0.14)', icon: '🏦',
  },
  {
    id: '2', paises: ['República Dominicana'], banco: 'Banreservas', nombre: 'Fondo de Inversión BR', tipo: 'Fondo', categoria: 'fondos',
    tasa: '11-14% anual', plazo: 'Abierto', minimo: 'RD$5,000', comision: '1.2%',
    descripcion: 'Fondo diversificado en renta fija y variable. Liquidez semanal.',
    badge: '⚡ Alta rentabilidad', color: 'rgba(226,190,75,0.14)', icon: '🧺',
  },
  {
    id: '3', paises: ['República Dominicana'], banco: 'BHD León', nombre: 'SuperAhorro Plus', tipo: 'Certificado', categoria: 'certificados',
    tasa: '8.75% anual', plazo: '6-36 meses', minimo: 'RD$20,000', comision: '1.0%',
    descripcion: 'Flexibilidad de plazo con tasa competitiva. Sin penalidad de retiro anticipado.',
    badge: null, color: 'rgba(226,190,75,0.14)', icon: '💰',
  },
  {
    id: '4', paises: ['República Dominicana'], banco: 'Scotiabank', nombre: 'CD Premium USD', tipo: 'Certificado', categoria: 'certificados',
    tasa: '5.2% anual USD', plazo: '12 meses', minimo: '$500 USD', comision: '1.0%',
    descripcion: 'Certificado en dólares para protección cambiaria. Protege tu patrimonio.',
    badge: '💵 En USD', color: 'rgba(226,190,75,0.14)', icon: '🌐',
  },
  {
    id: '5', banco: 'E*TRADE / NYSE', nombre: 'Acciones S&P 500 ETF', tipo: 'ETF', categoria: 'acciones',
    tasa: '~12% hist. anual', plazo: 'Largo plazo', minimo: '$1 USD', comision: '0.8%',
    descripcion: 'Exposición al índice S&P 500. Diversificación global con bajo costo.',
    badge: '📈 Internacional', color: 'rgba(226,190,75,0.14)', icon: '📈',
  },
  {
    id: '6', paises: ['República Dominicana'], banco: 'Banco Popular', nombre: 'Tarjeta Platinum', tipo: 'Crédito', categoria: 'credito',
    tasa: '24% anual', plazo: 'Revolving', minimo: 'Aplica según perfil', comision: 'Ref. 2%',
    descripcion: 'Beneficios exclusivos: cashback 1.5%, seguro de viaje, acceso a salas VIP.',
    badge: '✈️ Premium', color: 'rgba(226,190,75,0.14)', icon: '💳',
  },
  {
    id: '7', paises: ['República Dominicana'], banco: 'Mapfre BHD', nombre: 'Seguro de Vida Universal', tipo: 'Seguro', categoria: 'seguros',
    tasa: 'Desde RD$450/mes', plazo: 'Anual renovable', minimo: 'Según cobertura', comision: '2.5%',
    descripcion: 'Protege a tu familia con cobertura hasta RD$5M. Incluye componente de ahorro.',
    badge: '🛡️ Protección', color: 'rgba(226,190,75,0.14)', icon: '🛡️',
  },
  {
    id: '8', paises: ['República Dominicana'], banco: 'Promerica', nombre: 'Fondo de Pensión Voluntario', tipo: 'AFP', categoria: 'fondos',
    tasa: 'Deducible ISR', plazo: 'Largo plazo', minimo: 'RD$1,000/mes', comision: '0.5%',
    descripcion: 'Ahorra para tu retiro y reduce tu carga tributaria hasta un 20% del ingreso.',
    badge: '🏖️ Retiro', color: 'rgba(226,190,75,0.14)', icon: '🏖️',
  },
];

const CATS: { key: Category; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'certificados', label: 'CD / Ahorro' },
  { key: 'fondos', label: 'Fondos' },
  { key: 'acciones', label: 'Acciones' },
  { key: 'credito', label: 'Crédito' },
  { key: 'seguros', label: 'Seguros' },
  { key: 'vivienda', label: 'Vivienda' },
  { key: 'digital', label: 'Digitales' },
];

export function MarketplaceScreen() {
  const [category, setCategory] = useState<Category>('todos');
  const [showDetail, setShowDetail] = useState<Product | null>(null);
  const { items, failed, track } = useMarketplace();
  const PRODUCTS: Product[] = failed && items.length === 0 ? FALLBACK_PRODUCTS : items.map(toProduct);
  const viewed = useRef(new Set<string>());

  const { pais, ciudad } = useUserZone();

  // Solo se muestra lo disponible en la zona de la persona: primero lo de su ciudad, luego lo de su país
  // y al final lo que sirve en cualquier lugar.
  const inZone = PRODUCTS.map((p) => ({ p, match: zoneMatch(p, { pais, ciudad }) }))
    .filter((x) => x.match > 0)
    .sort((a, b) => b.match - a.match);
  const filtered = inZone.filter((x) => category === 'todos' || x.p.categoria === category).map((x) => x.p);
  // Cuenta cada producto mostrado una vez por visita.
  const shownIds = filtered.map((p) => p.id).join(',');
  useEffect(() => {
    const fresh = filtered.map((p) => p.id).filter((id) => !viewed.current.has(id) && id.includes('-'));
    if (fresh.length === 0) return;
    fresh.forEach((id) => viewed.current.add(id));
    track(fresh, 'view');
  }, [shownIds]);

  function openDetail(p: Product) {
    setShowDetail(p);
    if (p.id.includes('-')) track([p.id], 'click');
  }

  // Pide que lo contacten (se comparte el correo y el nombre con Salomón) o abre su página.
  async function interested(p: Product) {
    if (p.id.includes('-')) await track([p.id], 'lead');
    if (p.url) Linking.openURL(p.url).catch(() => {});
    Alert.alert('¡Listo!', `Recibimos tu interés en ${p.nombre}. Te contactaremos con los datos de tu cuenta de Salomón.`);
  }

  const zoneLabel = [ciudad, pais].filter(Boolean).join(', ');
  const emptyCategory = category === 'vivienda' || category === 'digital';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Instrumentos financieros recomendados por Salomón</Text>
        <Pressable onPress={() => navigationRef.current?.navigate('Preferencias')} accessibilityLabel="Cambiar mi zona" style={styles.zoneRow}>
          <Text style={styles.zoneText}>Ofertas para {zoneLabel}</Text>
          <Text style={styles.zoneLink}>Cambiar</Text>
        </Pressable>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {CATS.map((c) => (
          <Pressable key={c.key} style={[styles.catChip, category === c.key && styles.catChipActive]} onPress={() => setCategory(c.key)}>
            <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Commission banner */}
        <View style={styles.commissionBanner}>
          <Text style={styles.commissionText}>💡 Salomón gana una comisión cuando contratas a través de la app — sin costo adicional para ti</Text>
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {emptyCategory ? 'Pronto habrá ofertas en tu zona' : 'Sin ofertas en esta categoría'}
            </Text>
            <Text style={styles.emptyText}>
              {emptyCategory
                ? 'Estamos sumando proyectos de vivienda y productos digitales. Te mostraremos los de tu país y tu ciudad apenas estén disponibles.'
                : 'Por ahora no hay productos de esta categoría disponibles en tu zona. Prueba con otra categoría o cambia tu país y ciudad en Preferencias.'}
            </Text>
          </View>
        )}

        {filtered.map((product) => (
          <Pressable key={product.id} style={styles.productCard} onPress={() => openDetail(product)}>
            <View style={[styles.productHeader, { backgroundColor: product.color }]}>
              <Text style={styles.productIcon}>{product.icon}</Text>
              {product.badge && (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{product.badge}</Text>
                </View>
              )}
            </View>
            <View style={styles.productBody}>
              <Text style={styles.productBanco}>{product.banco}</Text>
              <Text style={styles.productNombre}>{product.nombre}</Text>
              <Text style={styles.productDesc} numberOfLines={2}>{product.descripcion}</Text>
              <View style={styles.productStats}>
                <View style={styles.productStat}>
                  <Text style={styles.productStatLabel}>Tasa / Retorno</Text>
                  <Text style={styles.productStatValue}>{product.tasa}</Text>
                </View>
                <View style={styles.productStat}>
                  <Text style={styles.productStatLabel}>Plazo</Text>
                  <Text style={styles.productStatValue}>{product.plazo}</Text>
                </View>
                <View style={styles.productStat}>
                  <Text style={styles.productStatLabel}>Mínimo</Text>
                  <Text style={styles.productStatValue}>{product.minimo}</Text>
                </View>
              </View>
              <Pressable style={styles.interestBtn} onPress={() => interested(product)}>
                <Text style={styles.interestBtnText}>Quiero saber más →</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>⚠️ Aviso importante</Text>
          <Text style={styles.disclaimerText}>
            Los instrumentos mostrados son referencias informativas. Tasas y condiciones pueden variar. Consulta con cada institución antes de invertir. Salomón no es un asesor financiero registrado.
          </Text>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      {showDetail && (
        <Pressable style={styles.detailOverlay} onPress={() => setShowDetail(null)}>
          <Pressable style={styles.detailCard} onPress={() => {}}>
            <View style={[styles.detailHeaderBg, { backgroundColor: showDetail.color }]}>
              <Text style={styles.detailIcon}>{showDetail.icon}</Text>
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailBanco}>{showDetail.banco}</Text>
              <Text style={styles.detailNombre}>{showDetail.nombre}</Text>
              <Text style={styles.detailDesc}>{showDetail.descripcion}</Text>

              <View style={styles.detailGrid}>
                {[
                  { label: 'Tipo', value: showDetail.tipo },
                  { label: 'Tasa / Retorno', value: showDetail.tasa },
                  { label: 'Plazo', value: showDetail.plazo },
                  { label: 'Monto mínimo', value: showDetail.minimo },
                  { label: 'Comisión Salomón', value: showDetail.comision },
                ].filter((s) => !!s.value).map((s) => (
                  <View key={s.label} style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>{s.label}</Text>
                    <Text style={styles.detailRowValue}>{s.value}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.contactBtn} onPress={() => interested(showDetail)}>
                <Text style={styles.contactBtnText}>📞 Contactar asesor</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={() => setShowDetail(null)}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.bgDeep, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.onDark, marginBottom: 4 },
  headerSub: { fontSize: 12, color: colors.onDarkMuted },
  zoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  zoneText: { fontSize: 12.5, fontWeight: '700', color: colors.goldBright, flex: 1 },
  zoneLink: { fontSize: 12, fontWeight: '700', color: colors.gold },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.gold },
  emptyText: { fontSize: 12.5, color: colors.onDarkMuted, lineHeight: 19 },
  catScroll: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  catContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.sm },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bg },
  catChipActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  catChipText: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  catChipTextActive: { color: colors.onDark },
  content: { padding: spacing.lg, paddingBottom: 130 },
  commissionBanner: { backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.greenBorder },
  commissionText: { fontSize: 12, color: colors.green, lineHeight: 18 },
  productCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, ...shadow.card },
  productHeader: { height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  productIcon: { fontSize: 36 },
  badgeWrap: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.onDark },
  productBody: { padding: spacing.md },
  productBanco: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 0.8, marginBottom: 4 },
  productNombre: { fontSize: 16, fontWeight: '700', color: colors.onDark, marginBottom: 6 },
  productDesc: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 18, marginBottom: spacing.md },
  productStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: spacing.md, marginBottom: spacing.md },
  productStat: { flex: 1, alignItems: 'center' },
  productStatLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 3 },
  productStatValue: { fontSize: 11, fontWeight: '700', color: colors.gold, textAlign: 'center' },
  interestBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  interestBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  disclaimerCard: { backgroundColor: colors.rustSoft, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.rustBorder },
  disclaimerTitle: { fontSize: 13, fontWeight: '700', color: colors.rust, marginBottom: spacing.sm },
  disclaimerText: { fontSize: 12, color: colors.rust, lineHeight: 18 },
  detailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  detailHeaderBg: { height: 120, alignItems: 'center', justifyContent: 'center' },
  detailIcon: { fontSize: 48 },
  detailBody: { padding: spacing.xl, gap: spacing.sm },
  detailBanco: { fontSize: 11, fontWeight: '700', color: colors.gold, letterSpacing: 0.8 },
  detailNombre: { fontSize: 20, fontWeight: '800', color: colors.onDark },
  detailDesc: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 20 },
  detailGrid: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailRowLabel: { fontSize: 12, color: colors.onDarkMuted },
  detailRowValue: { fontSize: 12, fontWeight: '700', color: colors.onDark },
  contactBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  contactBtnText: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  closeBtn: { paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: colors.onDarkMuted, fontWeight: '600' },
});
