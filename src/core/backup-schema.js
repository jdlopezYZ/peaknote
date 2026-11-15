/**
 * Formato y validación del archivo de respaldo. Puro (sin DOM ni IndexedDB).
 * `schemaVersion` se incrementa con cada cambio de estructura y se acompaña de una migración.
 */
import { ESTADOS, LITERALES, MOMENTOS } from './domain.js';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'peaknote';
export const COLLECTIONS = ['grades', 'students', 'evaluations', 'finals', 'observations', 'attendance'];

const isStr = (v) => typeof v === 'string';
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validateBackup(b) {
  const errors = [];
  const err = (m) => errors.length < 10 && errors.push(m);

  if (!isObj(b)) return { ok: false, errors: ['El archivo no tiene el formato esperado.'] };
  if (b.app !== APP_ID) err('El archivo no es un respaldo de PeakNote.');
  if (!Number.isInteger(b.schemaVersion) || b.schemaVersion < 1) err('Versión de respaldo no válida.');
  else if (b.schemaVersion > SCHEMA_VERSION) err('El respaldo es de una versión más nueva de PeakNote.');
  const d = b.data;
  if (!isObj(d)) {
    err('Faltan los datos del respaldo.');
    return { ok: false, errors };
  }
  for (const c of COLLECTIONS) if (!Array.isArray(d[c])) err(`Falta la colección "${c}".`);
  if (!Array.isArray(d.settings)) err('Falta la colección "settings".');
  if (errors.length) return { ok: false, errors };

  if (d.account != null && !(isObj(d.account) && isStr(d.account.username) && isStr(d.account.hash) && isStr(d.account.salt)))
    err('La cuenta del respaldo no es válida.');

  const gradeIds = new Set();
  d.grades.forEach((g, i) => {
    if (!isObj(g) || !isStr(g.id) || !isStr(g.grado) || !isStr(g.seccion) || !isStr(g.anio) || !isObj(g.indicadores))
      err(`Grado #${i + 1} no válido.`);
    else gradeIds.add(g.id);
  });
  const studentIds = new Set();
  d.students.forEach((s, i) => {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.gradeId)) err(`Estudiante #${i + 1} no válido.`);
    else if (!gradeIds.has(s.gradeId)) err(`Estudiante #${i + 1} apunta a un grado que no existe.`);
    else studentIds.add(s.id);
  });
  const ref = (list, name, check) =>
    list.forEach((r, i) => {
      if (!isObj(r) || !isStr(r.studentId) || !studentIds.has(r.studentId) || !check(r)) err(`${name} #${i + 1} no válido.`);
    });
  ref(d.evaluations, 'Evaluación', (r) => MOMENTOS.includes(r.momento) && LITERALES.includes(r.literal));
  ref(d.finals, 'Literal final', (r) => LITERALES.includes(r.literal));
  ref(d.observations, 'Observación', (r) => MOMENTOS.includes(r.momento) && isStr(r.texto));
  ref(d.attendance, 'Asistencia', (r) => ISO.test(r.fecha ?? '') && Object.values(ESTADOS).includes(r.estado));
  d.settings.forEach((s, i) => {
    if (!isObj(s) || !isStr(s.key)) err(`Ajuste #${i + 1} no válido.`);
  });
  return { ok: errors.length === 0, errors };
}

/** Punto de extensión: lleva respaldos antiguos a la versión actual. */
export function migrateBackup(b) {
  return b; // V1: no hay versiones previas.
}

export function buildBackup(data, now = new Date()) {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}
