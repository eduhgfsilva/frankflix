/**
 * Catálogo: carregamento do JSON e renderização dos componentes.
 * Os textos ficam todos em data/catalog.json; aqui só existe a estrutura visual.
 */
import { h, append, icon, paragraphs, safeImageSrc, safeUrl, uniqueId } from './dom.js';

const CATALOG_URL = new URL('../data/catalog.json', import.meta.url);

export class CatalogError extends Error {}

/** Carrega e valida o catálogo. Lança CatalogError com mensagem amigável. */
export async function loadCatalog() {
  let response;
  try {
    // no-cache: sempre confere com o servidor, para que edições no JSON apareçam ao recarregar.
    response = await fetch(CATALOG_URL, { cache: 'no-cache' });
  } catch (error) {
    throw new CatalogError('Não foi possível acessar data/catalog.json. Verifique se o site está sendo servido por HTTP (por exemplo, python3 -m http.server 8000).', { cause: error });
  }
  if (!response.ok) {
    throw new CatalogError(`O arquivo data/catalog.json não foi encontrado (HTTP ${response.status}).`);
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new CatalogError('O arquivo data/catalog.json contém um erro de sintaxe JSON. Verifique vírgulas e aspas.', { cause: error });
  }
  validate(data);
  return data;
}

function validate(data) {
  const problems = [];
  if (!data || typeof data !== 'object') problems.push('o conteúdo não é um objeto JSON');
  else {
    if (!data.meta) problems.push('falta a seção "meta"');
    for (const key of ['originals', 'mostWatched']) {
      if (!Array.isArray(data[key]) || data[key].length === 0) problems.push(`"${key}" deve ser uma lista não vazia`);
      else data[key].forEach((item, i) => {
        if (!item.id || !item.title) problems.push(`item ${i + 1} de "${key}" sem "id" ou "title"`);
      });
    }
    if (!data.verdict || !Array.isArray(data.verdict.questions)) problems.push('falta a seção "verdict" com "questions"');
  }
  if (problems.length) throw new CatalogError(`Catálogo inválido: ${problems.join('; ')}.`);
}

/** Sequência pedagógica de todas as produções. */
export function allTitles(catalog) {
  return [...catalog.originals, ...catalog.mostWatched];
}

export function isTop(item) {
  return typeof item.rank === 'number';
}

export function resolveReferences(ids, catalog) {
  return (ids || [])
    .map((id) => {
      const ref = catalog.references?.[id];
      if (!ref) console.warn(`[FRANKFLIX] Referência desconhecida: ${id}`);
      return ref ? { id, ...ref } : null;
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Componentes compartilhados (site, modal, apresentação e impressão)  */
/* ------------------------------------------------------------------ */

/** Capa 2:3 com título tipográfico sobreposto. */
export function buildPoster(item, { decorative = true, eager = false } = {}) {
  const top = isTop(item);
  const longestWord = Math.max(...item.title.split(/\s+/).map((w) => w.length));
  const classes = ['poster', top ? 'poster--top' : '', longestWord > 10 ? 'poster--long' : ''].filter(Boolean).join(' ');
  return h('div', { class: classes },
    h('img', {
      class: 'poster__img',
      src: safeImageSrc(item.cover?.src),
      alt: decorative ? '' : (item.cover?.alt || ''),
      width: 600,
      height: 900,
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async'
    }),
    h('span', { class: 'poster__shade', 'aria-hidden': 'true' }),
    h('span', { class: 'poster__brand', 'aria-hidden': 'true' }, 'F'),
    top ? h('span', { class: 'poster__ribbon', 'aria-hidden': 'true' }, 'TOP ', String(item.rank)) : null,
    h('span', { class: 'poster__text', 'aria-hidden': decorative ? null : 'true' },
      h('span', { class: 'poster__kicker' }, top ? item.concept : item.category),
      h('span', { class: 'poster__title' }, item.title),
      item.subtitle ? h('span', { class: 'poster__subtitle' }, item.subtitle) : null
    )
  );
}

export function buildRating(item) {
  if (!item.rating) return null;
  return h('span', { class: 'rating', title: 'Classificação temática fictícia' },
    h('span', { class: 'rating__age' }, item.rating.age),
    h('span', { class: 'rating__text' }, 'Classificação fictícia: ', item.rating.descriptors.join(', '))
  );
}

/** Botão "O que estão escondendo de você?" + painel revelável. */
export function buildReveal(item, { compact = false } = {}) {
  const panelId = uniqueId(`critica-${item.id}`);
  const panel = h('div', { class: 'reveal__panel', id: panelId, hidden: true },
    h('p', { class: 'reveal__label' }, 'A crítica'),
    h('p', null, item.criticalAnalysis)
  );
  const label = h('span', null, 'O que estão escondendo de você?');
  const button = h('button', {
    type: 'button',
    class: `reveal__btn${compact ? ' reveal__btn--compact' : ''}`,
    'aria-expanded': 'false',
    'aria-controls': panelId
  }, icon('eye'), label);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
  return h('div', { class: `reveal${compact ? ' reveal--compact' : ''}` }, button, panel);
}

/** Card da coleção Originais. */
export function buildCard(item, onOpen) {
  const open = h('button', {
    type: 'button',
    class: 'card__open',
    'aria-haspopup': 'dialog'
  }, buildPoster(item), h('span', { class: 'visually-hidden' }, ' — ver detalhes'));
  open.addEventListener('click', () => onOpen(item, open));

  return h('article', { class: 'card', 'aria-label': item.title },
    open,
    h('div', { class: 'card__info' },
      h('p', { class: 'card__meta' }, item.year, ' · ', item.format || item.category),
      buildRating(item),
      h('p', { class: 'card__tagline' }, item.tagline)
    )
  );
}

/** Card do ranking Mais Assistidos. */
export function buildTopCard(item, onOpen) {
  const open = h('button', {
    type: 'button',
    class: 'card__open',
    'aria-haspopup': 'dialog'
  }, buildPoster(item), h('span', { class: 'visually-hidden' }, ` — ${item.rank}º lugar, conceito ${item.concept}. Ver detalhes`));
  open.addEventListener('click', () => onOpen(item, open));

  return h('article', { class: 'card card--top', 'aria-label': `${item.rank}º — ${item.title}` },
    h('span', { class: 'card__rank', 'aria-hidden': 'true' }, String(item.rank)),
    h('div', { class: 'card__body' },
      open,
      h('div', { class: 'card__info' },
        h('p', { class: 'card__concept' }, h('span', null, 'Conceito: '), item.concept),
        h('p', { class: 'stamp' }, item.badge),
        buildReveal(item, { compact: true })
      )
    )
  );
}

function section(title, level, className, ...content) {
  const filtered = content.flat().filter(Boolean);
  if (!filtered.length) return null;
  return h('section', { class: `detail__section ${className || ''}`.trim() },
    h(`h${Math.min(level, 6)}`, { class: 'detail__heading' }, title),
    ...filtered
  );
}

function conceptList(concepts) {
  if (!concepts?.length) return null;
  return h('dl', { class: 'concepts' },
    concepts.map((c) => h('div', { class: 'concepts__item' }, h('dt', null, c.term), h('dd', null, c.definition)))
  );
}

function authorList(authors) {
  if (!authors?.length) return null;
  return h('ul', { class: 'cast' },
    authors.map((a) => h('li', { class: 'cast__item' },
      h('span', { class: 'cast__avatar', 'aria-hidden': 'true' }, initials(a.name)),
      h('span', null, h('strong', null, a.name), ' ', h('span', { class: 'cast__years' }, `(${a.years})`), h('br'), a.role)
    ))
  );
}

function initials(name) {
  return name.split(/\s+/).filter((w) => /^[A-ZÀ-Ú]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}

function comparisonTable(comparison) {
  if (!comparison) return null;
  return h('div', { class: 'compare-wrap' },
    h('table', { class: 'compare' },
      h('caption', null, comparison.title),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, 'Aspecto'),
        h('th', { scope: 'col', class: 'compare__left' }, comparison.leftTitle),
        h('th', { scope: 'col', class: 'compare__right' }, comparison.rightTitle)
      )),
      h('tbody', null, comparison.rows.map((row) => h('tr', null,
        h('th', { scope: 'row' }, row.aspect),
        h('td', { class: 'compare__left' }, row.left),
        h('td', { class: 'compare__right' }, row.right)
      )))
    )
  );
}

export function referenceList(ids, catalog, className = 'refs') {
  const refs = resolveReferences(ids, catalog);
  if (!refs.length) return null;
  return h('ol', { class: className }, refs.map((ref) => {
    const url = ref.url ? safeUrl(ref.url) : null;
    return h('li', null,
      ref.citation,
      url ? [' Disponível em: ', h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url), '.'] : null
    );
  }));
}

function callout(kind, title, text) {
  if (!text) return null;
  return h('aside', { class: `callout callout--${kind}` }, h('p', { class: 'callout__title' }, title), h('p', null, text));
}

/**
 * Conteúdo completo de uma produção.
 * mode: 'modal' (interativo) ou 'print' (crítica sempre visível, sem botões).
 */
export function buildDetail(item, catalog, { level = 2, mode = 'modal', titleId } = {}) {
  const top = isTop(item);
  const sub = level + 1;
  const print = mode === 'print';

  const kicker = top
    ? `#${item.rank} em Mais Assistidos · ${item.category}`
    : `Original FRANKFLIX · ${item.format || ''} · ${item.category}`;

  const header = h('header', { class: 'detail__hero' },
    h('div', { class: 'detail__poster' }, buildPoster(item, { decorative: false, eager: true })),
    h('div', { class: 'detail__intro' },
      h('p', { class: 'detail__kicker' }, kicker),
      h(`h${level}`, { class: 'detail__title', id: titleId || null }, item.title),
      item.subtitle ? h('p', { class: 'detail__subtitle' }, item.subtitle) : null,
      h('p', { class: 'detail__meta' },
        item.year ? h('span', { class: 'chip' }, item.year) : null,
        top ? h('span', { class: 'chip chip--accent' }, `Conceito: ${item.concept}`) : null,
        buildRating(item)
      ),
      top ? h('p', { class: 'stamp stamp--lg' }, item.badge) : null,
      h('p', { class: 'detail__tagline' }, item.tagline),
      h('p', { class: 'detail__synopsis' }, h('strong', null, 'Sinopse. '), item.synopsis)
    )
  );

  const body = top
    ? [
        section('Explicação didática', sub, null, paragraphs(item.description)),
        section('Exemplo contemporâneo', sub, 'detail__example',
          item.contemporaryExample?.illustrative ? h('p', { class: 'tag-illustrative' }, 'Situação ilustrativa — não se refere a um caso ou criador específico') : null,
          h('p', null, item.contemporaryExample?.text)
        ),
        section('Relação entre o exemplo e o conceito', sub, null, paragraphs(item.relation)),
        print
          ? section('O que estão escondendo de você? — a crítica', sub, 'detail__critique', paragraphs(item.criticalAnalysis))
          : h('section', { class: 'detail__section detail__critique' }, buildReveal(item)),
        callout('nuance', 'Para não simplificar', item.nuance),
        h('div', { class: 'question-box' },
          h('p', { class: 'question-box__label' }, 'Pergunta para reflexão'),
          h('p', { class: 'question-box__text' }, item.reflectionQuestion)
        ),
        section('Conceitos principais', sub, null, conceptList(item.concepts)),
        section('Autores relacionados', sub, null, authorList(item.authors)),
        print && item.studentExample ? studentExampleBox(item.studentExample, sub) : null,
        section('Referências de pesquisa', sub, 'detail__refs', referenceList(item.references, catalog))
      ]
    : [
        h('div', { class: 'question-box' },
          h('p', { class: 'question-box__label' }, 'Pergunta central'),
          h('p', { class: 'question-box__text' }, item.centralQuestion),
          item.centralQuestionNote ? h('p', { class: 'question-box__note' }, item.centralQuestionNote) : null
        ),
        section('Explicação filosófica', sub, null, paragraphs(item.description)),
        section('Contexto histórico', sub, null, paragraphs(item.historicalContext)),
        item.comparison ? section('Comparação didática', sub, 'detail__compare', comparisonTable(item.comparison)) : null,
        callout('caution', 'Atenção ao rigor', item.caution),
        section('Conceitos fundamentais', sub, null, conceptList(item.concepts)),
        section('Elenco: autores relacionados', sub, null, authorList(item.authors)),
        h('aside', { class: 'summary-box' }, h('p', { class: 'summary-box__label' }, 'Resumo para o estudante'), h('p', null, item.studentSummary)),
        section('Referências', sub, 'detail__refs', referenceList(item.references, catalog))
      ];

  return h('article', { class: `detail detail--${top ? 'top' : 'original'}`, 'data-id': item.id },
    header,
    h('div', { class: 'detail__body' }, body)
  );
}

function studentExampleBox(example, level) {
  const text = example.text?.trim();
  const points = example.points?.length ? example.points : null;
  const images = (example.images || [example.image]).filter((img) => img?.src);
  const filled = Boolean(text || points || images.length);
  const variant = images.length > 1 ? ' student-example__body--gallery' : images[0]?.logo ? ' student-example__body--logo' : '';
  const figure = (image) => h('figure', { class: 'student-example__figure' },
    h('img', { src: image.src, alt: image.alt || '', loading: 'eager' }),
    image.credit ? h('figcaption', null, image.credit) : null
  );
  const content = filled
    ? h('div', { class: `student-example__body${variant}` },
        images.length > 1
          ? h('div', { class: 'student-example__gallery' }, images.map(figure))
          : images.length ? figure(images[0]) : null,
        h('div', { class: 'student-example__text' },
          example.title ? h('p', { class: 'student-example__title' }, example.title) : null,
          points ? h('ul', null, points.map((point) => h('li', null, point))) : null,
          text ? h('p', null, text) : null
        )
      )
    : h('div', { class: 'student-example__space', 'aria-hidden': 'true' });
  return h('section', { class: `detail__section student-example${filled ? ' is-filled' : ''}` },
    h(`h${Math.min(level, 6)}`, { class: 'detail__heading' }, 'Exemplo real'),
    h('p', { class: 'student-example__prompt' }, filled ? 'Exemplo escolhido pelo(a) estudante:' : example.prompt),
    content
  );
}

/** Autoria e licença: "© 2026 Autor · Licença MIT" (com link, se houver). */
export function creditsLine(meta) {
  const parts = [];
  if (meta.author) parts.push(`© ${meta.year ? `${meta.year} ` : ''}${meta.author}`);
  if (meta.license?.name) {
    const url = meta.license.url ? safeUrl(meta.license.url) : null;
    if (parts.length) parts.push(' · ');
    parts.push(url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, meta.license.name) : meta.license.name);
  }
  return parts;
}

export function buildTimeline(timeline) {
  if (!timeline?.length) return null;
  return h('ol', { class: 'timeline' },
    timeline.map((entry) => h('li', { class: 'timeline__item' },
      h('span', { class: 'timeline__year' }, entry.year),
      h('span', { class: 'timeline__text' }, entry.text)
    ))
  );
}

/* ------------------------------------------------------------------ */
/* Renderização da página inicial                                      */
/* ------------------------------------------------------------------ */

export function renderHome(catalog, { onOpen }) {
  const { meta, about, verdict } = catalog;
  const $ = (sel) => document.querySelector(sel);

  $('[data-hero-kicker]').textContent = meta.heroKicker;
  $('[data-hero-tagline]').textContent = meta.tagline;
  $('[data-hero-slogan]').textContent = meta.slogan;
  $('[data-hero-description]').replaceChildren(...paragraphs(meta.heroDescription));
  $('[data-hero-meta]').replaceChildren(
    h('span', { class: 'chip' }, meta.discipline),
    h('span', { class: 'chip' }, meta.grade),
    h('span', { class: 'chip' }, 'Escola de Frankfurt'),
    h('span', { class: 'chip chip--outline' }, meta.event)
  );
  $('[data-footer-disclaimer]').textContent = `${meta.disclaimer} ${meta.ratingNote}`;
  $('[data-footer-credits]').replaceChildren(...creditsLine(meta));

  $('[data-about]').replaceChildren(
    h('article', { class: 'about__col' },
      h('h3', null, about.platformTitle),
      ...paragraphs(about.platform)
    ),
    h('article', { class: 'about__col' },
      h('h3', null, about.frankfurtTitle),
      ...paragraphs(about.frankfurt)
    ),
    h('div', { class: 'about__timeline' },
      h('h3', null, 'Linha do tempo'),
      buildTimeline(about.timeline)
    )
  );

  fillRow($('[data-row="originals"]'), catalog.originals.map((item) => buildCard(item, onOpen)));
  fillRow($('[data-row="top"]'), catalog.mostWatched.map((item) => buildTopCard(item, onOpen)));

  renderVerdict($('[data-verdict]'), verdict, catalog);
}

function fillRow(row, cards) {
  const track = h('ul', { class: 'row__track', role: 'list' }, cards.map((card) => h('li', { class: 'row__item' }, card)));
  row.replaceChildren(
    h('button', { type: 'button', class: 'row__btn row__btn--prev icon-btn', 'aria-label': 'Rolar coleção para a esquerda', 'data-row-prev': true }, icon('left')),
    track,
    h('button', { type: 'button', class: 'row__btn row__btn--next icon-btn', 'aria-label': 'Rolar coleção para a direita', 'data-row-next': true }, icon('right'))
  );
}

function stars(score) {
  const total = 5;
  return h('p', { class: 'verdict__score', 'aria-label': `Nota fictícia: ${score} de ${total}` },
    Array.from({ length: total }, (_, i) => h('span', { class: i < score ? 'star star--on' : 'star', 'aria-hidden': 'true' }, '★'))
  );
}

export function buildVerdictQuestions(verdict, level = 3) {
  return h('ol', { class: 'verdict__questions' },
    verdict.questions.map((q, i) => h('li', { class: 'verdict__q' },
      h('article', null,
        h('header', { class: 'verdict__q-head' },
          h('span', { class: 'verdict__q-num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
          h('div', null,
            h(`h${level}`, { class: 'verdict__q-title' }, h('span', { class: 'visually-hidden' }, `Pergunta ${i + 1}: `), q.question),
            h('p', { class: 'verdict__q-short' }, q.shortAnswer)
          )
        ),
        h('div', { class: 'verdict__blocks' },
          q.blocks.map((block) => h('div', { class: `verdict__block verdict__block--${slug(block.label)}` },
            h('p', { class: 'verdict__block-label' }, block.label),
            h('p', null, block.text)
          ))
        )
      )
    ))
  );
}

function slug(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function renderVerdict(container, verdict, catalog) {
  const message = h('p', { class: 'verdict__cancel-msg', role: 'status' });
  const cancel = h('button', { type: 'button', class: 'btn btn--primary btn--lg' }, verdict.cancelButton);
  cancel.addEventListener('click', () => {
    message.textContent = verdict.cancelMessage;
    cancel.disabled = true;
  });

  // append() ignora valores vazios (ex.: sem aviso) — replaceChildren(null) escreveria "null".
  container.replaceChildren();
  append(container, [
    h('p', { class: 'section__kicker' }, verdict.kicker),
    h('h2', { id: 'cancele-title', class: 'verdict__title' }, verdict.title),
    stars(verdict.score),
    h('p', { class: 'verdict__score-label' }, verdict.scoreLabel),
    verdict.notice ? h('aside', { class: 'notice', role: 'note' }, h('p', null, verdict.notice)) : null,
    h('p', { class: 'verdict__intro' }, verdict.intro),
    buildVerdictQuestions(verdict, 3),
    h('p', { class: 'verdict__conclusion' }, verdict.conclusion),
    h('details', { class: 'verdict__refs' },
      h('summary', null, 'Referências do parecer'),
      referenceList(verdict.references, catalog)
    ),
    h('div', { class: 'closing' },
      h('p', { class: 'closing__message' }, verdict.closingMessage),
      h('p', { class: 'closing__note' }, verdict.closingNote),
      h('div', { class: 'closing__action' }, cancel, message)
    )
  ]);
}
