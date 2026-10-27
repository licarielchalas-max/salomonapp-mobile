import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { TextInput } from '../AppTextInput';
import { Chip, FieldLabel, Sheet } from '../budget/ui';
import { GoldButton } from '../brand/Buttons';
import { supabase } from '../../lib/supabase';
import { dateLocale } from '../../lib/i18n';
import { COUNTRIES } from '../../lib/zones';
import { colors, radius, spacing } from '../../theme';
import type { MarketplaceCategory, MarketplaceItem, MarketplaceKind } from '../../hooks/useMarketplace';
import type { AdminReferrer } from '../../types/db';

const KINDS: { key: MarketplaceKind; label: string; categoria: MarketplaceCategory }[] = [
  { key: 'financiero', label: 'Producto financiero', categoria: 'certificados' },
  { key: 'inversion', label: 'Inversión', categoria: 'fondos' },
  { key: 'vivienda', label: 'Proyecto de vivienda', categoria: 'vivienda' },
  { key: 'digital', label: 'Producto digital', categoria: 'digital' },
  { key: 'anuncio', label: 'Anuncio de marca', categoria: 'digital' },
];
const CATEGORIAS: { key: MarketplaceCategory; label: string }[] = [
  { key: 'certificados', label: 'CD / Ahorro' },
  { key: 'fondos', label: 'Fondos' },
  { key: 'acciones', label: 'Acciones' },
  { key: 'credito', label: 'Crédito' },
  { key: 'seguros', label: 'Seguros' },
  { key: 'vivienda', label: 'Vivienda' },
  { key: 'digital', label: 'Digitales' },
];
const ICONOS = ['🏦', '💰', '💳', '📈', '🛡️', '🏠', '🎓', '📱', '🎁', '🌐', '🏖️', '🧺'];

interface Stat { id: string; vistas: number; clics: number; contactos: number }
interface Lead { email: string | null; nombre: string | null; ciudad: string | null; pais: string | null; created_at: string }

const split = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

// Administra el Marketplace: productos financieros y digitales, proyectos de vivienda y anuncios de marcas.
export function AdminMarketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [partners, setPartners] = useState<AdminReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MarketplaceItem | 'new' | null>(null);
  const [leadsOf, setLeadsOf] = useState<MarketplaceItem | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const load = useCallback(async () => {
    const [i, s, p] = await Promise.all([
      supabase.from('marketplace_items').select('*').order('orden').order('created_at'),
      supabase.rpc('admin_marketplace_stats'),
      supabase.rpc('admin_referrers'),
    ]);
    setItems((i.data ?? []) as MarketplaceItem[]);
    setStats(Object.fromEntries(((s.data ?? []) as Stat[]).map((x) => [x.id, x])));
    setPartners(((p.data ?? []) as AdminReferrer[]).filter((x) => x.kind !== 'usuario'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(it: MarketplaceItem) {
    const { error } = await supabase.from('marketplace_items').update({ activo: !it.activo } as never).eq('id', it.id);
    if (error) return Alert.alert('No se pudo actualizar', error.message);
    load();
  }

  async function openLeads(it: MarketplaceItem) {
    setLeadsOf(it);
    setLeads([]);
    const { data } = await supabase.rpc('admin_marketplace_leads', { p_item: it.id });
    setLeads((data ?? []) as Lead[]);
  }

  if (loading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.rowBetween}>
        <Text style={styles.section}>PRODUCTOS Y ANUNCIOS ({items.length})</Text>
        <Pressable onPress={() => setEditing('new')} accessibilityLabel="Agregar un producto o anuncio">
          <Text style={styles.link}>+ Agregar</Text>
        </Pressable>
      </View>

      {items.map((it) => {
        const st = stats[it.id];
        const partner = partners.find((p) => p.id === it.partner_id);
        return (
          <View key={it.id} style={[styles.card, !it.activo && { opacity: 0.55 }]}>
            <Pressable onPress={() => setEditing(it)} style={{ flex: 1 }} accessibilityLabel={`Editar ${it.nombre}`}>
              <Text style={styles.title}>{it.icono}  {it.nombre}</Text>
              <Text style={styles.sub}>
                {it.banco} · {KINDS.find((k) => k.key === it.kind)?.label}
                {it.paises.length ? ` · ${it.paises.join(', ')}` : ' · Todos los países'}
                {it.ciudades.length ? ` · ${it.ciudades.join(', ')}` : ''}
              </Text>
              {partner && <Text style={styles.sub}>Socio: {partner.nombre}</Text>}
              <Text style={styles.sub}>
                30 días: {st?.vistas ?? 0} vistas · {st?.clics ?? 0} clics · {st?.contactos ?? 0} contactos
              </Text>
            </Pressable>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <Chip label={it.activo ? 'Activo' : 'Pausado'} active={it.activo} onPress={() => toggleActive(it)} />
              {(st?.contactos ?? 0) > 0 && <Pressable onPress={() => openLeads(it)}><Text style={styles.link}>Ver contactos</Text></Pressable>}
            </View>
          </View>
        );
      })}

      <ItemForm value={editing} partners={partners} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />

      <Sheet visible={!!leadsOf} onClose={() => setLeadsOf(null)} title={leadsOf?.nombre ?? ''}>
        <Text style={styles.sub}>Personas que pidieron que las contacten.</Text>
        {leads.map((l, i) => (
          <View key={i} style={styles.leadRow}>
            <Text style={styles.title}>{l.nombre ?? 'Usuario'} · {l.email ?? 'sin correo'}</Text>
            <Text style={styles.sub}>
              {[l.ciudad, l.pais].filter(Boolean).join(', ') || 'Sin zona'} · {new Date(l.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        ))}
      </Sheet>
    </View>
  );
}

function ItemForm({ value, partners, onClose, onSaved }: { value: MarketplaceItem | 'new' | null; partners: AdminReferrer[]; onClose: () => void; onSaved: () => void }) {
  const editing = value && value !== 'new' ? value : null;
  const [kind, setKind] = useState<MarketplaceKind>('financiero');
  const [categoria, setCategoria] = useState<MarketplaceCategory>('certificados');
  const [banco, setBanco] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [tasa, setTasa] = useState('');
  const [plazo, setPlazo] = useState('');
  const [minimo, setMinimo] = useState('');
  const [comision, setComision] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [badge, setBadge] = useState('');
  const [icono, setIcono] = useState('🏦');
  const [url, setUrl] = useState('');
  const [paises, setPaises] = useState<string[]>([]);
  const [ciudades, setCiudades] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [orden, setOrden] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!value) return;
    const e = editing;
    setKind(e?.kind ?? 'financiero');
    setCategoria(e?.categoria ?? 'certificados');
    setBanco(e?.banco ?? '');
    setNombre(e?.nombre ?? '');
    setTipo(e?.tipo ?? '');
    setTasa(e?.tasa ?? '');
    setPlazo(e?.plazo ?? '');
    setMinimo(e?.minimo ?? '');
    setComision(e?.comision ?? '');
    setDescripcion(e?.descripcion ?? '');
    setBadge(e?.badge ?? '');
    setIcono(e?.icono ?? '🏦');
    setUrl(e?.url ?? '');
    setPaises(e?.paises ?? []);
    setCiudades((e?.ciudades ?? []).join(', '));
    setPartnerId(e?.partner_id ?? null);
    setStartsAt(e?.starts_at ?? '');
    setEndsAt(e?.ends_at ?? '');
    setOrden(String(e?.orden ?? 0));
  }, [value]);

  function pickKind(k: (typeof KINDS)[number]) {
    setKind(k.key);
    if (!editing) setCategoria(k.categoria);
  }

  async function save() {
    if (!banco.trim() || !nombre.trim()) return Alert.alert('Faltan datos', 'Escribe la marca o institución y el nombre del producto.');
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) return Alert.alert('Enlace inválido', 'El enlace debe empezar con https://');
    for (const d of [startsAt, endsAt]) {
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return Alert.alert('Fecha inválida', 'Escribe las fechas como AAAA-MM-DD.');
    }
    setSaving(true);
    const row = {
      kind, categoria, banco: banco.trim(), nombre: nombre.trim(), tipo: tipo.trim() || null, tasa: tasa.trim() || null,
      plazo: plazo.trim() || null, minimo: minimo.trim() || null, comision: comision.trim() || null,
      descripcion: descripcion.trim() || null, badge: badge.trim() || null, icono, url: url.trim() || null,
      paises, ciudades: split(ciudades), partner_id: partnerId, starts_at: startsAt || null, ends_at: endsAt || null,
      orden: parseInt(orden, 10) || 0,
    };
    const { error } = editing
      ? await supabase.from('marketplace_items').update(row as never).eq('id', editing.id)
      : await supabase.from('marketplace_items').insert(row as never);
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    onSaved();
  }

  async function remove() {
    if (!editing) return;
    Alert.alert('Eliminar', `¿Eliminar "${editing.nombre}"? Se borran también sus estadísticas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('marketplace_items').delete().eq('id', editing.id);
          if (error) return Alert.alert('No se pudo eliminar', error.message);
          onSaved();
        },
      },
    ]);
  }

  const field = (label: string, v: string, set: (s: string) => void, placeholder = '', multiline = false) => (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        value={v}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor={colors.onDarkMuted}
        multiline={multiline}
        autoCapitalize="none"
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Sheet visible={!!value} onClose={onClose} title={editing ? 'Editar producto' : 'Nuevo producto o anuncio'}>
      <FieldLabel>Tipo</FieldLabel>
      <View style={styles.chips}>{KINDS.map((k) => <Chip key={k.key} label={k.label} active={kind === k.key} onPress={() => pickKind(k)} />)}</View>
      <FieldLabel>Categoría en el Marketplace</FieldLabel>
      <View style={styles.chips}>{CATEGORIAS.map((c) => <Chip key={c.key} label={c.label} active={categoria === c.key} onPress={() => setCategoria(c.key)} />)}</View>
      {field('Marca o institución', banco, setBanco, 'Ej. Banco Popular')}
      {field('Nombre del producto', nombre, setNombre, 'Ej. Certificado de Depósito')}
      {field('Descripción', descripcion, setDescripcion, 'Qué ofrece', true)}
      {field('Tipo (etiqueta corta)', tipo, setTipo, 'Certificado, ETF, Curso…')}
      {field('Tasa o precio', tasa, setTasa, '9.5% anual')}
      {field('Plazo', plazo, setPlazo, '12 meses')}
      {field('Monto mínimo', minimo, setMinimo, 'RD$10,000')}
      {field('Comisión de Salomón (solo para ti)', comision, setComision, '1.5%')}
      {field('Etiqueta destacada', badge, setBadge, 'Más popular')}
      <FieldLabel>Ícono</FieldLabel>
      <View style={styles.chips}>{ICONOS.map((i) => <Chip key={i} label={i} active={icono === i} onPress={() => setIcono(i)} />)}</View>
      {field('Enlace para más información', url, setUrl, 'https://…')}

      <FieldLabel>Países donde se muestra (vacío = todos)</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {COUNTRIES.map((c) => (
          <Chip key={c} label={c} active={paises.includes(c)} onPress={() => setPaises((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))} />
        ))}
      </ScrollView>
      {field('Ciudades (separadas por coma, vacío = todo el país)', ciudades, setCiudades, 'Santo Domingo, Punta Cana')}

      {partners.length > 0 && (
        <>
          <FieldLabel>Socio (influencer o marca)</FieldLabel>
          <View style={styles.chips}>
            <Chip label="Ninguno" active={partnerId === null} onPress={() => setPartnerId(null)} />
            {partners.map((p) => <Chip key={p.id} label={p.nombre} active={partnerId === p.id} onPress={() => setPartnerId(p.id)} />)}
          </View>
        </>
      )}
      {field('Visible desde (AAAA-MM-DD, opcional)', startsAt, setStartsAt, '2026-11-01')}
      {field('Visible hasta (AAAA-MM-DD, opcional)', endsAt, setEndsAt, '2026-12-31')}
      {field('Orden (menor sale primero)', orden, setOrden, '0')}

      <GoldButton label="Guardar" onPress={save} loading={saving} />
      {editing && (
        <Pressable onPress={remove} style={{ alignItems: 'center', paddingVertical: 8 }} accessibilityLabel="Eliminar este producto">
          <Text style={{ color: colors.rust, fontWeight: '700', fontSize: 13 }}>Eliminar</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 13, fontWeight: '700', color: colors.gold },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder },
  title: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  sub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 2, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  leadRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onDark,
  },
});
