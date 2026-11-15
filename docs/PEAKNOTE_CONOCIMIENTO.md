# PeakNote PWA — Archivo de conocimiento (traspaso entre IAs)

> **Fecha de corte:** 14-nov-2026 · **Idioma del proyecto:** español (es-VE) · **Fase actual:** entrevista terminada, listo para empezar el desarrollo de la **V1**.
> **Cómo leer este archivo:** cada afirmación lleva una etiqueta de certeza.
> - **[CONFIRMADO]** lo dijo el usuario o lo verificó en el código fuente del zip.
> - **[SUPUESTO]** lo propuso la IA en la entrevista y el usuario no lo objetó. Vigente hasta que diga lo contrario.
> - **[PROPUESTA]** decisión técnica o de diseño sugerida que el usuario aún no ha validado explícitamente.
> - **[ABIERTO]** falta decidir. No inventes la respuesta: pregúntala o usa el valor por defecto indicado y avisa.
>
> **Regla de oro del usuario:** *no inventar ni delirar; mantenerse fiel al contexto de la V1 ya estructurada.*

---

## 1. Resumen ejecutivo

- **Qué es:** PeakNote era una app de escritorio (Windows) hecha en **Qt/C++** para gestionar notas. Se está **rehaciendo como una PWA** instalable en celular y PC, para que **docentes de primaria en Venezuela** lleven **asistencia, calificaciones por literal (A–E) y matrícula**, y más adelante generen boletas y formatos.
- **Nombre:** el código y el logo dicen **PeakNote** ("PeakStudios® Presenta: PeakNote"). El usuario a veces escribe "PicNote". **[CONFIRMADO]** El nombre de la V1 es **PeakNote** (el usuario escribe "V1 de PeakNote" en su último mensaje).
- **No es un port de código.** Qt Widgets/QSS no tienen equivalente web. Es una **reescritura guiada por especificación**: se conservan **identidad visual, patrones de interfaz y activos**; las reglas de negocio son **nuevas** (primaria venezolana), no las del C++.
- **Desarrollo impulsado por IA:** solo **modelos Claude** y **modelos dentro de Antigravity**. Todo el proceso debe ser amigable para agentes (tareas pequeñas, verificables, reglas del proyecto dentro del repo).
- **Qué quiere ahora el usuario (V1):** un stack **moderno y actualizado**, **muy optimizado** (corre en cualquier teléfono), **minimalista, sobrio y práctico**, con la esencia de PeakNote. Funciones primordiales: **iniciar sesión** y **registrar estudiantes cuando quiera**, y todo lo demás del flujo.

---

## 2. Historia de la conversación (para no repetir la entrevista)

Las rondas se hicieron en varias cuentas/IAs. Resumen cronológico:

1. **Contexto inicial:** migrar el proyecto Qt/C++ a una PWA descargable; que ayude a llevar asistencias, record de notas y generar matrícula y boletas. Mantener colores, esquema y modales de PeakNote.
2. **Primer diagnóstico de la IA** (asumió que era app universitaria: 4 cortes × 25 %, escala 0–20, aprobado ≥ 9,5). **El usuario lo corrigió:** es **primaria**, no universitaria. **El motor numérico del C++ deja de ser la fuente de reglas.**
3. **Segunda IA verificó el zip** y confirmó cifras (1.885 líneas de C++, 6 pantallas, 27 recursos; solo 11 usados). Detectó que el zip trae basura de compilación (`build/`, `.exe` de ~14 MB, índices de clangd).
4. **Decisiones de datos, fidelidad y dispositivos** (sección 3).
5. **Modelo de evaluación** (un literal por niño por momento; literal final manual) y **contenido de la boleta**.
6. **Flujo de pantallas** (diagrama en sección 7).
7. **Asistencia** (estados y cálculo) y **país** (Venezuela).
8. **Giro final del usuario:** *"no quiero meterme con el calendario de fechas ni con los formatos PDF todavía"* → ambos quedan **fuera de la V1**. La ronda técnica (stack, Antigravity) **no se llegó a entrevistar**; el usuario prefirió pasar directo al desarrollo y pidió un stack moderno.

---

## 3. Decisiones confirmadas

| # | Tema | Decisión | Etiqueta |
|---|---|---|---|
| 1 | Almacenamiento | **Solo local/offline** en el dispositivo. Más adelante podría conectarse una base de datos, así que la capa de datos debe quedar **desacoplada** (repositorios). | CONFIRMADO |
| 2 | Dispositivos | **Cada dispositivo aparte.** Sin sincronización ni mover datos entre equipos en V1. | CONFIRMADO |
| 3 | Uso | **Celular y PC por igual** → diseño responsive real, no "móvil primero con escritorio de relleno". | CONFIRMADO |
| 4 | Fidelidad a PeakNote | **Solo identidad y ciertas partes del flujo.** UX modernizada; se puede cambiar casi todo lo demás. | CONFIRMADO |
| 5 | País/sistema | **Venezuela, primaria.** | CONFIRMADO |
| 6 | Estructura | **Año escolar → grado y sección** (p. ej. 5.º A) → **matrícula** de estudiantes. | CONFIRMADO |
| 7 | Indicadores | El docente escribe el **texto del indicador de cada literal A–E**. | CONFIRMADO |
| 8 | Evaluación | **3 momentos pedagógicos.** **Un solo literal** por estudiante en cada momento. | CONFIRMADO |
| 9 | Literal final del año | **Lo asigna manualmente el docente** (no se calcula). | CONFIRMADO |
| 10 | Asistencia — estados | **Presente, Ausente, Justificada.** | CONFIRMADO |
| 11 | Asistencia — conteo | Las **justificadas no cuentan** como inasistencia (se descuentan). | CONFIRMADO |
| 12 | Asistencia — base del % | Había elegido "calendario escolar con feriados". **Ahora queda diferido** porque el calendario sale de la V1. | CONFIRMADO (diferido) |
| 13 | Contenido de la boleta | Literal + observación libre por niño + inasistencias (días y %) + firmas (docente, director, representante) + texto del indicador + **formato específico que el usuario explicará después**. | CONFIRMADO (la **generación** queda fuera de V1) |
| 14 | Salidas del sistema | Matrícula, boleta, lista de calificaciones del grado, registro de asistencia. "Nada más por ahora." | CONFIRMADO |
| 15 | Respaldo | Botón **Respaldo** (exportar/restaurar archivo) en Ajustes, solo como seguro contra pérdida de datos. | SUPUESTO (aparece en el diagrama aprobado) |
| 16 | Varios grados | El modelo admite **varios grados/secciones**; el selector solo aparece si hay más de uno. | SUPUESTO |
| 17 | Primer valor rápido | Se pueden **saltar PIN y "Cargar niños"**; se cae al Inicio con el **búho dormido** como estado vacío y un botón claro. | SUPUESTO |
| 18 | Carga de estudiantes | Además del modal agregar/editar: **pegar lista (un nombre por línea)** e **importar CSV**. | SUPUESTO |
| 19 | PIN | Es un **bloqueo de pantalla, no cifrado**. Frena la curiosidad, no a alguien con acceso al aparato. Se dice así en la UI/documentación. | SUPUESTO |

---

## 4. Fuera de alcance de la V1 (no tocar)

- **Calendario escolar** (fechas, feriados, días hábiles) y todo cálculo que dependa de él, incluido el **% de inasistencia basado en calendario**.
- **Generación de PDF / formatos oficiales** (matrícula, boleta, lista de calificaciones imprimible). El usuario explicará el **formato específico** en una iteración posterior. La V1 **solo debe dejar los datos preparados** (ver 6.3).
- Sincronización, cuentas en la nube, base de datos remota, multiusuario real.
- Cualquier cosa que no esté en este archivo: **no la añadas sin preguntar.**

---

## 5. Legado: PeakNote (Qt/C++) — qué se conserva y qué no

### 5.1 Hechos verificados en el zip
- **Stack legado:** Qt Widgets + QSS, C++, `PeakNote.pro`, formularios `.ui`. **1.885 líneas** de C++, **6 pantallas**, **27 recursos** (solo 11 referenciados).
- **Persistencia legada:** archivos binarios Qt (`data/*.dat`) con 3 entidades: `User` → `Subject` (materia) → `Student`. Los `.dat` del zip son **datos de prueba** (2 usuarios, 2 materias, 4 estudiantes): **no hay nada que migrar**.
- **Campos legados:**
  - `User`: username, passwordHash (**SHA-256 sin sal**, solo local → no es seguridad real).
  - `Subject`: id, name, period (2024-2025…2027-2028, fijos), semester, section (regex `^[A-Za-z0-9_-]*$`), nº de evaluaciones por corte (1–10), username.
  - `Student`: id, name, cédula, subjectId, notas por corte. Validación: nombre y cédula obligatorios.
  - Registro: contraseña **mínimo 6 caracteres**.
- **Reglas del C++ (SOLO REFERENCIA, NO SE APLICAN):** nota sobre 20, aprobado ≥ 9,5, 4 cortes de 25 %, promedio simple por corte, definitiva = promedio de 4 cortes, lo no evaluado cuenta como 0.
- **Limitaciones del legado que NO deben heredarse:** diálogos en cadena para cargar notas (hasta 40 por estudiante); no se puede editar/borrar materia; el "no evaluado" = 0 (a mitad de lapso casi todos aparecen reprobados → la PWA necesita estado **"sin evaluar"**); reporte PDF con coordenadas fijas; reporte por materia vacío; un mismo estudiante en dos materias se duplica (no hay ficha única).

### 5.2 Flujo legado (patrones a conservar)
**Login** (con modal **Registro**) → **Materias** (lista, panel lateral ☰, botón verde **+**) → asistente **"Añadir materia"** → **Estudiantes de la materia** (búsqueda, filtro Todos/Aprobados/Reprobados, filas verdes/rojas, clic derecho para editar o eliminar) → modal **Agregar/Editar estudiante**.

- **Panel lateral:** 250 px de ancho, animación de 300 ms. Opciones: Aprobados / Reprobados / Reporte PDF / Cerrar sesión.
- **Traducción acordada al nuevo modelo:**

| Hoy en PeakNote | En la PWA |
|---|---|
| Materia (nombre, período, semestre, sección) | **Grado y sección** dentro de un **año escolar** |
| Asistente "Añadir materia" | Asistente **"Abrir grado"**: datos del grado + texto de indicadores A–E |
| 4 cortes con notas 0–20 | **3 momentos pedagógicos** con literal A–E |
| Estudiantes (nombre y cédula) | **Matrícula** del grado (campos por definir, ver 6.2) |
| Ver aprobados / reprobados | **Distribución por literal** y **niños que requieren atención** |
| Reporte PDF global | (Diferido) matrícula, boleta, lista de calificaciones |

### 5.3 Identidad visual a conservar

**Paleta real encontrada en los estilos del `.ui`/QSS** (valores extraídos del código):

| Token | Valor | Uso en el legado |
|---|---|---|
| `teal-950` | `#063737` | Fondo/acento más oscuro (el más repetido) |
| `teal-800` | `#0B5B5B` / `#0C6060` | Botones, bordes |
| `teal-700` | `#0E7575` | Botones/hover |
| `teal-600` | `#108585` | Hover/acento |
| `mint-500` | `#18C3A6` | Acento principal, degradado del login |
| `mint-50` | `#E6FFFB` | Texto/superficie clara sobre fondo oscuro |
| `ink-950/900` | `#101010` / `#282828` | Degradados casi negros de fondo |
| `slate-panel` | `#263238` (+ `#37474F`, `#424242`) | **Panel lateral gris azulado** |
| `success-action` | `#4CAF50` (hover `#45A049`) | Botón **+** verde |
| `danger-soft` | `rgb(255,121,141)` ≈ `#FF798D` | Rojo suave (referencia para reprobado/error) |
| grises | `#E0E0E0`, `#D0D0D0`, `#BDBDBD` | Bordes, texto secundario |
| **Azul Material residual** | `#2196F3`, `#1976D2`, `#E3F2FD` | Restos en el QSS, **probablemente tapados por estilos en línea; NO usar** |

- **Filas aprobado/reprobado:** verde y rojo suaves (tono exacto sin fijar; derivarlo de la paleta). En la PWA equivalen a estados de literal/atención, no a aprobado/reprobado numérico.
- **Colores de la mascota (nuevos como posible acento):** contorno azul marino ≈ `#06375D` y acento naranja ≈ `#E28343`. **[ABIERTO]** si entran como acentos; por defecto **no** (mantener sobrio, solo teal/menta).
- **Mascota:** búho verde menta con **birrete**. Los **títulos son ilustraciones** (imágenes con tipografía display verde menta con brillo), no texto.

### 5.4 Mapa de recursos (carpeta `PeakNote/resources/`)

**Usados en el legado (11):**

| Archivo | Qué es | Dónde se usaba |
|---|---|---|
| `WhatsApp_Image_2026-01-31_…-removebg-preview.png` (alias `buhologin`) | Búho con birrete escribiendo en un formulario (burbuja "Nombre / Contraseña") | Login |
| `wizerPeak.png` (2048×2048, ~2 MB) | Búho menta con anteojos leyendo sobre una rama | Login (ilustración grande) |
| `1.png` | Título **"PeakNote"** | Login |
| `presenta.png` | Rótulo **"PeakStudios® Presenta:"** | Login |
| `cuenta.png` | Título **"Crear una Cuenta"** | Modal Registro |
| `MATRICULA.png` | Título **"Matricula"** (sic, sin tilde en la imagen) | Pantalla Estudiantes |
| `materia.png` | Título **"Agregar Materia"** | Asistente materia |
| `at 11.15.40 AM.jpeg1.png` | Búho sobre una **carpeta con documentos** | Asistente materia |
| `estudiante.png` | Título **"Agregar Estudiante"** | Modal estudiante |
| `11.png` | Búho con birrete sobre un **libro abierto** | Modal estudiante |
| `favicon.ico` | Icono de la app | Ventana |

**No usados (16)** — destacan:
- **`Wha.png`** (457×507): **búho dormido con burbuja ❌** → ideal para **estados vacíos y errores** (el flujo ya lo asigna al Inicio vacío).
- `peak-note-5k-removebg-preview.png`: título "CREAR CUENTA" en otra tipografía.
- `peak-note-5k.webp`: tiene **fondo morado, fuera de marca → excluir.**
- Resto: `2…9.png`, `2-removebg-preview.png`, `3-removebg-preview.png`, `PP.png`, `4.51 AM.png`, `W AM.png` — **revisar visualmente antes de usar**; no asumir su contenido.

**Recomendaciones de assets para la PWA [PROPUESTA]:** convertir a **WebP/AVIF**, redimensionar (el búho de 2048² pesa ~2 MB: servirlo ≤ 600 px), generar iconos PWA (192, 512, maskable) a partir del búho/favicon, y evaluar si los títulos-ilustración se mantienen como imágenes o se reemplazan por texto con una tipografía display similar (decisión de diseño **[ABIERTO]**; por defecto: **títulos de pantalla en texto sobrio**, ilustración solo en bienvenida, login, vacíos y registro).

---

## 6. Dominio de la V1 (modelo nuevo)

### 6.1 Entidades [PROPUESTA de esquema derivada de las decisiones confirmadas]

```
Cuenta/Docente     { id, usuario, hash(contraseña|PIN) con sal, nombre, plantel, creadoEn }
AñoEscolar         { id, docenteId, etiqueta ("2026-2027"), activo }
Grado              { id, añoEscolarId, grado ("5.º"), sección ("A"),
                     indicadores: { A, B, C, D, E } (texto) }
Estudiante         { id, gradoId, nombres, apellidos, cédula/cédula escolar?, …campos por definir }
Evaluación         { id, estudianteId, momento (1|2|3), literal (A–E | null) }   // null = sin evaluar
LiteralFinal       { estudianteId, literal (A–E | null) }                        // manual
Observación        { estudianteId, texto, (momento?) }                           // ver ABIERTO
Asistencia         { id, estudianteId, fecha (ISO), estado: "presente"|"ausente"|"justificada" }
Ajustes            { plantel, director?, pinHash?, … }
```

- **Sin evaluar ≠ literal bajo.** El estado `null` debe existir y mostrarse distinto.
- **Un solo literal por estudiante por momento** (restricción única `estudianteId + momento`).
- **Literal final:** campo editable manual, no derivado.
- **Todo versionado:** `schemaVersion` en la base y en el archivo de respaldo, con migraciones.
- **Capa de repositorios** (interfaces) para poder cambiar IndexedDB por una API sin tocar la UI (decisión 1).

### 6.2 Campos de matrícula [ABIERTO]
El usuario dijo "campos por definir" y los formatos oficiales se verán después. **Valor por defecto para V1:** `nombres`, `apellidos`, `cédula / cédula escolar` (opcional, texto) y `fecha de nacimiento` opcional **solo si el usuario lo aprueba**; modelo **extensible** (los campos nuevos se añaden con migración). Pregunta pendiente al usuario si quiere otros (sexo, representante, teléfono…).

### 6.3 Datos que la V1 debe dejar listos para los PDF futuros
Literal por momento, literal final, texto del indicador por literal, observación por niño, conteo de ausencias (y justificadas por separado), nombres de docente/director/representante para firmas, plantel. **No se genera PDF ni se calcula % con calendario.**

### 6.4 Asistencia sin calendario [SUPUESTO de interpretación — confirmar]
Con el calendario fuera de V1, la asistencia se registra **por fecha elegida por el docente** (por defecto, hoy), con los 3 estados. Se muestran **conteos** (presentes, ausentes, justificadas) por niño. **No hay % basado en feriados.** Regla de conteo ya fijada: **justificadas no suman a inasistencia.**

### 6.5 Preguntas abiertas del dominio
- **[ABIERTO]** ¿El texto de indicador es **uno por grado** (A–E) o **varía por momento**? Por defecto: **uno por grado**.
- **[ABIERTO]** ¿La **observación libre** es por niño por **momento** o única por año? Por defecto: **por niño y por momento**.
- **[ABIERTO]** ¿Qué documentos/datos ve el docente en "Documentos" si los PDF están diferidos? Por defecto: la pantalla existe como **vista de resumen/lista de calificaciones en pantalla** + marcador "Boleta y PDF — próximamente".

---

## 7. Flujo de pantallas (aprobado por el usuario)

```
PRIMERA VEZ
Bienvenida (marca y búho) → Perfil (plantel y PIN) → Abrir grado (indicadores) → Matrícula (cargar niños)
                                                                                      │
CADA DÍA                                                                              ▼
Desbloqueo (PIN opcional) ───────────────► INICIO · HOY (pasar lista y resumen) ──► Ajustes (plantel, respaldo)
                                                  │
        ┌───────────────┬───────────────┬─────────┴───────┐
        ▼               ▼               ▼                 ▼
   Asistencia      Evaluación       Estudiantes      Documentos
   (pasar lista)   (momentos A–E)   (matrícula)      (boleta y PDF)
```

**Notas de diseño del flujo:**
- Cuatro pasos antes del primer valor → **PIN y "Cargar niños" se pueden saltar**; se cae al **Inicio con búho dormido** (estado vacío) y un botón claro.
- **Inicio · Hoy** es el centro: pasar lista rápido + resumen (distribución por literal, niños que requieren atención).
- **Selector de grado** solo visible si hay más de uno.
- **Evaluación:** una **cuadrícula** (estudiantes × 3 momentos) con selector de literal A–E, no diálogos encadenados. Carga progresiva, "sin evaluar" visible.
- **Estudiantes:** búsqueda, filtro, editar/eliminar (en móvil: acciones por deslizamiento o menú; en PC: clic derecho/menú), modal agregar/editar al estilo PeakNote.
- **Ajustes:** plantel, respaldo (exportar/restaurar), bloqueo con PIN.

### 7.1 "Iniciar sesión" — tensión a resolver [ABIERTO]
- El usuario pide como función primordial **"iniciar sesión"**.
- El flujo aprobado dice **"Desbloqueo — PIN opcional"** y "Perfil — plantel y PIN".
- El PeakNote viejo tenía **Login (usuario + contraseña) + modal Registro "Crear una cuenta"**.
- **Valor por defecto para V1 si el usuario no dice otra cosa:** **cuenta local** estilo PeakNote: pantalla **Login** con el búho, **Registro** en modal (usuario + contraseña/PIN, mínimo 6 caracteres como en el legado), contraseña con **PBKDF2 + sal vía Web Crypto** (no SHA-256 sin sal). Se mantiene "Cerrar sesión". **Dejar claro en UI/docs que es un bloqueo local, no seguridad real.** Se respeta la posibilidad de varios docentes en el mismo equipo solo si el usuario lo pide **[ABIERTO]**; por defecto **un docente por instalación** con opción de PIN.

---

## 8. Diseño y marca

- **Tono:** **minimalista, sobrio, profesional**, moderno, práctico. Nada recargado. Animaciones **sutiles y funcionales** (transiciones de pantalla, panel lateral 300 ms, feedback táctil), siempre respetando `prefers-reduced-motion`.
- **Tema:** conservar **verdes azulados** (`#063737` → `#18C3A6`) sobre fondos casi negros como identidad; el panel lateral gris azulado `#263238`; botón de acción `#4CAF50`. **[ABIERTO]** si habrá modo claro; por defecto **tema oscuro como identidad** y **modo claro derivado** (sobrio) si el tiempo lo permite, con tokens preparados desde el inicio.
- **Tokens:** definir en CSS variables (color, espaciado, radios, sombras, duración/easing) como **fuente única**; ningún color suelto en componentes.
- **Componentes base a construir primero:** Button, IconButton, Input, Select, Modal/Dialog (el "modal" es seña de identidad), Drawer/Panel lateral, List/Row, Table/Grid de literales, Badge de literal (A–E), EmptyState (búho), Toast, Tabs/BottomNav (móvil) + Sidebar (PC).
- **Responsive:** móvil = navegación inferior + hoja inferior para modales; PC = panel lateral + modal centrado. Áreas táctiles ≥ 44 px, teclado completo en PC.
- **Accesibilidad:** contraste AA sobre fondos oscuros, foco visible, etiquetas ARIA, literal nunca comunicado solo por color (siempre letra A–E).
- **Idioma:** español de Venezuela; fechas `dd/mm/aaaa`; zona horaria del usuario **America/Caracas (UTC−4)**; textos centralizados (preparar i18n aunque solo haya `es`).

---

## 9. Stack técnico — **[PROPUESTA]** (la ronda técnica no se entrevistó)

El usuario pidió: **stack completamente actualizado, moderno y optimizado**. Mi propuesta por defecto; usar **las últimas versiones estables al crear el proyecto** (verificar con `npm view <paquete> version`, no asumir versiones de memoria):

| Capa | Elección |
|---|---|
| Build | **Vite** + **TypeScript (strict)** |
| UI | **React** (última estable) + **React Router** |
| Estilos | **Tailwind CSS** con tokens como variables CSS + primitivas accesibles (**Radix UI**) para Dialog/Select/etc. |
| Animación | **Motion** (ex Framer Motion), con `prefers-reduced-motion` |
| Estado | **Zustand** para UI; datos en la base, no en estado global |
| Datos locales | **IndexedDB vía Dexie**, detrás de **repositorios** (interfaces) |
| Validación | **Zod** (formularios y archivo de respaldo) |
| PWA | **vite-plugin-pwa** (Workbox): manifest, iconos maskable, precache offline, actualización con aviso |
| Seguridad local | **Web Crypto** (PBKDF2 + sal) para contraseña/PIN; pedir `navigator.storage.persist()` |
| Calidad | **Vitest** + Testing Library (dominio y componentes), **Playwright** (flujos E2E y viewport móvil), **ESLint/Biome**, `tsc --noEmit` |
| Fuentes | Autoalojadas (sin CDN) para funcionar offline |

**Rendimiento (objetivo "corre en cualquier teléfono"):** carga inicial pequeña, rutas con `lazy`, imágenes WebP/AVIF, sin librerías pesadas, listas virtualizadas solo si hace falta, Lighthouse PWA/Performance/Accessibility ≥ 90 como meta.

**Persistencia — riesgos que la IA debe respetar:**
- Limpiar datos del navegador o perder el teléfono **borra un año de calificaciones** → el **respaldo** (JSON con `schemaVersion`, validado con Zod al restaurar) es parte de la V1.
- iOS/Safari puede desalojar almacenamiento si la PWA no está instalada → mostrar guía de **instalación** y solicitar almacenamiento persistente.
- **No** afirmar que hay cifrado; el PIN es un bloqueo.

---

## 10. Flujo de trabajo con IA (Claude + Antigravity) [PROPUESTA]

- **Fuente única de verdad en el repo:** este archivo + `AGENTS.md`/reglas del proyecto (convenciones, comandos, qué no tocar) + `docs/spec/` (reglas, pantallas, tokens, assets). Así Claude y los agentes de Antigravity trabajan con el mismo contexto. *(Verificar la convención de reglas vigente en la documentación de Antigravity, porque cambia rápido.)*
- **Tareas pequeñas y verificables**; **plan aprobado antes de escribir código** en cambios grandes; cada corte vertical termina con **checklist + pruebas automáticas**.
- **Dominio como módulo puro con pruebas** (literales, asistencia, respaldo), independiente de React, para que cualquier IA lo pueda verificar sin UI.
- **Commits pequeños**, mensajes claros, sin archivos de compilación del legado en el repo (`build/`, `.exe`, `.cache/`).
- **El código legado va a `legacy/`** (solo lectura, sin `build/`) como referencia; no se porta línea por línea.

---

## 11. Plan de construcción de la V1 (cortes verticales)

0. **Cimientos:** repo, Vite + TS + PWA, tokens de diseño, componentes base, capa de datos (Dexie + repositorios), pruebas, CI local.
1. **Acceso:** Bienvenida → Registro/Login (modal) → Perfil (plantel; PIN opcional) → Desbloqueo → Cerrar sesión.
2. **Grado:** asistente **Abrir grado** (año escolar, grado, sección, indicadores A–E), selector de grado si hay varios, editar/archivar.
3. **Estudiantes / Matrícula:** lista con búsqueda y filtro, modal agregar/editar/eliminar, **pegar lista** e **importar CSV**, estado vacío con búho dormido.
4. **Asistencia:** pasar lista por fecha (Presente/Ausente/Justificada) en 1–2 toques por niño, conteos por niño.
5. **Evaluación:** cuadrícula de 3 momentos con literal A–E, "sin evaluar", observación libre, literal final manual.
6. **Inicio · Hoy:** resumen (pasar lista, distribución por literal, niños que requieren atención).
7. **Ajustes y respaldo:** plantel, PIN, **exportar/restaurar**, guía de instalación.
8. **Endurecimiento:** offline completo, prueba de actualización del service worker, accesibilidad, rendimiento, E2E en móvil y PC.

### Criterios de aceptación de la V1
- Se instala como PWA en Android, iOS y escritorio, y **funciona sin conexión**.
- Un docente puede: crear cuenta/entrar, abrir un grado con indicadores, **registrar estudiantes** (modal, lista pegada o CSV), pasar lista, asignar literales por momento, asignar literal final y hacer respaldo/restauración.
- **Sin evaluar** nunca se muestra como literal bajo.
- Identidad PeakNote reconocible (paleta, búho, modales, panel lateral) con UI **minimalista y sobria**.
- Sin PDF, sin calendario, sin sincronización (por diseño).
- Pruebas del dominio y E2E de los flujos principales en verde.

---

## 12. Checklist de lo que falta que el usuario defina (mínimo para no frenar)

1. **Login** (sección 7.1): confirmar cuenta local usuario+contraseña (defecto) vs. solo PIN.
2. **Campos de matrícula** (6.2): confirmar defecto o añadir.
3. **Indicadores por grado vs. por momento** y **observación por momento vs. anual** (6.5).
4. **Modo claro** y si los **acentos naranja/azul marino** del búho entran (8).
5. **Formatos PDF y calendario:** iteración posterior; el usuario explicará el formato específico de la boleta.
6. Si hay **capturas** de las pantallas viejas: opcionales (ya hay tokens extraídos del QSS).

---

## 13. Prompt de arranque para otra IA (copiar/pegar)

> Eres ingeniero de software senior (10+ años) especializado en migraciones de escritorio (Qt) a PWA. Lee **íntegro** `PEAKNOTE_CONOCIMIENTO.md` y respeta sus etiquetas (CONFIRMADO / SUPUESTO / PROPUESTA / ABIERTO). No inventes requisitos: lo ABIERTO se pregunta o se usa el valor por defecto indicado avisando. Construye la **V1 de PeakNote PWA** (offline, local, español de Venezuela, primaria, literales A–E, 3 momentos, asistencia Presente/Ausente/Justificada) con el stack de la sección 9, siguiendo el plan de cortes de la sección 11. **Fuera de alcance:** calendario/feriados y PDF. Diseño **minimalista y sobrio** con la identidad de la sección 5.3. Trabaja en tareas pequeñas, escribe pruebas del dominio, y al terminar cada corte entrega checklist de paridad. Antes de codificar un corte grande, muestra un plan breve.

---

*Fin del archivo. Si algo aquí contradice un mensaje más reciente del usuario, **gana el mensaje del usuario.***

---

## 14. Estado de implementación (V1 entregada · 15-nov-2026)

- **Construida** como PWA sin dependencias (JS moderno nativo, sin paso de build) porque en el entorno de desarrollo no se podían instalar paquetes. El stack de la sección 9 (Vite/React/Tailwind/Dexie/Workbox) quedó como **ruta de migración opcional**: dominio puro y `repo.*` ya están desacoplados de la UI.
- **Implementado:** bienvenida, login/registro local (PBKDF2+sal), perfil, abrir grado (indicadores A–E), matrícula (modal, pegar lista, CSV), Inicio·Hoy, asistencia, evaluación (3 momentos + final manual + observaciones), documentos (lista en pantalla), ajustes (varios grados, tema, contraseña, respaldo, instalación, borrar datos), offline.
- **Defaults aplicados a lo ABIERTO:** login = cuenta local usuario+contraseña (un docente por instalación, sin PIN separado); matrícula = apellidos, nombres, cédula escolar opcional; indicador único por grado; observación por niño y por momento; atención = D/E del último momento evaluado; tema oscuro por defecto + claro/sistema; sin acentos naranja/azul marino.
- **Pruebas:** 16 pruebas de dominio/importadores/respaldo/precaché (`node --test`) + recorrido E2E en Chromium móvil y PC, sin errores de consola.
- **Pendiente (siguiente iteración):** calendario escolar y % de inasistencia, boleta/matrícula/lista en PDF (el usuario explicará el formato), campos extra de matrícula, posible base de datos remota.
