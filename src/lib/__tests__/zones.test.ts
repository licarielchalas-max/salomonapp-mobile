import { DEFAULT_COUNTRY, isDominicanRepublic, zoneKey, zoneMatch } from '../zones';

describe('zonas', () => {
  it('compara países y ciudades sin acentos ni mayúsculas', () => {
    expect(zoneKey('  Bávaro ')).toBe('bavaro');
    expect(zoneKey('República Dominicana')).toBe('republica dominicana');
    expect(zoneKey(null)).toBe('');
  });

  it('reconoce República Dominicana, incluso sin país guardado', () => {
    expect(isDominicanRepublic(undefined)).toBe(true);
    expect(isDominicanRepublic('república dominicana')).toBe(true);
    expect(isDominicanRepublic('España')).toBe(false);
  });

  it('una oferta sin zona sirve en cualquier lugar', () => {
    expect(zoneMatch({}, { pais: 'España', ciudad: '' })).toBe(1);
  });

  it('una oferta de un país solo se muestra en ese país', () => {
    const offer = { paises: [DEFAULT_COUNTRY] };
    expect(zoneMatch(offer, { pais: 'República Dominicana', ciudad: '' })).toBe(2);
    expect(zoneMatch(offer, { pais: null, ciudad: null })).toBe(2);
    expect(zoneMatch(offer, { pais: 'España', ciudad: '' })).toBe(0);
  });

  it('una oferta de una ciudad se muestra solo a quien vive allí y se prioriza', () => {
    const offer = { paises: [DEFAULT_COUNTRY], ciudades: ['Punta Cana'] };
    expect(zoneMatch(offer, { pais: DEFAULT_COUNTRY, ciudad: 'punta cana' })).toBe(3);
    expect(zoneMatch(offer, { pais: DEFAULT_COUNTRY, ciudad: 'Santiago' })).toBe(0);
    expect(zoneMatch(offer, { pais: DEFAULT_COUNTRY, ciudad: '' })).toBe(0);
  });
});
