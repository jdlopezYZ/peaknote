/**
 * Dominio puro de PeakNote V1 (sin DOM, sin IndexedDB). Se prueba con `node --test`.
 * Reglas: primaria venezolana · 3 momentos · literal A–E (uno por niño por momento)
 * · literal final manual · asistencia Presente/Ausente/Justificada (la justificada
 * NO cuenta como inasistencia). Sin calendario ni feriados en V1.
 */

export const LITERALES = Object.freeze(['A', 'B', 'C', 'D', 'E']);
export const MOMENTOS = Object.freeze([1, 2, 3]);
export const ESTADOS = Object.freeze({
  PRESENTE: 'presente',
  AUSENTE: 'ausente',
  JUSTIFICADA: 'justificada',
});
export const GRADOS = Object.freeze(['1.º', '2.º', '3.º', '4.º', '5.º', '6.º']);
/** Literales que marcan a un niño como "requiere atención" (V1: D y E). */
export const LITERALES_ATENCION = Object.freeze(['D', 'E']);

export const evalKey = (studentId, momento) => `${studentId}|${momento}`;
export const attKey = (studentId, fecha) => `${studentId}|${fecha}`;

/* ---------- Estudiantes ---------- */

export function displayName(s) {
  const a = (s.apellidos || '').trim();
  const n = (s.nombres || '').trim();
  return a && n ? `${a}, ${n}` : a || n;
}

export function compareStudents(x, y) {
  return displayName(x).localeCompare(displayName(y), 'es', { sensitivity: 'base' });
}

export function normalizeText(t) {
  return String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCedula(c) {
  return String(c ?? '').replace(/[\s.\-]/g, '').toUpperCase();
}

export function isSameStudent(a, b) {
  const ca = normalizeCedula(a.cedula);
  const cb = normalizeCedula(b.cedula);
  if (ca && cb) return ca === cb;
  if (!ca && !cb) return normalizeText(displayName(a)) === normalizeText(displayName(b));
  return false;
}

/** Separa los nuevos que se pueden añadir de los repetidos (por cédula o nombre exacto). */
export function mergeNewStudents(existing, incoming) {
  const toAdd = [];
  const skipped = [];
  for (const s of incoming) {
    const dup = existing.some((e) => isSameStudent(e, s)) || toAdd.some((e) => isSameStudent(e, s));
    (dup ? skipped : toAdd).push(s);
  }
  return { toAdd, skipped };
}

/* ---------- Validaciones ---------- */

export function validateUsername(u) {
  const v = String(u ?? '').trim();
  if (v.length < 3) return 'El usuario debe tener al menos 3 caracteres.';
  if (!/^[\w.@-]+$/.test(v)) return 'Usa solo letras, números, punto, guion o @.';
  return '';
}

export function validatePassword(p) {
  if (String(p ?? '').length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return '';
}

export function validateSection(s) {
  const v = String(s ?? '').trim();
  if (!v) return 'Escribe la sección (por ejemplo, A).';
  if (!/^[A-Za-z0-9_-]{1,10}$/.test(v)) return 'La sección admite letras, números, guion y guion bajo (máx. 10).';
  return '';
}

export function validateStudentInput({ nombres, apellidos, cedula }) {
  if (!String(nombres ?? '').trim() && !String(apellidos ?? '').trim()) {
    return 'Escribe al menos el nombre o el apellido.';
  }
  if (String(cedula ?? '').trim().length > 20) return 'La cédula escolar es demasiado larga.';
  return '';
}

/* ---------- Fechas ---------- */

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

/** El año escolar venezolano arranca en septiembre. Devuelve [{value,label}] y el actual. */
export function schoolYearOptions(now = new Date()) {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const label = (y) => `${y}-${y + 1}`;
  return { current: label(start), options: [start - 1, start, start + 1].map(label) };
}

export function gradeLabel(g) {
  return `${g.grado} ${g.seccion}`.trim();
}

/* ---------- Evaluación ---------- */

/** @param {Map<string,string>} evals clave `${studentId}|${momento}` → literal */
export function distribution(students, evals, momento) {
  const out = { A: 0, B: 0, C: 0, D: 0, E: 0, sinEvaluar: 0, total: students.length };
  for (const s of students) {
    const l = evals.get(evalKey(s.id, momento));
    if (LITERALES.includes(l)) out[l] += 1;
    else out.sinEvaluar += 1;
  }
  return out;
}

export function evaluatedCount(students, evals, momento) {
  return students.filter((s) => LITERALES.includes(evals.get(evalKey(s.id, momento)))).length;
}

/** Último momento (3→1) en el que hay al menos un literal. 0 si no hay ninguno. */
export function latestMomento(students, evals) {
  for (const m of [...MOMENTOS].reverse()) {
    if (evaluatedCount(students, evals, m) > 0) return m;
  }
  return 0;
}

/** Niños con D o E en el último momento evaluado. "Sin evaluar" NUNCA cuenta como atención. */
export function needsAttention(students, evals) {
  const momento = latestMomento(students, evals);
  if (!momento) return { momento: 0, items: [] };
  const items = [];
  for (const s of students) {
    const literal = evals.get(evalKey(s.id, momento));
    if (LITERALES_ATENCION.includes(literal)) items.push({ student: s, literal, momento });
  }
  return { momento, items };
}

/* ---------- Asistencia ---------- */

/** @param {Array<{estado:string}>} records */
export function attendanceTotals(records) {
  const t = { presente: 0, ausente: 0, justificada: 0, inasistencias: 0 };
  for (const r of records) {
    if (r.estado in t) t[r.estado] += 1;
  }
  // Regla confirmada: las justificadas se descuentan, solo las ausentes cuentan.
  t.inasistencias = t.ausente;
  return t;
}

/** Resumen de un día: marcados, sin marcar y conteo por estado. */
export function daySummary(students, attMap, fecha) {
  const t = { presente: 0, ausente: 0, justificada: 0, marcados: 0, sinMarcar: 0, total: students.length };
  for (const s of students) {
    const estado = attMap.get(attKey(s.id, fecha));
    if (estado && estado in t) {
      t[estado] += 1;
      t.marcados += 1;
    } else t.sinMarcar += 1;
  }
  return t;
}
