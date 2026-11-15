# PeakNote PWA · V1

Asistencia, calificaciones por literal (A–E) y matrícula para docentes de primaria (Venezuela).
PWA **offline**, datos **solo en el dispositivo**, sin dependencias de ejecución ni paso de compilación.

## Probarla en 1 minuto

```bash
node tools/serve.mjs        # http://localhost:5173  (Node 20+)
```

Abre `http://localhost:5173` en Chrome/Edge/Safari. Para instalarla: menú del navegador → *Instalar aplicación*.

**En el celular** necesitas **HTTPS** (el service worker y las contraseñas seguras no funcionan en `http://192.168…`).
Lo más rápido: sube esta carpeta tal cual a Netlify Drop, Cloudflare Pages, GitHub Pages o Vercel (es 100 % estática).
También sirve en subcarpetas: todas las rutas son relativas.

## Qué incluye la V1

| Pantalla | Qué hace |
|---|---|
| Bienvenida / Login / Registro | Cuenta local (usuario + contraseña ≥ 6, PBKDF2 con sal). Modal "Crear una cuenta" como en PeakNote. |
| Perfil | Docente, plantel, director(a) (para firmas futuras). |
| Abrir grado | Año escolar, grado, sección + texto de indicadores A–E. Editable después. |
| Matrícula | Agregar/editar/eliminar, **pegar lista**, **importar CSV**, búsqueda sin tildes. Botón verde **+** (identidad PeakNote). |
| Inicio · Hoy | Avance de la lista del día, distribución por literal, "requieren atención". |
| Asistencia | Presente / Ausente / Justificada por fecha. Las justificadas **no** cuentan como inasistencia. |
| Evaluación | Cuadrícula estudiantes × 3 momentos + literal final manual + observaciones. **"Sin evaluar" es un estado propio** (nunca cuenta como bajo). |
| Documentos | Lista de calificaciones en pantalla. Boleta/PDF: *próximamente*. |
| Ajustes | Perfil, grados (varios), tema oscuro/claro/sistema, contraseña, **respaldo exportar/restaurar**, instalación, almacenamiento protegido, borrar datos. |

**Fuera de la V1 (por decisión del usuario):** calendario escolar/feriados, % de inasistencia, formatos PDF, sincronización.

## Decisiones por defecto tomadas (cámbialas cuando quieras)

- Login = cuenta local usuario + contraseña; **un docente por instalación**. Es un bloqueo local, **no cifrado**; no hay recuperación de contraseña (para eso existe el respaldo).
- La sesión vive en `sessionStorage`: al cerrar la app se pide la contraseña otra vez.
- Matrícula: apellidos, nombres y cédula escolar (opcional). Duplicados por cédula, o por nombre exacto si no hay cédula.
- Un texto de indicador por grado (A–E). Observación libre por niño **y por momento**.
- "Requieren atención" = literal **D o E** en el último momento con evaluaciones (`LITERALES_ATENCION` en `src/core/domain.js`).
- El año escolar arranca en septiembre (`schoolYearOptions`).

## Estructura

```
index.html · manifest.webmanifest · sw.js
assets/            WebP optimizados + iconos PWA (192/512/maskable)
src/core/          domain.js (puro) · db.js (IndexedDB + repositorios) · backup-schema.js · crypto.js · router.js · dom.js · pwa.js
src/components/    shell (panel lateral 250 px / 300 ms) · literal · student-forms
src/screens/       una por pantalla (carga perezosa)
src/styles/        tokens.css (fuente única de diseño) · base · components · screens
tests/             node --test  (dominio, importadores, respaldo, precaché del SW)
tools/             serve.mjs · update-sw.mjs
docs/              PEAKNOTE_CONOCIMIENTO.md (contexto completo del proyecto)
```

## Pruebas

```bash
npm test            # o: node --test      (16 pruebas, sin dependencias)
```

Además se verificó en Chromium (móvil Pixel 7 y PC 1280×800) el flujo completo: registro → perfil → grado → importar lista → asistencia → evaluación → login (clave mala/buena) → búsqueda → respaldo → **funcionamiento sin conexión**.

## Cuando cambies archivos

1. `npm run sw` regenera la lista de precaché de `sw.js`.
2. Sube `VERSION` en `sw.js`. Los usuarios verán el aviso **"Hay una versión nueva · Actualizar"**.

## Nota sobre el stack

La propuesta del archivo de conocimiento era Vite + React + Tailwind + Dexie + Workbox. En el entorno donde se construyó esta V1 **no se podían instalar paquetes**, así que se hizo con **JavaScript moderno nativo** (ES modules, `<dialog>`, View Transitions, IndexedDB, Web Crypto, service worker propio). Resultado: ~125 KB de código + ~440 KB de imágenes e iconos, cero dependencias.
Los repositorios (`repo.*`) y el dominio puro están separados de la UI, así que migrar a React/Vite/Dexie después es directo si se desea.
