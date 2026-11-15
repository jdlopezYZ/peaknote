/** Insignia de literal y selector (hoja) con el texto del indicador. */
import { h, modal, button } from '../core/dom.js';
import { LITERALES } from '../core/domain.js';

export function badge(literal, { size = 'md' } = {}) {
  return literal
    ? h('span', { class: `lit lit-${literal} lit-${size}`, 'aria-label': `Literal ${literal}` }, literal)
    : h('span', { class: `lit lit-none lit-${size}`, 'aria-label': 'Sin evaluar', title: 'Sin evaluar' }, '–');
}

/**
 * @param {{title:string, subtitle?:string, current?:string, indicadores:Record<string,string>, onPick:(l:string|null)=>void}} o
 */
export function literalSheet({ title, subtitle, current, indicadores, onPick }) {
  const list = h('div', { class: 'literal-list', role: 'radiogroup', 'aria-label': 'Literal' });
  const m = modal({
    title,
    variant: 'sheet',
    content: h('div', null, subtitle ? h('p', { class: 'dialog-text' }, subtitle) : null, list),
    footer: current ? [button({ label: 'Quitar evaluación', variant: 'ghost', onClick: () => { onPick(null); m.close(); } })] : null,
  });
  for (const l of LITERALES) {
    const txt = (indicadores?.[l] ?? '').trim();
    list.append(
      h(
        'button',
        { type: 'button', role: 'radio', 'aria-checked': String(current === l), class: `literal-opt${current === l ? ' is-selected' : ''}`, onClick: () => { onPick(l); m.close(); } },
        badge(l, { size: 'lg' }),
        h('span', { class: 'literal-text' }, txt || h('em', null, 'Sin texto de indicador')),
      ),
    );
  }
  return m;
}
