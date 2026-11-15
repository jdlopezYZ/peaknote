import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as D from '../src/core/domain.js';
import { parseCSV, studentsFromCSV, studentsFromLines } from '../src/core/importers.js';
import { buildBackup, migrateBackup, validateBackup } from '../src/core/backup-schema.js';

const S = (id, apellidos, nombres, cedula = '') => ({ id, apellidos, nombres, cedula });

test('sin evaluar NO cuenta como literal bajo ni como atención', () => {
  const list = [S('1', 'Pérez', 'Ana'), S('2', 'Gómez', 'Luis'), S('3', 'Díaz', 'Eva')];
  const evals = new Map([[D.evalKey('1', 1), 'A']]);
  const dist = D.distribution(list, evals, 1);
  assert.equal(dist.A, 1);
  assert.equal(dist.sinEvaluar, 2);
  assert.equal(dist.D + dist.E, 0);
  assert.deepEqual(D.needsAttention(list, evals).items, []);
});

test('requieren atención: D/E del último momento evaluado', () => {
  const list = [S('1', 'A', 'a'), S('2', 'B', 'b'), S('3', 'C', 'c')];
  const evals = new Map([
    [D.evalKey('1', 1), 'E'], // momento 1 no cuenta: ya hay datos en el 2
    [D.evalKey('1', 2), 'B'],
    [D.evalKey('2', 2), 'D'],
    [D.evalKey('3', 2), 'E'],
  ]);
  assert.equal(D.latestMomento(list, evals), 2);
  const { momento, items } = D.needsAttention(list, evals);
  assert.equal(momento, 2);
  assert.deepEqual(items.map((i) => [i.student.id, i.literal]), [['2', 'D'], ['3', 'E']]);
});

test('latestMomento es 0 sin evaluaciones', () => {
  assert.equal(D.latestMomento([S('1', 'A', 'a')], new Map()), 0);
});

test('asistencia: las justificadas no cuentan como inasistencia', () => {
  const t = D.attendanceTotals([
    { estado: 'presente' }, { estado: 'ausente' }, { estado: 'ausente' }, { estado: 'justificada' },
  ]);
  assert.equal(t.inasistencias, 2);
  assert.equal(t.justificada, 1);
  assert.equal(t.presente, 1);
});

test('resumen del día', () => {
  const list = [S('1', 'A', 'a'), S('2', 'B', 'b'), S('3', 'C', 'c')];
  const att = new Map([[D.attKey('1', '2026-11-14'), 'presente'], [D.attKey('2', '2026-11-14'), 'justificada']]);
  const r = D.daySummary(list, att, '2026-11-14');
  assert.deepEqual([r.presente, r.justificada, r.ausente, r.sinMarcar, r.marcados], [1, 1, 0, 1, 2]);
});

test('fechas: hoy local y desplazamiento', () => {
  assert.equal(D.todayISO(new Date(2026, 10, 14)), '2026-11-14');
  assert.equal(D.shiftISO('2026-11-30', 1), '2026-12-01');
  assert.equal(D.shiftISO('2026-01-01', -1), '2025-12-31');
});

test('año escolar arranca en septiembre', () => {
  assert.equal(D.schoolYearOptions(new Date(2026, 10, 14)).current, '2026-2027');
  assert.equal(D.schoolYearOptions(new Date(2027, 2, 1)).current, '2026-2027');
  assert.equal(D.schoolYearOptions(new Date(2026, 7, 31)).current, '2025-2026');
});

test('validaciones', () => {
  assert.ok(D.validatePassword('12345'));
  assert.equal(D.validatePassword('123456'), '');
  assert.ok(D.validateUsername('ab'));
  assert.equal(D.validateUsername('maria.p'), '');
  assert.ok(D.validateUsername('con espacio'));
  assert.equal(D.validateSection('A'), '');
  assert.ok(D.validateSection('A B'));
  assert.ok(D.validateSection(''));
  assert.ok(D.validateStudentInput({ nombres: '', apellidos: '' }));
  assert.equal(D.validateStudentInput({ nombres: 'Ana', apellidos: '' }), '');
});

test('nombre y orden en español', () => {
  assert.equal(D.displayName(S('1', 'Pérez', 'Ana')), 'Pérez, Ana');
  assert.equal(D.displayName(S('1', '', 'Carla Díaz')), 'Carla Díaz');
  const sorted = [S('1', 'Zambrano', 'a'), S('2', 'Ávila', 'b'), S('3', 'Barrios', 'c')].sort(D.compareStudents);
  assert.deepEqual(sorted.map((s) => s.apellidos), ['Ávila', 'Barrios', 'Zambrano']);
});

test('duplicados por cédula o por nombre exacto sin cédula', () => {
  const existing = [S('1', 'Pérez', 'Ana', 'V-30.123.456'), S('2', 'Gómez', 'Luis')];
  const incoming = [
    { apellidos: 'Otra', nombres: 'Persona', cedula: 'v30123456' }, // misma cédula normalizada
    { apellidos: 'gomez', nombres: 'luis', cedula: '' }, // mismo nombre sin cédula
    { apellidos: 'Nuevo', nombres: 'Niño', cedula: '' },
    { apellidos: 'Nuevo', nombres: 'Niño', cedula: '' }, // repetido dentro de la lista
  ];
  const { toAdd, skipped } = D.mergeNewStudents(existing, incoming);
  assert.equal(toAdd.length, 1);
  assert.equal(skipped.length, 3);
});

test('importar: pegar lista', () => {
  const rows = studentsFromLines('Pérez Gómez, Ana María\n\nRodríguez, Luis, 30123456\nCarla Díaz\n');
  assert.deepEqual(rows[0], { apellidos: 'Pérez Gómez', nombres: 'Ana María', cedula: '' });
  assert.deepEqual(rows[1], { apellidos: 'Rodríguez', nombres: 'Luis', cedula: '30123456' });
  assert.deepEqual(rows[2], { apellidos: '', nombres: 'Carla Díaz', cedula: '' });
  assert.equal(rows.length, 3);
});

test('importar: CSV con encabezado, comillas y ;', () => {
  const csv = '﻿Apellidos;Nombres;Cédula\r\n"Pérez; Gómez";Ana;123\r\nDíaz;"Eva ""Evi"""\r\n';
  const rows = studentsFromCSV(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { apellidos: 'Pérez; Gómez', nombres: 'Ana', cedula: '123' });
  assert.equal(rows[1].nombres, 'Eva "Evi"');
});

test('importar: CSV sin encabezado = nombres, apellidos, cédula', () => {
  const rows = studentsFromCSV('Ana,Pérez,99\nLuis,Gómez,');
  assert.deepEqual(rows[0], { nombres: 'Ana', apellidos: 'Pérez', cedula: '99' });
  assert.equal(rows.length, 2);
  assert.equal(parseCSV('').length, 0);
});

const goodBackup = () =>
  buildBackup({
    account: { username: 'doc', hash: 'h', salt: 's', profile: null },
    settings: [{ key: 'currentGradeId', value: 'g1' }],
    grades: [{ id: 'g1', anio: '2026-2027', grado: '5.º', seccion: 'A', indicadores: { A: 'x' } }],
    students: [{ id: 's1', gradeId: 'g1', nombres: 'Ana', apellidos: 'P' }],
    evaluations: [{ studentId: 's1', momento: 1, literal: 'A' }],
    finals: [{ studentId: 's1', literal: 'B' }],
    observations: [{ studentId: 's1', momento: 2, texto: 'Bien' }],
    attendance: [{ studentId: 's1', fecha: '2026-11-14', estado: 'justificada' }],
  });

test('respaldo válido pasa la validación y sobrevive a JSON', () => {
  const b = migrateBackup(JSON.parse(JSON.stringify(goodBackup())));
  assert.deepEqual(validateBackup(b), { ok: true, errors: [] });
});

test('respaldo inválido: literal, momento, estado, referencias, versión y app', () => {
  const bad = (mut) => {
    const b = goodBackup();
    mut(b);
    return validateBackup(b);
  };
  assert.equal(bad((b) => (b.data.evaluations[0].literal = 'Z')).ok, false);
  assert.equal(bad((b) => (b.data.evaluations[0].momento = 4)).ok, false);
  assert.equal(bad((b) => (b.data.attendance[0].estado = 'tarde')).ok, false);
  assert.equal(bad((b) => (b.data.attendance[0].fecha = '14/11/2026')).ok, false);
  assert.equal(bad((b) => (b.data.students[0].gradeId = 'nope')).ok, false);
  assert.equal(bad((b) => (b.data.finals[0].studentId = 'nope')).ok, false);
  assert.equal(bad((b) => (b.schemaVersion = 99)).ok, false);
  assert.equal(bad((b) => (b.app = 'otra')).ok, false);
  assert.equal(bad((b) => delete b.data.grades).ok, false);
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup('texto').ok, false);
});

test('service worker precachea todos los archivos de la app', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const expected = ['index.html', 'manifest.webmanifest', ...walk(join(root, 'src')), ...walk(join(root, 'assets'))]
    .map((f) => (f.startsWith(root) ? relative(root, f) : f).split(sep).join('/'))
    .map((f) => `./${f}`);
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  for (const f of expected) assert.ok(sw.includes(`"${f}"`), `Falta en PRECACHE (ejecuta npm run sw): ${f}`);
});
