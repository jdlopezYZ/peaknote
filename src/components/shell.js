/** Estructura de la app: panel lateral (☰ en móvil, fijo en PC, 250 px / 300 ms), barra superior y barra inferior móvil. */
import { h, icon, iconButton, modal, button } from '../core/dom.js';
import { repo } from '../core/db.js';
import { session } from '../core/session.js';
import { gradeLabel } from '../core/domain.js';

const NAV = [
  { key: 'home', href: '#/', label: 'Inicio', icon: 'home' },
  { key: 'asistencia', href: '#/asistencia', label: 'Asistencia', icon: 'check' },
  { key: 'evaluacion', href: '#/evaluacion', label: 'Evaluación', icon: 'grid' },
  { key: 'estudiantes', href: '#/estudiantes', label: 'Estudiantes', icon: 'users' },
  { key: 'documentos', href: '#/documentos', label: 'Documentos', icon: 'file' },
];

export function buildShell(ctx, active, screen) {
  const desktop = matchMedia('(min-width: 1024px)');
  const link = (n, cls) =>
    h('a', { href: n.href, class: `${cls}${n.key === active ? ' is-active' : ''}`, 'aria-current': n.key === active ? 'page' : null }, icon(n.icon, 20), h('span', null, n.label));

  const logout = () => {
    session.end();
    ctx.navigate('/login');
  };

  const sidebar = h(
    'aside',
    { class: 'sidebar', id: 'sidebar', 'aria-label': 'Menú principal' },
    h('div', { class: 'sidebar-brand' }, h('img', { src: 'assets/icons/icon-192.png', alt: '', width: 36, height: 36 }), h('span', null, 'PeakNote')),
    h('nav', { class: 'sidebar-nav' }, NAV.map((n) => link(n, 'nav-link'))),
    h(
      'div',
      { class: 'sidebar-foot' },
      link({ key: 'ajustes', href: '#/ajustes', label: 'Ajustes', icon: 'settings' }, 'nav-link'),
      h('button', { type: 'button', class: 'nav-link', onClick: logout }, icon('logout', 20), h('span', null, 'Cerrar sesión')),
      ctx.account?.profile?.plantel ? h('p', { class: 'sidebar-plantel' }, ctx.account.profile.plantel) : null,
    ),
  );
  const scrim = h('div', { class: 'scrim', onClick: () => setOpen(false) });

  const setOpen = (open) => {
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    syncInert();
  };
  const syncInert = () => {
    sidebar.inert = !desktop.matches && !sidebar.classList.contains('open');
  };
  desktop.addEventListener('change', () => {
    setOpen(false);
    syncInert();
  });
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener(
    'keydown',
    function esc(e) {
      if (!document.body.contains(sidebar)) return document.removeEventListener('keydown', esc);
      if (e.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
    },
  );

  const menuBtn = iconButton({ icon: 'menu', label: 'Abrir menú', className: 'menu-btn', onClick: () => setOpen(!sidebar.classList.contains('open')) });
  menuBtn.setAttribute('aria-controls', 'sidebar');
  menuBtn.setAttribute('aria-expanded', 'false');

  const gradeChip = ctx.grade
    ? ctx.grades.length > 1
      ? h('button', { type: 'button', class: 'chip chip-btn', onClick: () => pickGrade(ctx) }, h('span', null, gradeLabel(ctx.grade)), h('small', null, ctx.grade.anio), icon('chevron', 16))
      : h('span', { class: 'chip' }, h('span', null, gradeLabel(ctx.grade)), h('small', null, ctx.grade.anio))
    : null;

  const topbar = h(
    'header',
    { class: 'topbar' },
    menuBtn,
    h('h1', { class: 'topbar-title' }, screen.title),
    h('div', { class: 'topbar-actions' }, screen.actions ?? null, gradeChip),
  );

  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Secciones' }, NAV.map((n) => link(n, 'tab')));

  const root = h(
    'div',
    { class: 'app-shell' },
    sidebar,
    scrim,
    h('div', { class: 'main' }, topbar, h('main', { class: 'view', id: 'view', tabindex: -1 }, screen.node)),
    tabbar,
  );
  syncInert();
  return root;
}

function pickGrade(ctx) {
  const list = h('div', { class: 'list' });
  const m = modal({ title: 'Cambiar de grado', variant: 'sheet', content: list });
  ctx.grades.forEach((g) => {
    list.append(
      h(
        'button',
        {
          type: 'button',
          class: `list-row row-btn${g.id === ctx.grade.id ? ' is-selected' : ''}`,
          onClick: async () => {
            await repo.settings.set('currentGradeId', g.id);
            m.close();
            ctx.refresh();
          },
        },
        h('div', { class: 'row-main' }, h('strong', null, gradeLabel(g)), h('small', null, g.anio)),
        g.id === ctx.grade.id ? icon('check', 18) : null,
      ),
    );
  });
  list.append(button({ label: 'Nuevo grado', icon: 'plus', variant: 'ghost', onClick: () => { m.close(); ctx.navigate('/grado/nuevo'); } }));
}
