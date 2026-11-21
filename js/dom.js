/**
 * Pequenos utilitários de DOM.
 * Todo texto vindo do catálogo é inserido como texto (textContent / nós de texto),
 * nunca como HTML — assim nenhum conteúdo do JSON é interpretado como marcação.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  play: 'M8 5v14l11-7z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  left: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z',
  right: 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  expand: 'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  shrink: 'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z',
  print: 'M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zm-3 11H8v-5h8zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM18 3H6v4h12z',
  eye: 'M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  screen: 'M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7v2H8v2h8v-2h-2v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18z'
};

/** Cria um elemento: h('p', { class: 'x' }, 'texto', outroNo) */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Ícone SVG decorativo (aria-hidden). */
export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name] || '');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/** Substitui os marcadores <span data-icon="nome"> do HTML estático por ícones. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((slot) => {
    if (!slot.firstChild) slot.append(icon(slot.dataset.icon));
  });
}

/** Lista de parágrafos a partir de string ou array de strings. */
export function paragraphs(content, className) {
  const list = Array.isArray(content) ? content : content ? [content] : [];
  return list.map((text) => h('p', { class: className }, text));
}

/** Aceita apenas caminhos locais de imagem (evita URLs externas ou esquemas perigosos). */
export function safeImageSrc(src) {
  return typeof src === 'string' && /^assets\/[\w\-/.]+\.(svg|png|jpe?g|webp|avif)$/i.test(src) && !src.includes('..')
    ? src
    : 'assets/favicon.svg';
}

/** Aceita apenas links http(s). */
export function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

let uid = 0;
export function uniqueId(prefix = 'id') {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
