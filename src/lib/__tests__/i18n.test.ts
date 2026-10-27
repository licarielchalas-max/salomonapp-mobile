import { compile, dateLocale, normKey, registerDictionary, setLang, tr, trPiece } from '../i18n';

registerDictionary('en', {
  'Guardar': 'Save',
  '💳 Pagar': 'Pay',
  'Monto (¤)': 'Amount (¤)',
  '{0} día{1} antes': '{0} day{1} before',
  'Eliminar "{0}"': 'Delete "{0}"',
  'Hoy': 'Today',
  'Vence {0}': 'Due {0}',
  '{#0} mes': '{0} month',
  'Meta del mes': 'Goal for the month',
});
registerDictionary('fr', {
  'Guardar': 'Enregistrer',
  '{0} día{1} antes': '{0} jour{1} avant',
});

afterEach(() => setLang('es'));

describe('idiomas', () => {
  it('el español no cambia nada', () => {
    expect(tr('Guardar')).toBe('Guardar');
    expect(trPiece(' Guardar ')).toBe(' Guardar ');
  });

  it('traduce textos exactos en inglés y francés', () => {
    setLang('en');
    expect(tr('Guardar')).toBe('Save');
    setLang('fr');
    expect(tr('Guardar')).toBe('Enregistrer');
  });

  it('ignora emojis y espacios sobrantes en las llaves', () => {
    setLang('en');
    expect(tr('Pagar')).toBe('Pay');
    expect(tr('  Pagar  ')).toBe('Pay');
    expect(normKey('💳  Pagar ')).toBe('Pagar');
  });

  it('si no hay traducción, muestra el texto en español', () => {
    setLang('en');
    expect(tr('Texto que no existe')).toBe('Texto que no existe');
    setLang('fr');
    expect(tr('Hoy')).toBe('Hoy');
  });

  it('traduce textos con datos conservando lo que cambia', () => {
    setLang('en');
    expect(tr('3 días antes')).toBe('3 days before');
    expect(tr('1 día antes')).toBe('1 day before');
    expect(tr('Eliminar "Luz"')).toBe('Delete "Luz"');
    setLang('fr');
    expect(tr('2 días antes')).toBe('2 jours avant');
  });

  it('traduce también el dato cuando es un texto conocido', () => {
    setLang('en');
    expect(tr('Vence Hoy')).toBe('Due Today');
  });

  it('respeta los espacios al traducir piezas de un texto', () => {
    setLang('en');
    expect(trPiece(' · Guardar ')).toBe(' · Guardar '); // la pieza completa no es una llave
    expect(trPiece(' Guardar ')).toBe(' Save ');
    expect(trPiece('   ')).toBe('   ');
  });

  it('mantiene el símbolo de moneda base para sustituirlo después', () => {
    setLang('en');
    expect(tr('Monto (¤)')).toBe('Amount (¤)');
  });

  it('usa el idioma para fechas', () => {
    expect(dateLocale()).toBe('es');
    setLang('en');
    expect(dateLocale()).toBe('en-US');
    setLang('fr');
    expect(dateLocale()).toBe('fr-FR');
  });

  it('los huecos con cifra no coinciden con textos escritos por la persona', () => {
    setLang('en');
    expect(tr('3 mes')).toBe('3 month');
    expect(tr('Gasto del mes')).toBe('Gasto del mes');
    expect(tr('Meta del mes')).toBe('Goal for the month');
  });

  it('compila llaves con caracteres especiales de expresiones regulares', () => {
    const c = compile({ '¿Eliminar (cuenta) {0}?': 'Delete (account) {0}?' });
    expect(c.patterns).toHaveLength(1);
    expect(c.patterns[0].re.test('¿Eliminar (cuenta) Banco?')).toBe(true);
  });
});
