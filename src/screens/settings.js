/** Ajustes: perfil y plantel, grados, apariencia, seguridad, respaldo, instalación y datos. */
import { h, icon, field, button, modal, confirmDialog, segmented, toast } from '../core/dom.js';
import { repo } from '../core/db.js';
import { hashPassword, verifyPassword, cryptoAvailable } from '../core/crypto.js';
import { gradeLabel, validatePassword } from '../core/domain.js';
import { applyTheme, currentTheme, session } from '../core/session.js';
import { downloadBackup, restoreBackup } from '../core/backup-io.js';
import { isIOS, isStandalone, pwa, promptInstall, requestPersistence, storageStatus } from '../core/pwa.js';

const card = (title, ...children) => h('article', { class: 'card' }, h('h3', null, title), ...children);
const row = (label, desc, control) => h('div', { class: 'setting-row' }, h('div', null, h('strong', null, label), desc ? h('small', null, desc) : null), control);

export default async function settings(ctx) {
  const lastBackup = await repo.settings.get('lastBackup');
  const node = h('section', { class: 'page settings' });

  /* Perfil */
  const p = ctx.account.profile ?? {};
  node.append(
    card(
      'Docente y plantel',
      row('Docente', p.nombre, null),
      row('Plantel', p.plantel, null),
      row('Director(a)', p.director || 'Sin definir', null),
      button({ label: 'Editar', icon: 'edit', variant: 'secondary', onClick: () => editProfile(ctx) }),
    ),
  );

  /* Grados */
  const gradesList = h('div', { class: 'list' });
  ctx.grades.forEach((g) => {
    gradesList.append(
      h(
        'div',
        { class: 'list-row' },
        h('div', { class: 'row-main' }, h('strong', null, gradeLabel(g)), h('small', null, `Año escolar ${g.anio}${g.id === ctx.grade.id ? ' · actual' : ''}`)),
        button({ label: 'Editar', variant: 'ghost', onClick: () => ctx.navigate(`/grado/editar/${g.id}`) }),
        button({
          label: 'Eliminar',
          variant: 'ghost',
          className: 'danger-text',
          onClick: async () => {
            if (ctx.grades.length === 1) return toast('Debes mantener al menos un grado. Abre otro antes de eliminar este.', { kind: 'error', timeout: 5000 });
            const ok = await confirmDialog({ title: 'Eliminar grado', message: `Se eliminará ${gradeLabel(g)} (${g.anio}) con todos sus estudiantes, asistencias y calificaciones. No se puede deshacer.`, confirmLabel: 'Eliminar', danger: true });
            if (!ok) return;
            await repo.grades.remove(g.id);
            if (g.id === ctx.grade.id) await repo.settings.set('currentGradeId', ctx.grades.find((x) => x.id !== g.id).id);
            toast('Grado eliminado.');
            ctx.refresh();
          },
        }),
      ),
    );
  });
  node.append(card('Grados', gradesList, button({ label: 'Nuevo grado', icon: 'plus', variant: 'secondary', onClick: () => ctx.navigate('/grado/nuevo') })));

  /* Apariencia */
  node.append(
    card(
      'Apariencia',
      segmented({
        label: 'Tema',
        value: currentTheme(),
        options: [
          { value: 'dark', label: 'Oscuro' },
          { value: 'light', label: 'Claro' },
          { value: 'system', label: 'Sistema' },
        ],
        onChange: (v) => applyTheme(v),
      }),
    ),
  );

  /* Seguridad */
  node.append(
    card(
      'Seguridad',
      h('p', { class: 'muted' }, 'Tu contraseña es un bloqueo local: evita miradas curiosas, pero no cifra los datos. No se puede recuperar; usa el respaldo.'),
      button({ label: 'Cambiar contraseña', icon: 'lock', variant: 'secondary', onClick: () => changePassword(ctx) }),
    ),
  );

  /* Respaldo */
  node.append(
    card(
      'Respaldo',
      h('p', { class: 'muted' }, lastBackup ? `Último respaldo: ${new Date(lastBackup).toLocaleString('es-VE')}.` : 'Aún no has hecho un respaldo. Si borras los datos del navegador o pierdes el teléfono, se pierden tus calificaciones.'),
      h(
        'div',
        { class: 'row-actions' },
        button({ label: 'Exportar respaldo', icon: 'download', variant: 'primary', onClick: async () => { if (await downloadBackup()) ctx.refresh(); } }),
        button({ label: 'Restaurar', icon: 'upload', variant: 'secondary', onClick: async () => { if (await restoreBackup()) ctx.navigate('/login'); } }),
      ),
    ),
  );

  /* Instalación y almacenamiento */
  const installBox = h('div', { class: 'stack' });
  const storageLine = h('p', { class: 'muted' }, 'Calculando almacenamiento…');
  const persistBtn = button({ label: 'Proteger almacenamiento', variant: 'secondary', onClick: async () => { const ok = await requestPersistence(); toast(ok ? 'Almacenamiento protegido.' : 'El navegador no lo permitió. Instala la app para mejorar la protección.', { kind: ok ? 'success' : 'info', timeout: 5000 }); paintStorage(); } });
  const paintInstall = () => {
    installBox.replaceChildren();
    if (isStandalone()) installBox.append(h('p', { class: 'muted' }, 'PeakNote está instalada en este dispositivo.'));
    else if (pwa.installEvent) installBox.append(button({ label: 'Instalar PeakNote', icon: 'download', variant: 'primary', onClick: promptInstall }));
    else if (isIOS()) installBox.append(h('p', { class: 'muted' }, 'En iPhone/iPad: toca Compartir y luego "Añadir a pantalla de inicio".'));
    else installBox.append(h('p', { class: 'muted' }, 'Usa el menú del navegador → "Instalar aplicación" para tenerla como app.'));
  };
  const paintStorage = async () => {
    const s = await storageStatus();
    storageLine.textContent = `Almacenamiento ${s.persisted ? 'protegido' : 'sin proteger'} · ${(s.usage / 1024).toFixed(0)} KB usados.`;
    persistBtn.hidden = s.persisted || !navigator.storage?.persist;
  };
  paintInstall();
  paintStorage();
  const onPwa = () => paintInstall();
  pwa.listeners.add(onPwa);
  node.append(card('Instalación y almacenamiento', installBox, storageLine, persistBtn));

  /* Datos */
  node.append(
    card(
      'Zona delicada',
      h('p', { class: 'muted' }, 'Borra todo lo guardado en este dispositivo: cuenta, grados, estudiantes, asistencias y calificaciones.'),
      button({ label: 'Borrar todos los datos', icon: 'trash', variant: 'danger', onClick: () => wipe(ctx) }),
    ),
    h('p', { class: 'fineprint center' }, 'PeakNote V1.0 · PeakStudios® · Tus datos viven solo en este dispositivo.'),
  );

  return { title: 'Ajustes', node, onLeave: () => pwa.listeners.delete(onPwa) };
}

function editProfile(ctx) {
  const p = ctx.account.profile ?? {};
  const nombre = field({ label: 'Tu nombre', value: p.nombre ?? '', maxlength: 80 });
  const plantel = field({ label: 'Plantel', value: p.plantel ?? '', maxlength: 100 });
  const director = field({ label: 'Director(a) (opcional)', value: p.director ?? '', maxlength: 80 });
  const save = async (e) => {
    e?.preventDefault();
    nombre.setError(nombre.value.trim() ? '' : 'Escribe tu nombre.');
    plantel.setError(plantel.value.trim() ? '' : 'Escribe el plantel.');
    if (!nombre.value.trim() || !plantel.value.trim()) return;
    await repo.account.save({ ...ctx.account, profile: { nombre: nombre.value.trim(), plantel: plantel.value.trim(), director: director.value.trim() } });
    m.close();
    toast('Perfil actualizado.', { kind: 'success' });
    ctx.refresh();
  };
  const m = modal({
    title: 'Docente y plantel',
    content: h('form', { class: 'form', onSubmit: save, novalidate: true }, nombre.el, plantel.el, director.el, h('button', { type: 'submit', hidden: true })),
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Guardar', variant: 'primary', onClick: save })],
  });
}

function changePassword(ctx) {
  const cur = field({ label: 'Contraseña actual', type: 'password', autocomplete: 'current-password' });
  const n1 = field({ label: 'Nueva contraseña', type: 'password', autocomplete: 'new-password', hint: 'Mínimo 6 caracteres.' });
  const n2 = field({ label: 'Repetir nueva contraseña', type: 'password', autocomplete: 'new-password' });
  const save = async (e) => {
    e?.preventDefault();
    if (!cryptoAvailable()) return cur.setError('Este navegador no permite contraseñas seguras aquí (usa https o localhost).');
    if (!(await verifyPassword(cur.value, ctx.account))) return cur.setError('La contraseña actual no es correcta.');
    const err = validatePassword(n1.value);
    n1.setError(err);
    n2.setError(!err && n1.value !== n2.value ? 'Las contraseñas no coinciden.' : '');
    if (err || n1.value !== n2.value) return;
    await repo.account.save({ ...ctx.account, ...(await hashPassword(n1.value)) });
    m.close();
    toast('Contraseña actualizada.', { kind: 'success' });
  };
  const m = modal({
    title: 'Cambiar contraseña',
    content: h('form', { class: 'form', onSubmit: save, novalidate: true }, cur.el, n1.el, n2.el, h('button', { type: 'submit', hidden: true })),
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Guardar', variant: 'primary', onClick: save })],
  });
  cur.input.focus();
}

function wipe(ctx) {
  const conf = field({ label: 'Escribe BORRAR para confirmar', autocomplete: 'off', autocapitalize: 'characters' });
  const go = async () => {
    if (conf.value.trim().toUpperCase() !== 'BORRAR') return conf.setError('Escribe BORRAR tal cual.');
    await repo.wipe();
    session.end();
    m.close();
    toast('Todos los datos fueron borrados.');
    ctx.navigate('/welcome');
  };
  const m = modal({
    title: 'Borrar todos los datos',
    content: h('div', { class: 'form' }, h('p', { class: 'dialog-text' }, 'Esta acción no se puede deshacer. Si no tienes un respaldo, perderás todo.'), conf.el),
    footer: [button({ label: 'Cancelar', variant: 'ghost', onClick: () => m.close() }), button({ label: 'Borrar todo', variant: 'danger', onClick: go })],
  });
  conf.input.focus();
}

