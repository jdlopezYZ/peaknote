import { h, field } from '../core/dom.js';
import { repo } from '../core/db.js';

export default async function profile(ctx) {
  const p = ctx.account.profile ?? {};
  const nombre = field({ label: 'Tu nombre', value: p.nombre ?? '', autocomplete: 'name', maxlength: 80 });
  const plantel = field({ label: 'Plantel', value: p.plantel ?? '', maxlength: 100, hint: 'Nombre de la institución.' });
  const director = field({ label: 'Director(a) (opcional)', value: p.director ?? '', maxlength: 80, hint: 'Se usará en las firmas de los documentos.' });

  const submit = async (e) => {
    e.preventDefault();
    nombre.setError(nombre.value.trim() ? '' : 'Escribe tu nombre.');
    plantel.setError(plantel.value.trim() ? '' : 'Escribe el nombre del plantel.');
    if (!nombre.value.trim() || !plantel.value.trim()) return;
    await repo.account.save({ ...ctx.account, profile: { nombre: nombre.value.trim(), plantel: plantel.value.trim(), director: director.value.trim() } });
    ctx.navigate('/setup/grade');
  };

  const node = h(
    'main',
    { class: 'bare setup' },
    h(
      'div',
      { class: 'setup-card' },
      h('ol', { class: 'steps', 'aria-label': 'Progreso' }, h('li', { class: 'is-current', 'aria-current': 'step' }, 'Perfil'), h('li', null, 'Grado'), h('li', null, 'Estudiantes')),
      h('img', { class: 'setup-owl', src: 'assets/owl-book.webp', alt: '', width: 120, height: 120 }),
      h('h1', null, 'Cuéntanos de ti'),
      h('p', { class: 'lead' }, 'Solo lo necesario para tus documentos. Puedes cambiarlo en Ajustes.'),
      h('form', { class: 'form', onSubmit: submit, novalidate: true }, nombre.el, plantel.el, director.el, h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Continuar')),
    ),
  );
  return { title: 'Perfil', node, onMount: () => nombre.input.focus() };
}
