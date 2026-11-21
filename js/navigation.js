/**
 * Navegação: cabeçalho fixo, destaque da seção atual, rolagem suave
 * (respeitando prefers-reduced-motion) e setas das coleções horizontais.
 */
import { prefersReducedMotion } from './dom.js';

export function initNavigation() {
  initHeader();
  initScrollSpy();
  initScrollLinks();
}

function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initScrollSpy() {
  const links = new Map([...document.querySelectorAll('[data-nav]')].map((a) => [a.dataset.nav, a]));
  const sections = document.querySelectorAll('[data-spy]');
  if (!('IntersectionObserver' in window) || !sections.length) return;

  const setActive = (key) => {
    links.forEach((link, k) => {
      if (k === key) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.dataset.spy);
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach((section) => observer.observe(section));
}

/** Botões que rolam até uma seção e movem o foco para ela (acessível por teclado). */
function initScrollLinks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-scroll-to]');
    if (!link) return;
    const target = document.getElementById(link.dataset.scrollTo);
    if (!target) return;
    event.preventDefault();
    scrollToSection(target);
    history.replaceState(null, '', `#${target.id}`);
  });
}

export function scrollToSection(target) {
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** Ativa as setas de cada coleção horizontal. */
export function initRows(root = document) {
  root.querySelectorAll('.row').forEach((row) => {
    const track = row.querySelector('.row__track');
    const prev = row.querySelector('[data-row-prev]');
    const next = row.querySelector('[data-row-next]');
    if (!track || !prev || !next) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      row.classList.toggle('has-overflow', max > 0);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };

    const scrollByPage = (direction) => {
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };

    prev.addEventListener('click', () => scrollByPage(-1));
    next.addEventListener('click', () => scrollByPage(1));
    track.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    else window.addEventListener('resize', update);
    update();
  });
}
