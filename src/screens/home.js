/** Inicio · Hoy: pasar lista, distribución por literal y niños que requieren atención. */
import { h, button, emptyState, formatLongDate } from '../core/dom.js';
import { repo } from '../core/db.js';
import { LITERALES, attKey, compareStudents, daySummary, displayName, distribution, latestMomento, needsAttention, todayISO } from '../core/domain.js';
import { badge } from '../components/literal.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default async function home(ctx) {
  const grade = ctx.grade;
  const list = (await repo.students.listByGrade(grade.id)).sort(compareStudents);
  const ids = list.map((s) => s.id);
  const [evals, records] = await Promise.all([repo.evaluations.mapFor(ids), repo.attendance.listFor(ids)]);
  const attMap = new Map(records.map((r) => [attKey(r.studentId, r.fecha), r.estado]));
  const today = todayISO();
  const name = ctx.account.profile?.nombre?.split(' ')[0] ?? '';

  const node = h('section', { class: 'page home' }, h('div', { class: 'hero' }, h('h2', null, `${greeting()}${name ? `, ${name}` : ''}`), h('p', { class: 'muted capitalize' }, formatLongDate(today))));

  if (!list.length) {
    node.append(
      emptyState({
        image: 'assets/owl-sleep.webp',
        title: 'Tu grado está esperando a sus niños',
        text: 'Carga la matrícula para pasar lista y evaluar.',
        action: button({ label: 'Cargar estudiantes', variant: 'primary', className: 'btn-lg', onClick: () => ctx.navigate('/estudiantes') }),
      }),
    );
    return { title: 'Inicio', node };
  }

  // Asistencia de hoy
  const d = daySummary(list, attMap, today);
  const pct = Math.round((d.marcados / d.total) * 100);
  node.append(
    h(
      'article',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', null, 'Asistencia de hoy'), h('span', { class: 'muted' }, `${d.marcados} de ${d.total}`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Lista de hoy' }, h('span', { style: { width: `${pct}%` } })),
      h('div', { class: 'chips' }, h('span', { class: 'stat stat-presente' }, h('b', null, d.presente), ' presentes'), h('span', { class: 'stat stat-ausente' }, h('b', null, d.ausente), ' ausentes'), h('span', { class: 'stat stat-justificada' }, h('b', null, d.justificada), ' justificadas')),
      button({ label: d.sinMarcar ? 'Pasar lista' : 'Revisar lista', variant: 'primary', onClick: () => ctx.navigate('/asistencia') }),
    ),
  );

  // Evaluación
  const m = latestMomento(list, evals);
  const dist = distribution(list, evals, m || 1);
  const evalCard = h('article', { class: 'card' }, h('div', { class: 'card-head' }, h('h3', null, 'Evaluación'), h('span', { class: 'muted' }, m ? `Momento ${m}` : 'Sin evaluar aún')));
  if (!m) {
    evalCard.append(h('p', { class: 'muted' }, 'Todavía no has asignado literales. Los niños sin evaluar no se cuentan como bajos.'));
  } else {
    const max = Math.max(1, ...LITERALES.map((l) => dist[l]));
    evalCard.append(
      h(
        'div',
        { class: 'bars', role: 'list' },
        ...LITERALES.map((l) =>
          h('div', { class: 'bar-row', role: 'listitem', 'aria-label': `Literal ${l}: ${dist[l]}` }, badge(l, { size: 'sm' }), h('div', { class: 'bar' }, h('span', { class: `bar-fill lit-fill-${l}`, style: { width: `${(dist[l] / max) * 100}%` } })), h('b', null, dist[l])),
        ),
      ),
      h('p', { class: 'muted' }, `${dist.sinEvaluar} sin evaluar`),
    );
  }
  evalCard.append(button({ label: 'Ir a evaluación', variant: 'secondary', onClick: () => ctx.navigate('/evaluacion') }));
  node.append(evalCard);

  // Requieren atención
  const att = needsAttention(list, evals);
  if (att.items.length) {
    node.append(
      h(
        'article',
        { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', null, 'Requieren atención'), h('span', { class: 'muted' }, `Momento ${att.momento}`)),
        h('div', { class: 'list' }, ...att.items.map((i) => h('div', { class: 'list-row' }, badge(i.literal, { size: 'sm' }), h('div', { class: 'row-main' }, h('strong', null, displayName(i.student)))))),
      ),
    );
  }
  return { title: 'Inicio', node };
}
