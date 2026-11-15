/**
 * Importadores de estudiantes (puros, sin DOM).
 *  - Pegar lista: una línea por niño. "Apellidos, Nombres[, Cédula]". Sin coma → todo va a "nombres".
 *  - CSV: con encabezado (nombres, apellidos, cedula) o sin él (nombres, apellidos, cedula).
 */

const strip = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function studentsFromLines(text) {
  const rows = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length === 1) rows.push({ nombres: parts[0], apellidos: '', cedula: '' });
    else rows.push({ apellidos: parts[0], nombres: parts[1] ?? '', cedula: parts[2] ?? '' });
  }
  return rows.filter((r) => r.nombres || r.apellidos);
}

/** Parser CSV mínimo con comillas. Detecta delimitador `,` `;` o tabulación. */
export function parseCSV(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t']
    .map((d) => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export function studentsFromCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const head = rows[0].map(strip);
  const find = (...names) => head.findIndex((h) => names.includes(h));
  const iN = find('nombres', 'nombre');
  const iA = find('apellidos', 'apellido');
  const iC = find('cedula', 'cedula escolar', 'ci', 'c.i.');
  const hasHeader = iN >= 0 || iA >= 0;
  const body = hasHeader ? rows.slice(1) : rows;
  const idx = hasHeader ? { n: iN, a: iA, c: iC } : { n: 0, a: 1, c: 2 };
  return body
    .map((r) => ({
      nombres: (r[idx.n] ?? '').trim(),
      apellidos: (r[idx.a] ?? '').trim(),
      cedula: (r[idx.c] ?? '').trim(),
    }))
    .filter((r) => r.nombres || r.apellidos);
}
