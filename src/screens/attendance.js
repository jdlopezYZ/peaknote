/** Asistencia: pasar lista por fecha con Presente / Ausente / Justificada. Guarda al instante. */
import { h, icon, iconButton, button, emptyState, formatLongDate } from '../core/dom.js';
import { repo } from '../core/db.js';
import { ESTADOS, attKey, attendanceTotals, compareStudents, daySummary, displayName, shiftISO, todayISO } from '../core/domain.js';

const OPTS = [
  { v: ESTADOS.PRESENTE, l: 'P', t: 'Presente' },
  { v: ESTADOS.AUSENTE, l: 'A', t: 'Ausente' },
  { v: ESTADOS.JUSTIFICADA, l: 'J', t: 'Justificada' },
];

let selected = todayISO(); // se recuerda al volver a la pantalla

export default async function attendance(ctx) {
  if (selected > todayISO()) selected = todayISO();
  const list = (await repo.students.listByGrade(ctx.grade.id)).sort(compareStudents);
  const records = await repo.attendance.listFor(list.map((s) => s.id));
  const attMap = new Map(records.map((r) => [attKey(r.studentId, r.fecha), r.estado]));

  const totalsFor = (sid) => attendanceTotals(records.filter((r) => r.studentId === sid));
  const rowsEl = h('div', { class: 'list', role: 'list' });
  const summaryEl = h('div', { class: 'chips', 'aria-live': 'polite' });
  const dateLabel = h('p', { class: 'date-label' });
  const dateInput = h('input', { class: 'input date-input', type: 'date', max: todayISO(), value: selected, 'aria-label': 'Fecha', onChange: (e) => e.target.value && setDate(e.target.value) });
  const todayBtn = button({ label: 'Hoy', variant: 'ghost', onClick: () => setDate(todayISO()) });
  const nextBtn = iconButton({ icon: 'right', label: 'Día siguiente', onClick: () => setDate(shiftISO(selected, 1)) });
  const markAll = button({ label: 'Todos presentes', icon: 'check', variant: 'secondary', onClick: markAllPresent });

  function setDate(iso) {
    selected = iso > todayISO() ? todayISO() : iso;
    paint();
  }

  async function setState(s, estado) {
    const key = attKey(s.id, selected);
    const prev = attMap.get(key);
    const next = prev === estado ? null : estado;
    const idx = records.findIndex((r) => r.studentId === s.id && r.fecha === selected);
    if (next) {
      attMap.set(key, next);
      if (idx >= 0) records[idx].estado = next;
      else records.push({ studentId: s.id, fecha: selected, estado: next });
    } else {
      attMap.delete(key);
      if (idx >= 0) records.splice(idx, 1);
    }
    paintRows(); // optimista: la UI responde al instante y luego se guarda
    paintSummary();
    await repo.attendance.set(s.id, selected, next);
  }

  async function markAllPresent() {
    const entries = list.filter((s) => !attMap.has(attKey(s.id, selected))).map((s) => ({ studentId: s.id, fecha: selected, estado: ESTADOS.PRESENTE }));
    if (!entries.length) return;
    for (const e of entries) {
      attMap.set(attKey(e.studentId, e.fecha), e.estado);
      records.push(e);
    }
    paintRows();
    paintSummary();
    await repo.attendance.setMany(entries);
  }

  function paintSummary() {
    const t = daySummary(list, attMap, selected);
    summaryEl.replaceChildren(
      h('span', { class: 'stat stat-presente' }, h('b', null, t.presente), ' presentes'),
      h('span', { class: 'stat stat-ausente' }, h('b', null, t.ausente), ' ausentes'),
      h('span', { class: 'stat stat-justificada' }, h('b', null, t.justificada), ' justificadas'),
      h('span', { class: 'stat' }, h('b', null, t.sinMarcar), ' sin marcar'),
    );
    markAll.disabled = t.sinMarcar === 0;
  }

  function paintRows() {
    rowsEl.replaceChildren(
      ...list.map((s, i) => {
        const cur = attMap.get(attKey(s.id, selected));
        const t = totalsFor(s.id);
        return h(
          'div',
          { class: 'list-row att-row', role: 'listitem' },
          h('span', { class: 'row-index' }, i + 1),
          h('div', { class: 'row-main' }, h('strong', null, displayName(s)), h('small', null, `Inasistencias ${t.inasistencias} · Justificadas ${t.justificada}`)),
          h(
            'div',
            { class: 'att-group', role: 'group', 'aria-label': `Asistencia de ${displayName(s)}` },
            OPTS.map((o) =>
              h('button', { type: 'button', class: `att-btn att-${o.v}`, 'aria-pressed': String(cur === o.v), 'aria-label': o.t, title: o.t, onClick: () => setState(s, o.v) }, o.l),
            ),
          ),
        );
      }),
    );
  }

  function paint() {
    dateInput.value = selected;
    dateLabel.textContent = formatLongDate(selected);
    nextBtn.disabled = selected >= todayISO();
    todayBtn.hidden = selected === todayISO();
    paintRows();
    paintSummary();
  }

  const node = h('section', { class: 'page' });
  if (!list.length) {
    node.append(
      emptyState({
        image: 'assets/owl-sleep.webp',
        title: 'No hay estudiantes para pasar lista',
        text: 'Primero agrega a tu matrícula.',
        action: button({ label: 'Ir a Estudiantes', variant: 'primary', onClick: () => ctx.navigate('/estudiantes') }),
      }),
    );
  } else {
    node.append(
      h('div', { class: 'toolbar date-bar' }, iconButton({ icon: 'left', label: 'Día anterior', onClick: () => setDate(shiftISO(selected, -1)) }), dateInput, nextBtn, todayBtn),
      dateLabel,
      summaryEl,
      h('div', { class: 'toolbar' }, markAll, h('p', { class: 'legend-inline muted' }, 'P presente · A ausente · J justificada (no cuenta como inasistencia)')),
      rowsEl,
    );
    paint();
  }
  return { title: 'Asistencia', node };
}

