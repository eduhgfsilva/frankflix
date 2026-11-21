/**
 * Modo Apresentação: percorre o catálogo na sequência pedagógica
 * (introdução → Escola de Frankfurt → Originais → Mais Assistidos → parecer → encerramento),
 * com letras grandes para projeção e controles de anterior/próximo.
 * Usa a Fullscreen API quando disponível; sem ela, o modo ocupa toda a janela.
 */
import { h, icon, paragraphs } from './dom.js';
import { buildPoster, buildReveal, buildTimeline } from './catalog.js';

export function initPresentation({ dialog, trigger, catalog }) {
  const stage = dialog.querySelector('[data-stage]');
  const counter = dialog.querySelector('[data-counter]');
  const bar = dialog.querySelector('[data-bar]');
  const prevBtn = dialog.querySelector('[data-prev]');
  const nextBtn = dialog.querySelector('[data-next]');
  const fsBtn = dialog.querySelector('[data-fullscreen]');
  const fsLabel = dialog.querySelector('[data-fullscreen-label]');
  const fsHint = dialog.querySelector('[data-fs-hint]');
  const live = dialog.querySelector('[data-live]');
  const closeBtn = dialog.querySelector('[data-presentation-close]');

  const slides = buildSlides(catalog);
  const root = document.documentElement;
  const fullscreenSupported = Boolean(document.fullscreenEnabled && root.requestFullscreen);
  let index = 0;

  if (!fullscreenSupported) {
    fsBtn.hidden = true;
    fsHint.textContent = 'Tela cheia não disponível neste navegador: use a tecla F11 ou o menu do navegador.';
  }

  function render() {
    const slide = slides[index];
    stage.replaceChildren(slide.render());
    stage.scrollTop = 0;
    counter.textContent = `${index + 1} / ${slides.length}`;
    bar.style.width = `${((index + 1) / slides.length) * 100}%`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    live.textContent = `Slide ${index + 1} de ${slides.length}: ${slide.label}`;
    // Um botão desabilitado perde o foco; mantém o foco dentro da apresentação.
    if (document.activeElement === nextBtn && nextBtn.disabled) prevBtn.focus();
    if (document.activeElement === prevBtn && prevBtn.disabled) nextBtn.focus();
  }

  function go(to) {
    const target = Math.max(0, Math.min(slides.length - 1, to));
    if (target === index) return;
    index = target;
    render();
  }

  async function enterFullscreen() {
    if (!fullscreenSupported || document.fullscreenElement) return;
    try {
      await root.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      fsHint.textContent = 'O navegador não permitiu a tela cheia. Use a tecla F11, se desejar.';
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* ignorado */ }
    }
  }

  function open() {
    index = 0;
    render();
    root.classList.add('is-locked', 'is-presenting');
    dialog.showModal();
    nextBtn.focus();
    enterFullscreen();
  }

  trigger.disabled = false;
  trigger.addEventListener('click', open);
  prevBtn.addEventListener('click', () => go(index - 1));
  nextBtn.addEventListener('click', () => go(index + 1));
  closeBtn.addEventListener('click', () => dialog.close());
  fsBtn.addEventListener('click', () => (document.fullscreenElement ? exitFullscreen() : enterFullscreen()));

  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fsLabel.textContent = active ? 'Sair da tela cheia' : 'Tela cheia';
    fsBtn.querySelector('[data-icon]').replaceChildren(icon(active ? 'shrink' : 'expand'));
  });

  // Ouvinte no documento: funciona mesmo se o foco sair dos controles.
  document.addEventListener('keydown', (event) => {
    if (!dialog.open) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select')) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault(); go(index + 1); break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault(); go(index - 1); break;
      case 'Home':
        event.preventDefault(); go(0); break;
      case 'End':
        event.preventDefault(); go(slides.length - 1); break;
      case 'f':
      case 'F':
        if (fullscreenSupported) { event.preventDefault(); fsBtn.click(); }
        break;
      default:
    }
  });

  dialog.addEventListener('close', () => {
    root.classList.remove('is-locked', 'is-presenting');
    exitFullscreen();
    trigger.focus();
  });
}

/* ------------------------------------------------------------------ */
/* Slides                                                               */
/* ------------------------------------------------------------------ */

function buildSlides(catalog) {
  const { meta, about, originals, mostWatched, verdict } = catalog;
  const slides = [];

  slides.push({
    label: 'Introdução',
    render: () => h('section', { class: 'slide slide--intro' },
      h('img', { class: 'slide__logo', src: 'assets/logo.svg', alt: 'FRANKFLIX', width: 610, height: 100 }),
      h('p', { class: 'slide__tagline' }, meta.tagline),
      h('p', { class: 'slide__slogan' }, meta.slogan),
      ...paragraphs(meta.heroDescription, 'slide__lead'),
      h('p', { class: 'slide__meta' }, `${meta.discipline} · ${meta.grade} · ${meta.event}`)
    )
  });

  slides.push({
    label: about.frankfurtTitle,
    render: () => h('section', { class: 'slide slide--about' },
      h('div', { class: 'slide__text' },
        h('p', { class: 'slide__kicker' }, 'Antes do catálogo'),
        h('h2', { class: 'slide__title' }, 'A Escola de Frankfurt'),
        points(about.keyPoints)
      ),
      h('div', { class: 'slide__aside' }, buildTimeline(about.timeline))
    )
  });

  originals.forEach((item, i) => slides.push({
    label: item.title,
    render: () => itemSlide(item, `Originais FRANKFLIX · ${i + 1} de ${originals.length} · ${item.year}`,
      h('p', { class: 'slide__question' }, h('span', null, 'Pergunta central'), item.centralQuestion)
    )
  }));

  mostWatched.forEach((item) => slides.push({
    label: `${item.rank}º ${item.title} — ${item.concept}`,
    render: () => itemSlide(item, `Mais Assistidos · Top ${item.rank} · Conceito: ${item.concept}`,
      [
        h('p', { class: 'stamp stamp--lg' }, item.badge),
        buildReveal(item),
        h('p', { class: 'slide__question' }, h('span', null, 'Para refletir'), item.reflectionQuestion)
      ]
    )
  }));

  verdict.questions.forEach((q, i) => slides.push({
    label: `Parecer final — pergunta ${i + 1}`,
    render: () => h('section', { class: 'slide slide--question' },
      h('p', { class: 'slide__kicker' }, `Cancele sua assinatura · Pergunta ${i + 1} de ${verdict.questions.length}`),
      h('h2', { class: 'slide__title slide__title--question' }, q.question),
      h('p', { class: 'slide__short' }, q.shortAnswer),
      points(q.keyPoints),
      h('p', { class: 'slide__note' }, 'Texto-base para revisão: apresente a sua própria opinião.')
    )
  }));

  slides.push({
    label: 'Encerramento',
    render: () => h('section', { class: 'slide slide--closing' },
      h('p', { class: 'slide__kicker' }, verdict.title),
      h('p', { class: 'slide__closing' }, verdict.closingMessage),
      h('p', { class: 'slide__note' }, verdict.closingNote),
      h('img', { class: 'slide__logo slide__logo--sm', src: 'assets/logo.svg', alt: 'FRANKFLIX', width: 610, height: 100 })
    )
  });

  return slides;
}

function itemSlide(item, kicker, extra) {
  return h('section', { class: 'slide slide--item' },
    h('div', { class: 'slide__poster' }, buildPoster(item, { decorative: false, eager: true })),
    h('div', { class: 'slide__text' },
      h('p', { class: 'slide__kicker' }, kicker),
      h('h2', { class: 'slide__title' }, item.title),
      item.subtitle ? h('p', { class: 'slide__subtitle' }, item.subtitle) : null,
      points(item.keyPoints),
      extra
    )
  );
}

function points(list) {
  return h('ul', { class: 'slide__points' }, (list || []).map((text) => h('li', null, text)));
}
