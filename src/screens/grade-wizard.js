/** Asistente "Abrir grado": datos del grado (año escolar, grado, sección) + texto de los indicadores A–E. */
import { h, field, button, toast } from '../core/dom.js';
import { repo } from '../core/db.js';
import { GRADOS, LITERALES, schoolYearOptions, validateSection } from '../core/domain.js';

export default async function gradeWizard(ctx) {
  const firstTime = ctx.path === '/setup/grade';
  const editing = ctx.path.startsWith('/grado/editar/');
  const existing = editing ? ctx.grades.find((g) => g.id === ctx.params.id) : null;
  if (editing && !existing) {
    ctx.navigate('/ajustes', { replace: true });
    return { title: 'Grado', node: h('div') };
  }

  const { current, options } = schoolYearOptions();
  const years = existing && !options.includes(existing.anio) ? [existing.anio, ...options] : options;
  const anio = field({ label: 'Año escolar', select: years, value: existing?.anio ?? current });
  const grado = field({ label: 'Grado', select: GRADOS, value: existing?.grado ?? GRADOS[4] });
  const seccion = field({ label: 'Sección', value: existing?.seccion ?? '', maxlength: 10, placeholder: 'A', autocapitalize: 'characters', autocomplete: 'off' });
  const indicadores = Object.fromEntries(
    LITERALES.map((l) => [
      l,
      field({
        label: `Literal ${l}`,
        value: existing?.indicadores?.[l] ?? '',
        textarea: true,
        rows: 2,
        maxlength: 400,
        placeholder: l === 'A' ? 'Ej.: Logra los indicadores de manera sobresaliente…' : 'Texto del indicador (opcional ahora)',
      }),
    ]),
  );

  const step1 = h('form', { class: 'form', novalidate: true }, h('div', { class: 'grid-2' }, anio.el, grado.el), seccion.el);
  const step2 = h(
    'div',
    { class: 'form', hidden: true },
    h('p', { class: 'lead' }, 'Escribe lo que significa cada literal. Aparecerá junto a la calificación en tus documentos. Puedes completarlo después.'),
    ...LITERALES.map((l) => indicadores[l].el),
  );
  const stepsEl = h('ol', { class: 'steps', 'aria-label': 'Progreso' });
  const actions = h('div', { class: 'wizard-actions' });
  let step = 1;

  const paintSteps = () => {
    const labels = firstTime ? ['Perfil', 'Grado', 'Estudiantes'] : ['Datos del grado', 'Indicadores'];
    const idx = firstTime ? (step === 1 ? 1 : 1) : step - 1;
    stepsEl.replaceChildren(...labels.map((t, i) => h('li', { class: i === idx ? 'is-current' : i < idx ? 'is-done' : '', 'aria-current': i === idx ? 'step' : null }, t)));
  };

  const goto = (n) => {
    step = n;
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    h2.textContent = n === 1 ? (editing ? 'Editar grado' : 'Abrir grado') : 'Indicadores A–E';
    paintActions();
    paintSteps();
  };

  const next = async () => {
    if (step === 1) {
      const msg = validateSection(seccion.value);
      seccion.setError(msg);
      if (msg) return;
      const dup = ctx.grades.some((g) => g.id !== existing?.id && g.anio === anio.value && g.grado === grado.value && g.seccion.toLowerCase() === seccion.value.trim().toLowerCase());
      if (dup) return seccion.setError('Ya tienes ese grado y sección en ese año escolar.');
      return goto(2);
    }
    const saved = await repo.grades.save({
      ...existing,
      anio: anio.value,
      grado: grado.value,
      seccion: seccion.value.trim().toUpperCase(),
      indicadores: Object.fromEntries(LITERALES.map((l) => [l, indicadores[l].value.trim()])),
    });
    if (!editing) await repo.settings.set('currentGradeId', saved.id);
    toast(editing ? 'Grado actualizado.' : 'Grado abierto.', { kind: 'success' });
    ctx.navigate(firstTime ? '/setup/students' : editing ? '/ajustes' : '/');
  };

  const paintActions = () => {
    const back =
      step === 2
        ? button({ label: 'Atrás', variant: 'ghost', onClick: () => goto(1) })
        : !firstTime
          ? button({ label: 'Cancelar', variant: 'ghost', onClick: () => ctx.navigate(editing ? '/ajustes' : '/') })
          : null;
    actions.replaceChildren(...[back, button({ label: step === 1 ? 'Continuar' : editing ? 'Guardar cambios' : 'Abrir grado', variant: 'primary', className: 'btn-lg', onClick: next })].filter(Boolean));
  };
  step1.addEventListener('submit', (e) => {
    e.preventDefault();
    next();
  });

  const h2 = h('h1', null, editing ? 'Editar grado' : 'Abrir grado');
  const node = h(
    'main',
    { class: 'bare setup' },
    h('div', { class: 'setup-card wide' }, stepsEl, h('img', { class: 'setup-owl', src: 'assets/owl-folder.webp', alt: '', width: 120, height: 120 }), h2, step1, step2, actions),
  );
  paintActions();
  paintSteps();
  return { title: editing ? 'Editar grado' : 'Abrir grado', node, onMount: () => seccion.input.focus() };
}
