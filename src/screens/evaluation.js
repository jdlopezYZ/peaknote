/** Evaluación: cuadrícula estudiantes × 3 momentos (+ literal final manual). "Sin evaluar" es un estado propio. */
import { h, icon, button, field, modal, emptyState, toast } from '../core/dom.js';
import { repo } from '../core/db.js';
import { LITERALES, MOMENTOS, compareStudents, displayName, evalKey, evaluatedCount } from '../core/domain.js';
import { badge, literalSheet } from '../components/literal.js';

export default async function evaluation(ctx) {
  const grade = ctx.grade;
  const list = (await repo.students.listByGrade(grade.id)).sort(compareStudents);
  const ids = list.map((s) => s.id);
  const [evals, finals, obs] = await Promise.all([repo.evaluations.mapFor(ids), repo.finals.mapFor(ids), repo.observations.mapFor(ids)]);

  const node = h('section', { class: 'page' });
  if (!list.length) {
    node.append(
      emptyState({
        image: 'assets/owl-sleep.webp',
        title: 'Aún no hay estudiantes',
        text: 'Agrega tu matrícula para empezar a evaluar.',
        action: button({ label: 'Ir a Estudiantes', variant: 'primary', onClick: () => ctx.navigate('/estudiantes') }),
      }),
    );
    return { title: 'Evaluación', node };
  }

  const hasObs = (sid) => MOMENTOS.some((m) => obs.has(evalKey(sid, m)));
  const tbody = h('tbody');
  const headRow = h('tr');

  const legend = h(
    'details',
    { class: 'legend' },
    h('summary', null, 'Indicadores A–E'),
    h(
      'dl',
      null,
      ...LITERALES.flatMap((l) => [h('dt', null, badge(l, { size: 'sm' })), h('dd', null, (grade.indicadores?.[l] ?? '').trim() || h('em', { class: 'muted' }, 'Sin texto. Edítalo en Ajustes → Grados.'))]),
    ),
  );

  function pickLiteral(s, momento) {
    const isFinal = momento === 'final';
    literalSheet({
      title: isFinal ? 'Literal final del año' : `Momento ${momento}`,
      subtitle: displayName(s),
      current: isFinal ? finals.get(s.id) : evals.get(evalKey(s.id, momento)),
      indicadores: grade.indicadores,
      onPick: async (l) => {
        if (isFinal) {
          l ? finals.set(s.id, l) : finals.delete(s.id);
          await repo.finals.set(s.id, l);
        } else {
          l ? evals.set(evalKey(s.id, momento), l) : evals.delete(evalKey(s.id, momento));
          await repo.evaluations.set(s.id, momento, l);
        }
        paint();
      },
    });
  }

  function observations(s) {
    const fields = MOMENTOS.map((m) => field({ label: `Momento ${m}`, value: obs.get(evalKey(s.id, m)) ?? '', textarea: true, rows: 3, maxlength: 600 }));
    const mm = modal({
      title: 'Observaciones',
      content: h('div', { class: 'form' }, h('p', { class: 'dialog-text' }, displayName(s)), ...fields.map((f) => f.el)),
      footer: [
        button({ label: 'Cancelar', variant: 'ghost', onClick: () => mm.close() }),
        button({
          label: 'Guardar',
          variant: 'primary',
          onClick: async () => {
            for (const [i, m] of MOMENTOS.entries()) {
              const txt = fields[i].value.trim();
              txt ? obs.set(evalKey(s.id, m), txt) : obs.delete(evalKey(s.id, m));
              await repo.observations.set(s.id, m, txt);
            }
            mm.close();
            toast('Observaciones guardadas.', { kind: 'success' });
            paint();
          },
        }),
      ],
    });
  }

  function paint() {
    headRow.replaceChildren(
      h('th', { class: 'sticky', scope: 'col' }, 'Estudiante'),
      ...MOMENTOS.map((m) => h('th', { scope: 'col', 'aria-label': `Momento ${m}` }, h('span', { class: 'long' }, `Momento ${m}`), h('span', { class: 'short' }, `M${m}`), h('small', null, `${evaluatedCount(list, evals, m)}/${list.length}`))),
      h('th', { scope: 'col', title: 'Literal final del año (lo asigna el docente)' }, 'Final', h('small', null, `${list.filter((s) => finals.has(s.id)).length}/${list.length}`)),
    );
    tbody.replaceChildren(
      ...list.map((s, i) =>
        h(
          'tr',
          null,
          h(
            'th',
            { class: 'sticky', scope: 'row' },
            h('button', { type: 'button', class: 'name-btn', title: 'Observaciones', onClick: () => observations(s) }, h('span', { class: 'row-index' }, i + 1), h('span', { class: 'name' }, displayName(s)), hasObs(s.id) ? h('span', { class: 'dot', title: 'Tiene observaciones', role: 'img', 'aria-label': 'Tiene observaciones' }) : null),
          ),
          ...MOMENTOS.map((m) =>
            h('td', null, h('button', { type: 'button', class: 'cell-btn', 'aria-label': `${displayName(s)}, momento ${m}: ${evals.get(evalKey(s.id, m)) ?? 'sin evaluar'}`, onClick: () => pickLiteral(s, m) }, badge(evals.get(evalKey(s.id, m))))),
          ),
          h('td', { class: 'final-col' }, h('button', { type: 'button', class: 'cell-btn', 'aria-label': `${displayName(s)}, literal final: ${finals.get(s.id) ?? 'sin asignar'}`, onClick: () => pickLiteral(s, 'final') }, badge(finals.get(s.id)))),
        ),
      ),
    );
  }

  node.append(
    legend,
    h('p', { class: 'muted hint-line' }, icon('info', 16), ' Toca una celda para asignar el literal. Toca el nombre para escribir observaciones.'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'grid' }, h('thead', null, headRow), tbody)),
  );
  paint();
  return { title: 'Evaluación', node };
}
