import { h, icon, button } from '../core/dom.js';
import { repo } from '../core/db.js';
import { importModal, studentModal } from '../components/student-forms.js';
import { gradeLabel } from '../core/domain.js';

export default async function setupStudents(ctx) {
  const count = h('strong', null, '0');
  const countLine = h('p', { class: 'setup-count', 'aria-live': 'polite' }, count, ' estudiante(s) en ', gradeLabel(ctx.grade));
  const done = button({ label: 'Omitir por ahora', variant: 'ghost', className: 'btn-lg', onClick: () => ctx.navigate('/') });
  const doneWrap = h('div', { class: 'wizard-actions' }, done);

  const refresh = async () => {
    const n = (await repo.students.listByGrade(ctx.grade.id)).length;
    count.textContent = String(n);
    doneWrap.replaceChildren(button({ label: n ? 'Listo, ir al inicio' : 'Omitir por ahora', variant: n ? 'primary' : 'ghost', className: 'btn-lg', onClick: () => ctx.navigate('/') }));
  };

  const option = (ic, title, text, onClick) =>
    h('button', { type: 'button', class: 'option-card', onClick }, icon(ic, 24), h('span', null, h('strong', null, title), h('small', null, text)));

  const node = h(
    'main',
    { class: 'bare setup' },
    h(
      'div',
      { class: 'setup-card wide' },
      h('ol', { class: 'steps', 'aria-label': 'Progreso' }, h('li', { class: 'is-done' }, 'Perfil'), h('li', { class: 'is-done' }, 'Grado'), h('li', { class: 'is-current', 'aria-current': 'step' }, 'Estudiantes')),
      h('img', { class: 'setup-owl', src: 'assets/owl-book.webp', alt: '', width: 120, height: 120 }),
      h('h1', null, 'Carga tu matrícula'),
      h('p', { class: 'lead' }, 'Puedes hacerlo ahora o más tarde, cuando quieras, desde Estudiantes.'),
      h(
        'div',
        { class: 'option-grid' },
        option('plus', 'Agregar uno por uno', 'Nombres, apellidos y cédula escolar', () => studentModal({ gradeId: ctx.grade.id, onSaved: refresh })),
        option('note', 'Pegar una lista', 'Un niño por línea', () => importModal({ gradeId: ctx.grade.id, onDone: refresh })),
        option('upload', 'Importar CSV', 'Desde una hoja de cálculo', () => importModal({ gradeId: ctx.grade.id, onDone: refresh })),
      ),
      countLine,
      doneWrap,
    ),
  );
  await refresh();
  return { title: 'Estudiantes', node };
}
