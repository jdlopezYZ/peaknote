/** Sesión local: vive en sessionStorage (al cerrar la pestaña/app se pide la contraseña otra vez). */
const KEY = 'pn.session';

export const session = {
  active() {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch {
      return memory;
    }
  },
  start() {
    memory = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {}
  },
  end() {
    memory = false;
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  },
};
let memory = false;

export function applyTheme(theme) {
  const t = theme === 'light' || theme === 'dark' ? theme : 'system';
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  try {
    localStorage.setItem('pn.theme', t);
  } catch {}
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) || t === 'system';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f3f8f7' : '#063737');
  return dark;
}

export function currentTheme() {
  try {
    return localStorage.getItem('pn.theme') || 'dark';
  } catch {
    return 'dark';
  }
}
