// Parser mínimo que sí respeta comillas (el prototipo usaba line.split(',') y
// se rompía con columnas que traían comas dentro de comillas, como suelen
// venir los extractos bancarios).
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export interface CsvBankRow {
  fecha: string;
  descripcion: string;
  monto: number;
}

export function parseBankCsv(content: string): CsvBankRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const iFecha = header.indexOf('fecha');
  const iDesc = header.indexOf('descripcion');
  const iMonto = header.indexOf('monto');
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      fecha: (cols[iFecha] || '').trim(),
      descripcion: (cols[iDesc] || '').trim(),
      monto: Number(cols[iMonto] || 0),
    };
  });
}
