/** Estudiantes (matrícula del grado): búsqueda, agregar, editar, eliminar, importar. */
import { h, icon, iconButton, button, modal, confirmDialog, emptyState, toast } from '../core/dom.js';
import { repo } from '../core/db.js';
import { compareStudents, displayName, normalizeText } from '../core/domain.js';
import { importModal, studentModal } from '../components/student-forms.js';

export default async function students(ctx) {
  const gradeId = ctx.grade.id;
  let list = [];
  let query = '';

  const listEl = h('div', { class: 'list', role: 'list' });
  const countEl = h('p', { class: 'muted count', 'aria-live': 'polite' });
  const search = h('input', {
    class: 'input search-input',
    type: 'search',
    placeholder: 'Buscar por nombre o cédula',
    'aria-label': 'Buscar estudiante',
    onInput: (e) => {
      query = normalizeText(e.target.value);
      paint();
    },
  });

  const add = () => studentModal({ gradeId, onSaved: load });
  const imp = () => importModal({ gradeId, onDone: load });

  async function remove(s) {
    const ok = await confirmDialog({
      title: 'Eliminar estudiante',
      message: `Se eliminará a ${displayName(s)} junto con sus asistencias, calificaciones y observaciones. No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await repo.students.remove(s.id);
    toast('Estudiante eliminado.');
    load();
  }

  function rowMenu(s) {
    const m = modal({
      title: displayName(s),
      variant: 'sheet',
      content: h(
        'div',
        { class: 'list' },
        button({ label: 'Editar', icon: 'edit', variant: 'secondary', onClick: () => { m.close(); studentModal({ gradeId, student: s, onSaved: load }); } }),
        button({ label: 'Eliminar', icon: 'trash', variant: 'danger', onClick: () => { m.close(); remove(s); } }),
      ),
    });
  }

  function paint() {
    listEl.replaceChildren();
    countEl.textContent = `${list.length} estudiante${list.length === 1 ? '' : 's'}`;
    if (!list.length) {
      listEl.append(
        emptyState({
          image: 'assets/owl-sleep.webp',
          title: 'Aún no hay estudiantes',
          text: 'Agrega a tus niños uno por uno o importa toda la lista de una vez.',
          action: h('div', { class: 'row-actions' }, button({ label: 'Agregar estudiante', icon: 'plus', variant: 'primary', onClick: add }), button({ label: 'Importar', icon: 'upload', variant: 'secondary', onClick: imp })),
        }),
      );
      return;
    }
    const shown = query ? list.filter((s) => normalizeText(`${displayName(s)} ${s.cedula ?? ''}`).includes(query)) : list;
    if (!shown.length) {
      listEl.append(emptyState({ title: 'Sin resultados', text: 'Prueba con otro nombre o cédula.' }));
      return;
    }
    shown.forEach((s) => {
      const idx = list.indexOf(s) + 1;
      const row = h(
        'div',
        { class: 'list-row', role: 'listitem', onContextmenu: (e) => { e.preventDefault(); rowMenu(s); } },
        h('span', { class: 'row-index' }, idx),
        h('div', { class: 'row-main' }, h('strong', null, displayName(s)), s.cedula ? h('small', null, `C.E. ${s.cedula}`) : null),
        iconButton({ icon: 'more', label: `Opciones de ${displayName(s)}`, onClick: () => rowMenu(s) }),
      );
      listEl.append(row);
    });
  }

  async function load() {
    list = (await repo.students.listByGrade(gradeId)).sort(compareStudents);
    paint();
  }
  await load();

  const node = h(
    'section',
    { class: 'page' },
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', 18), search), button({ label: 'Importar', icon: 'upload', variant: 'secondary', onClick: imp })),
    countEl,
    listEl,
    h('button', { type: 'button', class: 'fab', 'aria-label': 'Agregar estudiante', onClick: add }, icon('plus', 26)),
  );
  return { title: 'Estudiantes', node };
}
