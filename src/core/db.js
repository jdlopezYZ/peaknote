/**
 * Capa de datos local (IndexedDB nativo) detrás de repositorios.
 * La UI solo habla con `repo.*`: si en el futuro hay una base remota, se reemplaza este archivo.
 */
import { COLLECTIONS, SCHEMA_VERSION, buildBackup } from './backup-schema.js';

const DB_NAME = 'peaknote';
let dbPromise;

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const p = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    db.createObjectStore('account', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('grades', { keyPath: 'id' });
    db.createObjectStore('students', { keyPath: 'id' }).createIndex('gradeId', 'gradeId');
    db.createObjectStore('evaluations', { keyPath: ['studentId', 'momento'] });
    db.createObjectStore('finals', { keyPath: 'studentId' });
    db.createObjectStore('observations', { keyPath: ['studentId', 'momento'] });
    const att = db.createObjectStore('attendance', { keyPath: ['studentId', 'fecha'] });
    att.createIndex('fecha', 'fecha');
  }
  // Próximas migraciones: if (oldVersion < 2) { … }
}

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
  });
  return dbPromise;
}

/** Ejecuta `fn(...stores)` dentro de una transacción y espera a que termine. */
async function run(names, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
    Promise.resolve(fn(...names.map((n) => tx.objectStore(n)))).then(
      (r) => {
        result = r;
      },
      (e) => {
        try {
          tx.abort();
        } catch {}
        reject(e);
      },
    );
  });
}

const ALL = ['account', 'settings', 'grades', 'students', 'evaluations', 'finals', 'observations', 'attendance'];

/** Borra, dentro de la transacción, todo lo que cuelga de los estudiantes indicados. */
async function purgeStudentData(stores, ids) {
  const { students, evaluations, finals, observations, attendance } = stores;
  const dropBy = async (store, keyOf) => {
    const rows = await p(store.getAll());
    await Promise.all(rows.filter((r) => ids.has(r.studentId)).map((r) => p(store.delete(keyOf(r)))));
  };
  await Promise.all([
    dropBy(evaluations, (r) => [r.studentId, r.momento]),
    dropBy(finals, (r) => r.studentId),
    dropBy(observations, (r) => [r.studentId, r.momento]),
    dropBy(attendance, (r) => [r.studentId, r.fecha]),
    ...[...ids].map((id) => p(students.delete(id))),
  ]);
}

export const repo = {
  account: {
    get: () => run(['account'], 'readonly', (s) => p(s.get('main'))),
    save: (a) => run(['account'], 'readwrite', (s) => p(s.put({ ...a, id: 'main' }))),
  },

  settings: {
    get: (key) => run(['settings'], 'readonly', (s) => p(s.get(key))).then((r) => r?.value),
    set: (key, value) => run(['settings'], 'readwrite', (s) => p(s.put({ key, value }))),
  },

  grades: {
    list: () =>
      run(['grades'], 'readonly', (s) => p(s.getAll())).then((l) => l.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))),
    get: (id) => run(['grades'], 'readonly', (s) => p(s.get(id))),
    save(g) {
      const grade = { createdAt: Date.now(), ...g, id: g.id ?? uid() };
      return run(['grades'], 'readwrite', (s) => p(s.put(grade))).then(() => grade);
    },
    remove: (id) =>
      run(['grades', 'students', 'evaluations', 'finals', 'observations', 'attendance'], 'readwrite', async (grades, students, evaluations, finals, observations, attendance) => {
        const list = await p(students.index('gradeId').getAll(id));
        await purgeStudentData({ students, evaluations, finals, observations, attendance }, new Set(list.map((s) => s.id)));
        await p(grades.delete(id));
      }),
  },

  students: {
    listByGrade: (gradeId) => run(['students'], 'readonly', (s) => p(s.index('gradeId').getAll(gradeId))),
    save(st) {
      const student = { createdAt: Date.now(), ...st, id: st.id ?? uid() };
      return run(['students'], 'readwrite', (s) => p(s.put(student))).then(() => student);
    },
    saveMany(list) {
      const rows = list.map((st) => ({ createdAt: Date.now(), ...st, id: st.id ?? uid() }));
      return run(['students'], 'readwrite', (s) => Promise.all(rows.map((r) => p(s.put(r))))).then(() => rows);
    },
    remove: (id) =>
      run(['students', 'evaluations', 'finals', 'observations', 'attendance'], 'readwrite', (students, evaluations, finals, observations, attendance) =>
        purgeStudentData({ students, evaluations, finals, observations, attendance }, new Set([id])),
      ),
  },

  evaluations: {
    /** @returns {Promise<Map<string,string>>} clave `${studentId}|${momento}` → literal */
    async mapFor(studentIds) {
      const ids = new Set(studentIds);
      const rows = await run(['evaluations'], 'readonly', (s) => p(s.getAll()));
      return new Map(rows.filter((r) => ids.has(r.studentId)).map((r) => [`${r.studentId}|${r.momento}`, r.literal]));
    },
    set: (studentId, momento, literal) =>
      run(['evaluations'], 'readwrite', (s) =>
        literal ? p(s.put({ studentId, momento, literal })) : p(s.delete([studentId, momento])),
      ),
  },

  finals: {
    async mapFor(studentIds) {
      const ids = new Set(studentIds);
      const rows = await run(['finals'], 'readonly', (s) => p(s.getAll()));
      return new Map(rows.filter((r) => ids.has(r.studentId)).map((r) => [r.studentId, r.literal]));
    },
    set: (studentId, literal) =>
      run(['finals'], 'readwrite', (s) => (literal ? p(s.put({ studentId, literal })) : p(s.delete(studentId)))),
  },

  observations: {
    async mapFor(studentIds) {
      const ids = new Set(studentIds);
      const rows = await run(['observations'], 'readonly', (s) => p(s.getAll()));
      return new Map(rows.filter((r) => ids.has(r.studentId)).map((r) => [`${r.studentId}|${r.momento}`, r.texto]));
    },
    set: (studentId, momento, texto) =>
      run(['observations'], 'readwrite', (s) =>
        texto.trim() ? p(s.put({ studentId, momento, texto: texto.trim() })) : p(s.delete([studentId, momento])),
      ),
  },

  attendance: {
    /** @returns {Promise<Array<{studentId,fecha,estado}>>} */
    async listFor(studentIds) {
      const ids = new Set(studentIds);
      const rows = await run(['attendance'], 'readonly', (s) => p(s.getAll()));
      return rows.filter((r) => ids.has(r.studentId));
    },
    set: (studentId, fecha, estado) =>
      run(['attendance'], 'readwrite', (s) =>
        estado ? p(s.put({ studentId, fecha, estado })) : p(s.delete([studentId, fecha])),
      ),
    setMany: (entries) =>
      run(['attendance'], 'readwrite', (s) => Promise.all(entries.map((e) => p(s.put(e))))),
  },

  async exportAll() {
    const data = await run(ALL, 'readonly', async (...stores) => {
      const byName = Object.fromEntries(ALL.map((n, i) => [n, stores[i]]));
      const [account, settings, ...rest] = await Promise.all([
        p(byName.account.get('main')),
        p(byName.settings.getAll()),
        ...COLLECTIONS.map((c) => p(byName[c].getAll())),
      ]);
      return { account: account ?? null, settings, ...Object.fromEntries(COLLECTIONS.map((c, i) => [c, rest[i]])) };
    });
    return buildBackup(data);
  },

  /** Reemplaza TODO el contenido por el del respaldo (ya validado). */
  importAll(backup) {
    const d = backup.data;
    return run(ALL, 'readwrite', async (...stores) => {
      const byName = Object.fromEntries(ALL.map((n, i) => [n, stores[i]]));
      await Promise.all(ALL.map((n) => p(byName[n].clear())));
      const puts = [];
      if (d.account) puts.push(p(byName.account.put({ ...d.account, id: 'main' })));
      for (const s of d.settings) puts.push(p(byName.settings.put(s)));
      for (const c of COLLECTIONS) for (const r of d[c]) puts.push(p(byName[c].put(r)));
      await Promise.all(puts);
    });
  },

  wipe: () => run(ALL, 'readwrite', (...stores) => Promise.all(stores.map((s) => p(s.clear())))),
};
