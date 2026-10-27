export function referralCodeFor(nombre: string): string {
  const base = (nombre || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'SALOMON';
  let hash = 0;
  const seed = nombre || 'amigo';
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return `${base}-${1000 + (hash % 9000)}`;
}

