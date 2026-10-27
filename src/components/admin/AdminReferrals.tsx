import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { TextInput } from '../AppTextInput';
import { Chip, FieldLabel, Sheet } from '../budget/ui';
import { GoldButton } from '../brand/Buttons';
import { Icon } from '../brand/Icon';
import { supabase } from '../../lib/supabase';
import { formatCurrency, isCurrency } from '../../lib/currency';
import { dateLocale } from '../../lib/i18n';
import { colors, radius, spacing } from '../../theme';
import type { AdminCommission, AdminReferrer, CommissionStatus } from '../../types/db';

type Filter = 'pendiente' | 'aprobada' | 'pagada';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pendiente', label: 'Por aprobar' },
  { key: 'aprobada', label: 'Por pagar' },
  { key: 'pagada', label: 'Pagadas' },
];

const money = (n: number, cur = 'USD') => formatCurrency(n, isCurrency(cur) ? cur : 'USD', { space: true });
const num = (v: string) => parseFloat(v.replace(',', '.'));

function monthLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
}

function payoutText(c: Pick<AdminCommission, 'payout_method' | 'payout_paypal' | 'payout_banco' | 'payout_cuenta' | 'payout_titular'>): string {
  if (c.payout_method === 'paypal') return `PayPal: ${c.payout_paypal}`;
  if (c.payout_method === 'banco') return `${c.payout_banco} · cuenta ${c.payout_cuenta} · ${c.payout_titular}`;
  return 'Sin cuenta de cobro registrada';
}

// Panel de referidos: comisiones del mes para aprobar y pagar, y la lista de referidores y socios.
export function AdminReferrals() {
  const [refs, setRefs] = useState<AdminReferrer[]>([]);
  const [comms, setComms] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pendiente');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminReferrer | 'new' | null>(null);
  const [detail, setDetail] = useState<AdminReferrer | null>(null);
  const [referred, setReferred] = useState<{ alias: string; email: string | null; desde: string; plan: string | null; comision: number | null; estado: CommissionStatus | null; moneda: string | null }[]>([]);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([supabase.rpc('admin_referrers'), supabase.rpc('admin_commissions', { p_status: null })]);
    if (r.error) Alert.alert('No se pudieron cargar los referidores', r.error.message);
    setRefs((r.data ?? []) as AdminReferrer[]);
    setComms((c.data ?? []) as AdminCommission[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => comms.filter((c) => c.status === filter), [comms, filter]);
  const totals = useMemo(() => {
    const sum = (s: CommissionStatus) => comms.filter((c) => c.status === s && c.environment !== 'sandbox').reduce((a, c) => a + Number(c.amount), 0);
    return { pendiente: sum('pendiente'), aprobada: sum('aprobada'), pagada: sum('pagada') };
  }, [comms]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function setStatus(status: 'aprobada' | 'pagada' | 'rechazada', ref?: string) {
    const ids = shown.filter((c) => selected.has(c.id)).map((c) => c.id);
    if (ids.length === 0) return Alert.alert('Elige comisiones', 'Marca las comisiones que quieres actualizar.');
    setBusy(true);
    const { error } = await supabase.rpc('admin_set_commissions', { p_ids: ids, p_status: status, p_ref: ref ?? null });
    setBusy(false);
    if (error) return Alert.alert('No se pudo actualizar', error.message);
    setSelected(new Set());
    setPayOpen(false);
    setPayRef('');
    load();
  }

  async function openDetail(r: AdminReferrer) {
    setDetail(r);
    setReferred([]);
    const { data } = await supabase.rpc('admin_referred', { p_referrer: r.id });
    setReferred((data ?? []) as typeof referred);
  }

  if (loading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.statRow}>
        <View style={styles.stat}><Text style={styles.statNum}>{money(totals.pendiente)}</Text><Text style={styles.statLabel}>Por aprobar</Text></View>
        <View style={styles.stat}><Text style={[styles.statNum, { color: colors.neonAmber }]}>{money(totals.aprobada)}</Text><Text style={styles.statLabel}>Por pagar</Text></View>
        <View style={styles.stat}><Text style={[styles.statNum, { color: colors.green }]}>{money(totals.pagada)}</Text><Text style={styles.statLabel}>Pagado</Text></View>
      </View>

      <Text style={styles.section}>COMISIONES POR EL PRIMER PAGO DE CADA REFERIDO</Text>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => { setFilter(f.key); setSelected(new Set()); }} />
        ))}
      </View>

      {shown.length === 0 ? (
        <Text style={styles.empty}>No hay comisiones en esta lista.</Text>
      ) : (
        shown.map((c) => {
          const on = selected.has(c.id);
          return (
            <Pressable key={c.id} onPress={() => toggle(c.id)} style={[styles.card, on && styles.cardOn]} accessibilityLabel={`Comisión de ${c.referidor}`}>
              <View style={[styles.check, on && styles.checkOn]}>{on && <Icon name="check" size={13} color={colors.onNavy} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.referidor} · {money(Number(c.amount), c.currency)}{c.environment === 'sandbox' ? ' · PRUEBA' : ''}</Text>
                <Text style={styles.cardSub}>
                  Referido #{c.alias} · {monthLabel(c.period)} · {Number(c.pct)}% de {money(Number(c.base_amount), c.currency)}
                </Text>
                {filter !== 'pendiente' && <Text style={styles.cardSub}>{payoutText(c)}</Text>}
                {c.paid_ref ? <Text style={styles.cardSub}>Referencia: {c.paid_ref}</Text> : null}
              </View>
            </Pressable>
          );
        })
      )}

      {filter !== 'pagada' && shown.length > 0 && (
        <View style={styles.actions}>
          <Chip label={selected.size === shown.length ? 'Quitar selección' : 'Seleccionar todas'} onPress={() => setSelected(selected.size === shown.length ? new Set() : new Set(shown.map((c) => c.id)))} />
          {filter === 'pendiente' && <Chip label="Aprobar" icon="check" onPress={() => setStatus('aprobada')} />}
          {filter === 'aprobada' && <Chip label="Marcar como pagadas" icon="check" onPress={() => (selected.size ? setPayOpen(true) : Alert.alert('Elige comisiones', 'Marca las comisiones que ya pagaste.'))} />}
          <Chip label="Rechazar" icon="close" onPress={() => setStatus('rechazada')} />
        </View>
      )}
      {busy && <ActivityIndicator color={colors.gold} />}

      <View style={styles.rowBetween}>
        <Text style={styles.section}>REFERIDORES Y SOCIOS</Text>
        <Pressable onPress={() => setEditing('new')} accessibilityLabel="Agregar un socio">
          <Text style={styles.link}>+ Nuevo socio</Text>
        </Pressable>
      </View>
      {refs.map((r) => (
        <Pressable key={r.id} style={styles.card} onPress={() => openDetail(r)} accessibilityLabel={`Ver a ${r.nombre}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{r.nombre}{!r.activo ? ' (pausado)' : ''}</Text>
            <Text style={styles.cardSub}>
              {r.kind === 'usuario' ? 'Usuario' : r.kind === 'influencer' ? 'Influencer' : 'Marca'} · {r.code} · {Number(r.commission_pct)}% · {r.referidos} referido{r.referidos === 1 ? '' : 's'} · {r.suscritos} suscrito{r.suscritos === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.cardAmt}>{money(Number(r.pendiente) + Number(r.aprobada))}</Text>
        </Pressable>
      ))}

      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="Marcar como pagadas">
        <Text style={styles.empty}>Escribe el número de referencia o transacción del pago (PayPal o transferencia). Quedará guardado en cada comisión.</Text>
        <FieldLabel>Referencia del pago</FieldLabel>
        <TextInput style={styles.input} value={payRef} onChangeText={setPayRef} placeholder="Ej. PAYPAL-8H123456" placeholderTextColor={colors.onDarkMuted} accessibilityLabel="Referencia del pago" />
        <GoldButton label="Confirmar pago" onPress={() => setStatus('pagada', payRef)} loading={busy} />
      </Sheet>

      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.nombre ?? ''}>
        {detail && (
          <>
            <Text style={styles.cardSub}>{detail.code} · {Number(detail.commission_pct)}%{detail.email ? ` · ${detail.email}` : ''}</Text>
            <Text style={styles.cardSub}>{payoutText(detail)}</Text>
            <Text style={styles.section}>QUIÉN LLEGÓ CON SU CÓDIGO</Text>
            {referred.length === 0 ? (
              <Text style={styles.empty}>Todavía nadie.</Text>
            ) : (
              referred.map((x) => (
                <View key={x.alias + x.desde} style={styles.referredRow}>
                  <Text style={styles.cardTitle}>#{x.alias} · {x.email ?? 'sin correo'}</Text>
                  <Text style={styles.cardSub}>
                    {new Date(x.desde).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })} · plan {x.plan ?? '—'} ·{' '}
                    {x.estado ? `comisión ${money(Number(x.comision ?? 0), x.moneda ?? 'USD')} (${x.estado})` : 'aún no paga'}
                  </Text>
                </View>
              ))
            )}
            <GoldButton label="Editar" onPress={() => { setEditing(detail); setDetail(null); }} small />
          </>
        )}
      </Sheet>

      <PartnerForm
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </View>
  );
}

function PartnerForm({ value, onClose, onSaved }: { value: AdminReferrer | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const editing = value && value !== 'new' ? value : null;
  const [kind, setKind] = useState<'influencer' | 'marca'>('influencer');
  const [nombre, setNombre] = useState('');
  const [pct, setPct] = useState('5');
  const [activo, setActivo] = useState(true);
  const [contacto, setContacto] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [handle, setHandle] = useState('');
  const [notas, setNotas] = useState('');
  const [method, setMethod] = useState<'paypal' | 'banco' | ''>('');
  const [paypal, setPaypal] = useState('');
  const [banco, setBanco] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [tipo, setTipo] = useState('');
  const [titular, setTitular] = useState('');
  const [documento, setDocumento] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!value) return;
    const e = editing;
    setKind(e && e.kind === 'marca' ? 'marca' : 'influencer');
    setNombre(e?.nombre ?? '');
    setPct(String(e?.commission_pct ?? 5));
    setActivo(e?.activo ?? true);
    setContacto(e?.contacto ?? '');
    setPlataforma(e?.plataforma ?? '');
    setHandle(e?.handle ?? '');
    setNotas(e?.notas ?? '');
    setMethod(e?.payout_method ?? '');
    setPaypal(e?.payout_paypal ?? '');
    setBanco(e?.payout_banco ?? '');
    setCuenta(e?.payout_cuenta ?? '');
    setTipo(e?.payout_tipo_cuenta ?? '');
    setTitular(e?.payout_titular ?? '');
    setDocumento(e?.payout_documento ?? '');
  }, [value]);

  async function save() {
    const p = num(pct);
    if (!nombre.trim()) return Alert.alert('Falta el nombre', 'Escribe el nombre del socio.');
    if (isNaN(p) || p < 0 || p > 50) return Alert.alert('Porcentaje inválido', 'Escribe un porcentaje entre 0 y 50.');
    setSaving(true);
    const { error } = await supabase.rpc('admin_save_referrer', {
      p_id: editing?.id ?? null, p_kind: editing?.kind ?? kind, p_nombre: nombre, p_pct: p, p_activo: activo,
      p_contacto: contacto || null, p_plataforma: plataforma || null, p_handle: handle || null, p_notas: notas || null,
      p_method: method || null, p_paypal: paypal || null, p_banco: banco || null, p_cuenta: cuenta || null,
      p_tipo: tipo || null, p_titular: titular || null, p_documento: documento || null,
    });
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    onSaved();
  }

  const field = (label: string, v: string, set: (s: string) => void, placeholder = '', keyboard: 'default' | 'decimal-pad' | 'email-address' = 'default') => (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput style={styles.input} value={v} onChangeText={set} placeholder={placeholder} placeholderTextColor={colors.onDarkMuted} keyboardType={keyboard} autoCapitalize="none" accessibilityLabel={label} />
    </View>
  );

  return (
    <Sheet visible={!!value} onClose={onClose} title={editing ? 'Editar' : 'Nuevo socio'}>
      {!editing && (
        <View style={styles.chips}>
          <Chip label="Influencer" active={kind === 'influencer'} onPress={() => setKind('influencer')} />
          <Chip label="Marca" active={kind === 'marca'} onPress={() => setKind('marca')} />
        </View>
      )}
      {field('Nombre', nombre, setNombre, 'Ej. María Finanzas')}
      {field('Comisión % del primer pago', pct, setPct, '5', 'decimal-pad')}
      <View style={styles.chips}>
        <Chip label={activo ? 'Activo' : 'Pausado'} icon={activo ? 'check' : 'close'} active={activo} onPress={() => setActivo((v) => !v)} />
      </View>
      {(!editing || editing.kind !== 'usuario') && (
        <>
          {field('Contacto (correo o teléfono)', contacto, setContacto)}
          {field('Red o plataforma', plataforma, setPlataforma, 'Instagram, YouTube…')}
          {field('Usuario o enlace', handle, setHandle, '@usuario')}
        </>
      )}
      <FieldLabel>Cómo cobra</FieldLabel>
      <View style={styles.chips}>
        <Chip label="PayPal" active={method === 'paypal'} onPress={() => setMethod('paypal')} />
        <Chip label="Cuenta bancaria" active={method === 'banco'} onPress={() => setMethod('banco')} />
      </View>
      {method === 'paypal' && field('Correo de PayPal', paypal, setPaypal, 'cobro@correo.com', 'email-address')}
      {method === 'banco' && (
        <>
          {field('Banco', banco, setBanco, 'Banco Popular')}
          {field('Número de cuenta', cuenta, setCuenta)}
          {field('Tipo de cuenta', tipo, setTipo, 'Ahorros o corriente')}
          {field('Titular', titular, setTitular)}
          {field('Cédula o RNC (opcional)', documento, setDocumento)}
        </>
      )}
      {field('Notas', notas, setNotas)}
      <GoldButton label="Guardar" onPress={save} loading={saving} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '800', color: colors.goldBright },
  statLabel: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2 },
  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder },
  cardOn: { borderColor: colors.gold, backgroundColor: 'rgba(226,190,75,0.10)' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  cardSub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 2, lineHeight: 16 },
  cardAmt: { fontSize: 14, fontWeight: '800', color: colors.goldBright },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  link: { fontSize: 13, fontWeight: '700', color: colors.gold },
  referredRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.onDark,
  },
});
