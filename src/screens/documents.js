/** Documentos (V1): lista de calificaciones del grado en pantalla. Boleta y PDF llegan en una iteración posterior. */
import { h, icon, emptyState, button } from '../core/dom.js';
import { repo } from '../core/db.js';
import { MOMENTOS, attendanceTotals, compareStudents, displayName, evalKey } from '../core/domain.js';
import { badge } from '../components/literal.js';

export default async function documents(ctx) {
  const grade = ctx.grade;
  const list = (await repo.students.listByGrade(grade.id)).sort(compareStudents);
  const ids = list.map((s) => s.id);
  const [evals, finals, records] = await Promise.all([repo.evaluations.mapFor(ids), repo.finals.mapFor(ids), repo.attendance.listFor(ids)]);

  const soon = h(
    'article',
    { class: 'card card-soon' },
    icon('file', 24),
    h('div', null, h('h3', null, 'Boleta, matrícula y PDF'), h('p', { class: 'muted' }, 'Próximamente. Tus calificaciones, observaciones, asistencias e indicadores ya se guardan listos para generarlos.')),
  );

  const node = h('section', { class: 'page' }, soon);
  if (!list.length) {
    node.append(emptyState({ image: 'assets/owl-sleep.webp', title: 'Sin estudiantes todavía', action: button({ label: 'Ir a Estudiantes', variant: 'primary', onClick: () => ctx.navigate('/estudiantes') }) }));
    return { title: 'Documentos', node };
  }
  node.append(
    h('h2', { class: 'section-title' }, 'Lista de calificaciones'),
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        { class: 'grid grid-static' },
        h('thead', null, h('tr', null, h('th', { class: 'sticky', scope: 'col' }, 'Estudiante'), ...MOMENTOS.map((m) => h('th', { scope: 'col' }, `M${m}`)), h('th', { scope: 'col' }, 'Final'), h('th', { scope: 'col', title: 'Inasistencias (las justificadas no cuentan)' }, 'Inasist.'), h('th', { scope: 'col' }, 'Justif.'))),
        h(
          'tbody',
          null,
          ...list.map((s, i) => {
            const t = attendanceTotals(records.filter((r) => r.studentId === s.id));
            return h('tr', null, h('th', { class: 'sticky', scope: 'row' }, h('span', { class: 'row-index' }, i + 1), h('span', { class: 'name' }, displayName(s))), ...MOMENTOS.map((m) => h('td', null, badge(evals.get(evalKey(s.id, m)), { size: 'sm' }))), h('td', { class: 'final-col' }, badge(finals.get(s.id), { size: 'sm' })), h('td', { class: 'num' }, t.inasistencias), h('td', { class: 'num' }, t.justificada));
          }),
        ),
      ),
    ),
  );
  return { title: 'Documentos', node };
}
