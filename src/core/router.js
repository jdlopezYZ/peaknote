/** Router por hash con guardas de acceso, carga perezosa de pantallas y transiciones de vista. */
import { repo } from './db.js';
import { session } from './session.js';
import { toast } from './dom.js';
import { buildShell } from '../components/shell.js';

const ROUTES = [
  { path: '/welcome', bare: true, load: () => import('../screens/welcome.js') },
  { path: '/login', bare: true, load: () => import('../screens/login.js') },
  { path: '/setup/profile', bare: true, load: () => import('../screens/profile.js') },
  { path: '/setup/grade', bare: true, load: () => import('../screens/grade-wizard.js') },
  { path: '/setup/students', bare: true, load: () => import('../screens/setup-students.js') },
  { path: '/grado/nuevo', bare: true, load: () => import('../screens/grade-wizard.js') },
  { path: '/grado/editar/:id', bare: true, load: () => import('../screens/grade-wizard.js') },
  { path: '/', nav: 'home', load: () => import('../screens/home.js') },
  { path: '/asistencia', nav: 'asistencia', load: () => import('../screens/attendance.js') },
  { path: '/evaluacion', nav: 'evaluacion', load: () => import('../screens/evaluation.js') },
  { path: '/estudiantes', nav: 'estudiantes', load: () => import('../screens/students.js') },
  { path: '/documentos', nav: 'documentos', load: () => import('../screens/documents.js') },
  { path: '/ajustes', nav: 'ajustes', load: () => import('../screens/settings.js') },
];

function match(hash) {
  const path = ('/' + hash.replace(/^#\/?/, '')).replace(/\/+$/, '') || '/';
  for (const r of ROUTES) {
    const rp = r.path.split('/');
    const pp = path.split('/');
    if (rp.length !== pp.length) continue;
    const params = {};
    const ok = rp.every((seg, i) => (seg.startsWith(':') ? ((params[seg.slice(1)] = decodeURIComponent(pp[i])), true) : seg === pp[i]));
    if (ok) return { route: r, params, path };
  }
  return null;
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) return render();
  if (replace) location.replace(target);
  else location.hash = target;
}

async function buildContext() {
  const account = await repo.account.get();
  const grades = account ? await repo.grades.list() : [];
  const currentId = await repo.settings.get('currentGradeId');
  const grade = grades.find((g) => g.id === currentId) ?? grades[0] ?? null;
  return { account, grades, grade, navigate, refresh: render, toast };
}

/** Devuelve la ruta a la que hay que redirigir, o null si el acceso es válido. */
function guard(ctx, path) {
  const open = path === '/welcome' || path === '/login';
  if (!ctx.account) return path === '/welcome' ? null : '/welcome';
  if (!session.active()) return path === '/login' ? null : '/login';
  if (open) return '/';
  if (!ctx.account.profile) return path === '/setup/profile' ? null : '/setup/profile';
  if (!ctx.grades.length) return path === '/setup/grade' ? null : '/setup/grade';
  return null;
}

const app = () => document.getElementById('app');
let token = 0;
let cleanup = null;

async function render() {
  const mine = ++token;
  const m = match(location.hash) ?? match('#/');
  let ctx;
  try {
    ctx = await buildContext();
  } catch (err) {
    console.error(err);
    app().replaceChildren(errorView('No se pudo abrir la base de datos local.', err));
    return;
  }
  if (mine !== token) return;
  const redirect = guard(ctx, m.path);
  if (redirect !== null) return navigate(redirect, { replace: true });

  ctx.params = m.params;
  ctx.path = m.path;
  const mod = await m.route.load();
  const screen = await mod.default(ctx);
  if (mine !== token) return;

  const root = m.route.bare ? screen.node : buildShell(ctx, m.route.nav, screen);
  const swap = () => {
    cleanup?.();
    cleanup = screen.onLeave ?? null;
    app().replaceChildren(root);
    app().dataset.layout = m.route.bare ? 'bare' : 'shell';
    document.title = screen.title ? `${screen.title} · PeakNote` : 'PeakNote';
    window.scrollTo(0, 0);
    screen.onMount?.();
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const vt = document.startViewTransition(swap);
    // Si el navegador omite o aborta la transición, la pantalla ya cambió: no es un error.
    vt.ready.catch(() => {});
    vt.finished.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
  } else swap();
}

function errorView(msg, err) {
  const d = document.createElement('div');
  d.className = 'fatal';
  d.innerHTML = '<h1>PeakNote</h1><p></p><small></small>';
  d.querySelector('p').textContent = msg;
  d.querySelector('small').textContent = String(err?.message ?? err);
  return d;
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  if (!location.hash) history.replaceState(null, '', '#/');
  render();
}
