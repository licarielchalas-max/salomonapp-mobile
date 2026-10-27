// Zona de la persona: país y ciudad. Sirve para mostrar en el Marketplace los productos y las
// ofertas disponibles donde vive. Solo se guarda el país y la ciudad que ella escribe, nunca su ubicación exacta.

export const DEFAULT_COUNTRY = 'República Dominicana';

export const COUNTRIES = [
  'República Dominicana',
  'Estados Unidos',
  'Puerto Rico',
  'España',
  'México',
  'Colombia',
  'Panamá',
  'Venezuela',
  'Haití',
  'Canadá',
  'Francia',
  'Italia',
  'Reino Unido',
  'Alemania',
  'Brasil',
  'Argentina',
  'Chile',
  'Perú',
  'Ecuador',
  'Costa Rica',
  'Otro país',
] as const;

/** Ciudades sugeridas de República Dominicana (la persona puede escribir cualquier otra). */
export const DR_CITIES = [
  'Santo Domingo',
  'Santiago',
  'Punta Cana',
  'Bávaro',
  'La Romana',
  'San Pedro de Macorís',
  'Puerto Plata',
  'Sosúa',
  'Samaná',
  'Las Terrenas',
  'Jarabacoa',
  'La Vega',
  'San Cristóbal',
  'Higüey',
  'San Francisco de Macorís',
  'Boca Chica',
] as const;

export function isDominicanRepublic(country: string | null | undefined): boolean {
  return (country ?? DEFAULT_COUNTRY).trim().toLowerCase() === DEFAULT_COUNTRY.toLowerCase();
}

/** Normaliza un texto para comparar zonas: sin acentos, en minúsculas. */
export function zoneKey(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export interface ZoneScoped {
  /** Países donde está disponible (vacío o ausente = en todas partes). */
  paises?: string[];
  /** Ciudades donde está disponible (vacío o ausente = en todo el país). */
  ciudades?: string[];
}

export interface UserZone {
  pais: string | null | undefined;
  ciudad: string | null | undefined;
}

/**
 * Qué tan cerca está una oferta de la persona:
 *  3 = en su ciudad, 2 = en su país, 1 = disponible en todas partes, 0 = no está disponible donde vive.
 */
export function zoneMatch(item: ZoneScoped, zone: UserZone): 0 | 1 | 2 | 3 {
  const countries = (item.paises ?? []).map(zoneKey);
  const cities = (item.ciudades ?? []).map(zoneKey);
  const pais = zoneKey(zone.pais ?? DEFAULT_COUNTRY);
  const ciudad = zoneKey(zone.ciudad);

  if (countries.length === 0 && cities.length === 0) return 1;
  if (countries.length > 0 && !countries.includes(pais)) return 0;
  if (cities.length === 0) return 2;
  return ciudad && cities.includes(ciudad) ? 3 : 0;
}
