/** Modales de matrícula: agregar/editar estudiante e importar (pegar lista o CSV). */
import { h, modal, field, button, toast, segmented } from '../core/dom.js';
import { repo } from '../core/db.js';
import { displayName, mergeNewStudents, validateStudentInput } from '../core/domain.js';
import { studentsFromCSV, studentsFromLines } from '../core/importers.js';

export function studentModal({ gradeId, student, onSaved }) {
  const editing = !!student;
  const nombres = field({ label: 'Nombres', value: student?.nombres ?? '', autocomplete: 'off', maxlength: 80, required: true });
  const apellidos = field({ label: 'Apellidos', value: student?.apellidos ?? '', autocomplete: 'off', maxlength: 80 });
  const cedula = field({ label: 'Cédula escolar (opcional)', value: student?.cedula ?? '', autocomplete: 'off', maxlength: 20, inputmode: 'text' });

  const save = async (e) => {
    e?.preventDefault();
    const data = { nombres: nombres.value.trim(), apellidos: apellidos.value.trim(), cedula: cedula.value.trim() };
    const msg = validateStudentInput(data);
    if (msg) return nombres.setError(msg);
    const siblings = await repo.students.listByGrade(gradeId);
    const { skipped } = mergeNewStudents(siblings.filter((s) => s.id !== student?.id), [data]);
    if (skipped.length) return cedula.setError('Ya existe un estudiante igual en este grado.');
    const saved = await repo.students.save({ ...student, ...data, gradeId });
    m.close();
    toast(editing ? 'Cambios guardados.' : `${displayName(saved)} fue añadido.`, { kind: 'success' });
    onSaved?.(saved);
  };

  const form = h('form', { class: 'form', onSubmit: save, novalidate: true }, apellidos.el, nombres.el, cedula.el, h('button', { type: 'submit', hidden: true }));
  const m = modal({
    title: editing ? 'Editar estudiante' : 'Agregar estudiante',
    content: form,
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Guardar', variant: 'primary', onClick: save })],
  });
  (editing ? nombres : apellidos).input.focus();
  return m;
}

export async function importModal({ gradeId, onDone }) {
  const existing = await repo.students.listByGrade(gradeId);
  let mode = 'lista';
  let rows = [];

  const area = h('textarea', { class: 'input', rows: 8, placeholder: 'Pérez Gómez, Ana María\nRodríguez, Luis Carlos, 30123456\nCarla Díaz' });
  const fileInput = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', class: 'input' });
  const preview = h('p', { class: 'field-hint', 'aria-live': 'polite' });
  const err = h('p', { class: 'field-error', role: 'alert' });

  const hintList = h('p', { class: 'field-hint' }, 'Una línea por niño: ', h('b', null, 'Apellidos, Nombres'), ' (y opcionalmente ', h('b', null, ', Cédula'), '). Sin coma, el texto completo se guarda como nombre.');
  const hintCsv = h('p', { class: 'field-hint' }, 'Archivo .csv con columnas ', h('b', null, 'apellidos, nombres, cedula'), ' (con o sin encabezado; sin encabezado el orden es nombres, apellidos, cédula). Acepta , ; o tabulación.');
  const listBox = h('div', { class: 'field' }, h('label', null, 'Lista de estudiantes'), area, hintList);
  const csvBox = h('div', { class: 'field', hidden: true }, h('label', null, 'Archivo CSV'), fileInput, hintCsv);

  const update = () => {
    err.textContent = '';
    if (!rows.length) preview.textContent = '';
    else {
      const { toAdd, skipped } = mergeNewStudents(existing, rows);
      preview.textContent = `${toAdd.length} para añadir${skipped.length ? ` · ${skipped.length} repetido(s) se omitirán` : ''}.`;
    }
  };
  area.addEventListener('input', () => {
    rows = studentsFromLines(area.value);
    update();
  });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) {
      rows = [];
      err.textContent = 'El archivo es demasiado grande (máx. 2 MB).';
      return;
    }
    rows = studentsFromCSV(await f.text());
    update();
    if (!rows.length) err.textContent = 'No se encontraron estudiantes en el archivo.';
  });

  const tabs = segmented({
    label: 'Método de importación',
    value: 'lista',
    options: [
      { value: 'lista', label: 'Pegar lista' },
      { value: 'csv', label: 'Archivo CSV' },
    ],
    onChange: (v) => {
      mode = v;
      listBox.hidden = v !== 'lista';
      csvBox.hidden = v !== 'csv';
      rows = v === 'lista' ? studentsFromLines(area.value) : fileInput.files?.length ? rows : [];
      update();
    },
  });

  const doImport = async () => {
    const { toAdd, skipped } = mergeNewStudents(existing, rows);
    if (!toAdd.length) {
      err.textContent = rows.length ? 'Todos los estudiantes ya estaban en el grado.' : 'No hay nada que importar todavía.';
      return;
    }
    await repo.students.saveMany(toAdd.map((r) => ({ ...r, gradeId })));
    m.close();
    toast(`${toAdd.length} estudiante(s) añadidos${skipped.length ? `, ${skipped.length} repetido(s) omitidos` : ''}.`, { kind: 'success' });
    onDone?.();
  };

  const m = modal({
    title: 'Importar estudiantes',
    content: h('div', { class: 'form' }, tabs, listBox, csvBox, preview, err),
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Importar', variant: 'primary', onClick: doImport })],
  });
  area.focus();
  return m;
}
