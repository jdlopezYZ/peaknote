import { h, button } from '../core/dom.js';
import { registerModal } from './login.js';
import { restoreBackup } from '../core/backup-io.js';

export default async function welcome(ctx) {
  const node = h(
    'main',
    { class: 'bare welcome' },
    h(
      'div',
      { class: 'welcome-card' },
      h('img', { class: 'welcome-owl', src: 'assets/owl-hero.webp', alt: 'Búho de PeakNote con birrete', width: 320, height: 320, fetchpriority: 'high' }),
      h('img', { class: 'brand-presenta', src: 'assets/title-presenta.webp', alt: 'PeakStudios presenta', width: 210, height: 24 }),
      h('img', { class: 'brand-title', src: 'assets/title-peaknote.webp', alt: 'PeakNote', width: 300, height: 80 }),
      h('p', { class: 'lead' }, 'Asistencia, calificaciones y matrícula de tu grado. Sin conexión y sin complicaciones.'),
      h(
        'div',
        { class: 'stack' },
        button({ label: 'Crear cuenta', variant: 'primary', className: 'btn-lg', onClick: () => registerModal(ctx) }),
        button({
          label: 'Restaurar desde respaldo',
          variant: 'ghost',
          onClick: async () => {
            if (await restoreBackup({ warnReplace: false })) ctx.navigate('/login');
          },
        }),
      ),
      h('p', { class: 'fineprint' }, 'Tus datos se guardan solo en este dispositivo.'),
    ),
  );
  return { title: 'Bienvenida', node };
}
