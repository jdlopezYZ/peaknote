# Reglas del proyecto (Claude y agentes de Antigravity)

Lee primero `docs/PEAKNOTE_CONOCIMIENTO.md`: es la fuente de verdad. Etiquetas: CONFIRMADO / SUPUESTO / PROPUESTA / ABIERTO. Lo ABIERTO se pregunta; no se inventa.

- Idioma de UI y mensajes: español de Venezuela. Fechas `dd/mm/aaaa`.
- **Fuera de alcance:** calendario/feriados y PDF, hasta que el usuario lo pida.
- Dominio (`src/core/domain.js`) = funciones puras con prueba. Nada de DOM/IndexedDB ahí.
- La UI solo accede a datos vía `repo.*` (`src/core/db.js`). Cambios de estructura → subir `SCHEMA_VERSION`, migrar en `upgrade()` y en `migrateBackup()`.
- Estilos: solo variables de `tokens.css`; sin colores sueltos. Paleta PeakNote (teal `#063737` → menta `#18C3A6`, panel `#263238`, botón + `#4CAF50`). Minimalista y sobrio.
- "Sin evaluar" jamás se trata como literal bajo. Las justificadas no cuentan como inasistencia.
- Accesibilidad: foco visible, áreas táctiles ≥ 44 px, literal siempre con letra (no solo color), respetar `prefers-reduced-motion`.
- Al añadir/quitar archivos: `npm run sw`; al publicar: subir `VERSION` en `sw.js`.
- Antes de dar algo por terminado: `npm test` y recorrer el flujo en móvil y PC.
