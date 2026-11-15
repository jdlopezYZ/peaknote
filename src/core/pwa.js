/** Service worker, aviso de actualización, instalación y almacenamiento persistente. */
import { toast } from './dom.js';

export const pwa = { installEvent: null, listeners: new Set() };
const notify = () => pwa.listeners.forEach((fn) => fn());

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function promptInstall() {
  const ev = pwa.installEvent;
  if (!ev) return 'unavailable';
  ev.prompt();
  const { outcome } = await ev.userChoice;
  pwa.installEvent = null;
  notify();
  return outcome;
}

export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || (await navigator.storage.persist());
}

export async function storageStatus() {
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  const est = await navigator.storage?.estimate?.();
  return { persisted, usage: est?.usage ?? 0, quota: est?.quota ?? 0 };
}

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwa.installEvent = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    pwa.installEvent = null;
    notify();
    toast('PeakNote quedó instalada.', { kind: 'success' });
  });

  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const offerUpdate = (worker) =>
        toast('Hay una versión nueva de PeakNote.', {
          timeout: 0,
          action: { label: 'Actualizar', onClick: () => worker.postMessage('SKIP_WAITING') },
        });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
    } catch (err) {
      console.warn('No se pudo registrar el service worker:', err);
    }
  });
}
