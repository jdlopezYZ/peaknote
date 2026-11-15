/** Exportar/restaurar respaldo (archivo JSON). Todo ocurre en el dispositivo. */
import { repo } from './db.js';
import { migrateBackup, validateBackup } from './backup-schema.js';
import { todayISO } from './domain.js';
import { confirmDialog, toast } from './dom.js';
import { session } from './session.js';

export async function downloadBackup() {
  const backup = await repo.exportAll();
  const name = `peaknote-respaldo-${todayISO()}.json`;
  const file = new File([JSON.stringify(backup)], name, { type: 'application/json' });
  let done = false;
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Respaldo de PeakNote' });
      done = true;
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
  }
  if (!done) {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  await repo.settings.set('lastBackup', Date.now());
  toast('Respaldo generado.', { kind: 'success' });
  return true;
}

/** Abre el selector de archivo, valida y reemplaza los datos. Devuelve true si se restauró. */
export function restoreBackup({ warnReplace = true } = {}) {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return resolve(false);
      try {
        if (f.size > 50_000_000) throw new Error('El archivo es demasiado grande.');
        const parsed = migrateBackup(JSON.parse(await f.text()));
        const { ok, errors } = validateBackup(parsed);
        if (!ok) {
          toast(`Respaldo no válido: ${errors[0]}`, { kind: 'error', timeout: 6000 });
          return resolve(false);
        }
        const d = parsed.data;
        const when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('es-VE') : 'fecha desconocida';
        const yes = await confirmDialog({
          title: 'Restaurar respaldo',
          message: `Contiene ${d.grades.length} grado(s) y ${d.students.length} estudiante(s) (${when}). ${warnReplace ? 'Reemplazará todos los datos actuales de este dispositivo.' : ''}`,
          confirmLabel: 'Restaurar',
          danger: warnReplace,
        });
        if (!yes) return resolve(false);
        await repo.importAll(parsed);
        session.end();
        toast('Respaldo restaurado. Inicia sesión para continuar.', { kind: 'success', timeout: 5000 });
        resolve(true);
      } catch (e) {
        toast('No se pudo leer el archivo de respaldo.', { kind: 'error' });
        resolve(false);
      }
    });
    input.click();
  });
}
