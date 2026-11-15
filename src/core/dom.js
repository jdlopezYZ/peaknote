/** Utilidades de DOM sin dependencias: h(), iconos, modales (<dialog>), toasts, campos y botones. */

const SVG = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.6 3.5 2.6 3.5 5.6"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  more: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  note: '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M8 9h8M8 13h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

export function icon(name, size = 20) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[name] ?? ''}</svg>`;
  return span;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

/** Fábrica de elementos. Eventos: onClick, onInput… Atributos: se asignan como propiedad si existe, si no como atributo. */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && !['list', 'form'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export const clear = (el) => {
  while (el.firstChild) el.firstChild.remove();
  return el;
};

/* ---------- Botones ---------- */

export function button({ label, variant = 'secondary', icon: ic, onClick, type = 'button', ariaLabel, className = '', disabled } = {}) {
  return h(
    'button',
    { type, class: `btn btn-${variant} ${className}`.trim(), onClick, 'aria-label': ariaLabel, disabled },
    ic ? icon(ic, 18) : null,
    label ? h('span', null, label) : null,
  );
}

export function iconButton({ icon: ic, label, onClick, className = '' }) {
  return h('button', { type: 'button', class: `icon-btn ${className}`.trim(), 'aria-label': label, title: label, onClick }, icon(ic, 20));
}

/* ---------- Campos de formulario ---------- */

let fieldSeq = 0;
export function field({ label, value = '', type = 'text', textarea = false, hint, error, rows = 3, select, ...attrs } = {}) {
  const id = `f${++fieldSeq}`;
  let input;
  if (select) {
    input = h('select', { id, class: 'input', ...attrs }, ...select.map((o) => h('option', { value: o.value ?? o, selected: (o.value ?? o) === value }, o.label ?? o)));
  } else if (textarea) {
    input = h('textarea', { id, class: 'input', rows, ...attrs });
    input.value = value;
  } else {
    input = h('input', { id, class: 'input', type, ...attrs });
    input.value = value;
  }
  const errEl = h('p', { class: 'field-error', role: 'alert', id: `${id}-err` });
  const hintEl = hint ? h('p', { class: 'field-hint', id: `${id}-hint` }, hint) : null;
  const el = h('div', { class: 'field' }, h('label', { for: id }, label), input, hintEl, errEl);
  const setError = (msg) => {
    errEl.textContent = msg || '';
    input.toggleAttribute('aria-invalid', !!msg);
    if (msg) input.setAttribute('aria-describedby', errEl.id);
    else input.removeAttribute('aria-describedby');
  };
  input.addEventListener('input', () => setError(''));
  if (error) setError(error);
  return { el, input, setError, get value() { return input.value; } };
}

export function segmented({ options, value, onChange, label }) {
  const root = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
  const paint = () =>
    [...root.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === String(value)));
    });
  options.forEach((o) => {
    root.append(
      h('button', {
        type: 'button',
        dataset: { value: String(o.value) },
        onClick: () => {
          value = o.value;
          paint();
          onChange?.(value);
        },
      }, o.label),
    );
  });
  paint();
  return root;
}

/* ---------- Modales ---------- */

/**
 * Modal sobre <dialog> nativo (foco atrapado, Esc, inertizado del fondo).
 * variant: 'modal' (centrado) | 'sheet' (hoja inferior en móvil, centrado en PC)
 */
export function modal({ title, titleImage, content, footer, variant = 'modal', dismissible = true, onClose, className = '' } = {}) {
  const dialog = h('dialog', { class: `dialog dialog-${variant} ${className}`.trim() });
  const closeBtn = dismissible ? iconButton({ icon: 'x', label: 'Cerrar', onClick: () => api.close() }) : null;
  const heading = titleImage
    ? h('img', { class: 'dialog-title-img', src: titleImage, alt: title, width: 320, height: 90 })
    : h('h2', { class: 'dialog-title' }, title);
  dialog.append(h('div', { class: 'dialog-head' }, heading, closeBtn), h('div', { class: 'dialog-body' }, content));
  if (footer) dialog.append(h('div', { class: 'dialog-foot' }, footer));
  const api = {
    dialog,
    close(result) {
      if (!dialog.open) return;
      dialog.dataset.result = result === undefined ? '' : String(result);
      dialog.classList.add('closing');
      const done = () => {
        dialog.close();
        dialog.remove();
        onClose?.(result);
      };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
      else setTimeout(done, 160);
    },
  };
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (dismissible) api.close();
  });
  if (dismissible) {
    dialog.addEventListener('mousedown', (e) => {
      if (e.target === dialog) api.close();
    });
  }
  document.body.append(dialog);
  dialog.showModal();
  return api;
}

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const m = modal({
      title,
      variant: 'modal',
      content: h('p', { class: 'dialog-text' }, message),
      footer: [
        button({ label: cancelLabel, variant: 'ghost', onClick: () => m.close() }),
        button({ label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => { answer = true; m.close(); } }),
      ],
      onClose: () => resolve(answer),
    });
  });
}

/* ---------- Toasts ---------- */

export function toast(message, { action, timeout = 3500, kind = 'info' } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const t = h('div', { class: `toast toast-${kind}` }, h('span', null, message));
  if (action) {
    t.append(
      h('button', { type: 'button', class: 'toast-action', onClick: () => { action.onClick(); t.remove(); } }, action.label),
    );
  }
  host.append(t);
  if (timeout) setTimeout(() => t.remove(), timeout);
  return t;
}

/* ---------- Estado vacío ---------- */

export function emptyState({ image, title, text, action }) {
  return h(
    'div',
    { class: 'empty' },
    image ? h('img', { src: image, alt: '', width: 160, height: 160, class: 'empty-img', loading: 'lazy' }) : null,
    h('h3', null, title),
    text ? h('p', null, text) : null,
    action ?? null,
  );
}

export function formatLongDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
}

export function formatShortDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
