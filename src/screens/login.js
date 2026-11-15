import { h, field, button, modal, toast } from '../core/dom.js';
import { repo } from '../core/db.js';
import { cryptoAvailable, hashPassword, verifyPassword } from '../core/crypto.js';
import { validatePassword, validateUsername } from '../core/domain.js';
import { session } from '../core/session.js';
import { restoreBackup } from '../core/backup-io.js';
import { requestPersistence } from '../core/pwa.js';

const NO_CRYPTO = 'Este navegador no permite crear contraseñas seguras aquí. Abre PeakNote desde https:// o desde localhost.';

export function registerModal(ctx) {
  const usuario = field({ label: 'Usuario', autocomplete: 'username', maxlength: 40, autocapitalize: 'none', spellcheck: false });
  const pass = field({ label: 'Contraseña', type: 'password', autocomplete: 'new-password', hint: 'Mínimo 6 caracteres.' });
  const pass2 = field({ label: 'Repetir contraseña', type: 'password', autocomplete: 'new-password' });
  const formErr = h('p', { class: 'field-error', role: 'alert' });
  let busy = false;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    formErr.textContent = '';
    const eu = validateUsername(usuario.value);
    const ep = validatePassword(pass.value);
    usuario.setError(eu);
    pass.setError(ep);
    pass2.setError(!ep && pass.value !== pass2.value ? 'Las contraseñas no coinciden.' : '');
    if (eu || ep || pass.value !== pass2.value) return;
    if (!cryptoAvailable()) return (formErr.textContent = NO_CRYPTO);
    busy = true;
    try {
      const secret = await hashPassword(pass.value);
      await repo.account.save({ username: usuario.value.trim(), ...secret, createdAt: Date.now(), profile: null });
      session.start();
      requestPersistence().catch(() => {});
      m.close();
      ctx.navigate('/setup/profile');
    } catch (err) {
      console.error(err);
      formErr.textContent = 'No se pudo crear la cuenta en este dispositivo.';
    } finally {
      busy = false;
    }
  };

  const m = modal({
    title: 'Crear una cuenta',
    titleImage: 'assets/title-cuenta.webp',
    content: h(
      'form',
      { class: 'form', onSubmit: submit, novalidate: true },
      h('img', { class: 'dialog-owl', src: 'assets/owl-login.webp', alt: '', width: 96, height: 137 }),
      usuario.el,
      pass.el,
      pass2.el,
      formErr,
      h('p', { class: 'fineprint' }, 'La cuenta vive solo en este dispositivo y funciona como bloqueo de la app: no recuperamos contraseñas. Haz respaldos desde Ajustes.'),
      h('button', { type: 'submit', hidden: true }),
    ),
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Crear cuenta', variant: 'primary', onClick: submit })],
  });
  usuario.input.focus();
}

export default async function login(ctx) {
  const usuario = field({ label: 'Usuario', value: ctx.account.username, autocomplete: 'username', autocapitalize: 'none', spellcheck: false });
  const pass = field({ label: 'Contraseña', type: 'password', autocomplete: 'current-password' });
  const formErr = h('p', { class: 'field-error', role: 'alert' });
  let busy = false;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    formErr.textContent = '';
    if (!cryptoAvailable()) return (formErr.textContent = NO_CRYPTO);
    busy = true;
    try {
      const okUser = usuario.value.trim().toLowerCase() === ctx.account.username.toLowerCase();
      const okPass = await verifyPassword(pass.value, ctx.account);
      if (!okUser || !okPass) {
        formErr.textContent = 'Usuario o contraseña incorrectos.';
        pass.input.select();
        return;
      }
      session.start();
      ctx.navigate('/');
    } catch (err) {
      console.error(err);
      formErr.textContent = 'No se pudo verificar la contraseña.';
    } finally {
      busy = false;
    }
  };

  const node = h(
    'main',
    { class: 'bare login' },
    h(
      'div',
      { class: 'login-card' },
      h('img', { class: 'login-owl', src: 'assets/owl-login.webp', alt: 'Búho de PeakNote escribiendo', width: 150, height: 214, fetchpriority: 'high' }),
      h('img', { class: 'brand-title brand-title-sm', src: 'assets/title-peaknote.webp', alt: 'PeakNote', width: 220, height: 58 }),
      h('form', { class: 'form', onSubmit: submit, novalidate: true }, usuario.el, pass.el, formErr, h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Entrar')),
      h(
        'div',
        { class: 'stack' },
        button({
          label: 'Restaurar desde respaldo',
          variant: 'ghost',
          onClick: async () => {
            if (await restoreBackup()) ctx.refresh();
          },
        }),
        h('p', { class: 'fineprint' }, 'Sin conexión necesaria. Tus datos viven solo en este dispositivo.'),
      ),
    ),
  );
  return { title: 'Iniciar sesión', node, onMount: () => (ctx.account.username ? pass.input.focus() : usuario.input.focus()) };
}

