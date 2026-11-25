/**
 * Ponto de entrada da versão para impressão (print.html).
 * Monta o documento A4 a partir do mesmo data/catalog.json usado pelo site.
 */
import { h, paragraphs, safeUrl } from './dom.js';
import {
  loadCatalog, buildDetail, buildTimeline, buildVerdictQuestions,
  referenceList, creditsLine, CatalogError
} from './catalog.js';

const STORAGE_KEY = 'frankflix-student';
const FIELDS = [
  ['name', 'Aluno(a)'],
  ['class', 'Turma'],
  ['discipline', 'Disciplina'],
  ['teacher', 'Professor(a)'],
  ['school', 'Escola'],
  ['date', 'Data']
];

async function main() {
  const doc = document.getElementById('documento');
  const status = doc.querySelector('[data-status]');
  document.querySelector('[data-print]').addEventListener('click', () => window.print());

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error('[FRANKFLIX]', error);
    status.textContent = error instanceof CatalogError ? error.message : 'Erro inesperado ao carregar o catálogo.';
    status.classList.add('is-error');
    return;
  }

  const student = { ...catalog.student, ...readStored() };
  doc.replaceChildren(...buildDocument(catalog));
  initForm(student);
}

/* ------------------------------------------------------------------ */

function buildDocument(catalog) {
  const { meta, about, originals, mostWatched, verdict } = catalog;
  return [
    cover(meta),
    contents(catalog),
    h('section', { class: 'doc-section doc-about', id: 'p-apresentacao' },
      h('h2', null, '1. Apresentação'),
      h('h3', null, about.platformTitle),
      ...paragraphs(about.platform),
      h('h3', null, about.frankfurtTitle),
      ...paragraphs(about.frankfurt),
      h('h3', null, 'Linha do tempo'),
      buildTimeline(about.timeline),
      h('p', { class: 'doc-note' }, meta.ratingNote)
    ),
    h('section', { class: 'doc-section', id: 'p-originais' },
      h('h2', null, '2. Originais FRANKFLIX'),
      h('p', { class: 'doc-lead' }, 'Três produções fictícias que contam a história da Escola de Frankfurt.'),
      originals.map((item) => buildDetail(item, catalog, { level: 3, mode: 'print' }))
    ),
    h('section', { class: 'doc-section', id: 'p-top' },
      h('h2', null, '3. Mais Assistidos — Indústria Cultural'),
      h('p', { class: 'doc-lead' }, 'Os quatro títulos do ranking fictício. Cada um apresenta um conceito da Indústria Cultural com um exemplo atual.'),
      mostWatched.map((item) => buildDetail(item, catalog, { level: 3, mode: 'print' }))
    ),
    h('section', { class: 'doc-section doc-verdict', id: 'p-parecer' },
      h('h2', null, `4. Parecer final: ${verdict.title}`),
      verdict.notice ? h('aside', { class: 'notice' }, h('p', null, verdict.notice)) : null,
      h('p', { class: 'doc-note' }, verdict.scoreLabel),
      h('p', { class: 'doc-lead' }, verdict.intro),
      buildVerdictQuestions(verdict, 3),
      h('p', { class: 'verdict__conclusion' }, verdict.conclusion),
      h('div', { class: 'closing' },
        h('p', { class: 'closing__message' }, verdict.closingMessage),
        h('p', { class: 'closing__note' }, verdict.closingNote)
      )
    ),
    bibliography(catalog)
  ];
}

function cover(meta) {
  return h('section', { class: 'doc-cover', 'aria-label': 'Capa' },
    h('p', { class: 'doc-cover__event' }, `${meta.event} · ${meta.discipline} · ${meta.grade}`),
    h('img', { class: 'doc-cover__logo', src: 'assets/logo.svg', alt: 'FRANKFLIX', width: 610, height: 100 }),
    h('p', { class: 'doc-cover__tagline' }, meta.tagline),
    h('p', { class: 'doc-cover__slogan' }, meta.slogan),
    h('div', { class: 'doc-cover__art' }, h('img', { src: 'assets/images/backgrounds/hero.svg', alt: 'Ilustração noturna estilizada de Frankfurt am Main.', width: 1920, height: 1080 })),
    h('dl', { class: 'doc-cover__fields' },
      FIELDS.map(([key, label]) => h('div', null, h('dt', null, label), h('dd', { 'data-field': key })))
    ),
    h('p', { class: 'doc-cover__disclaimer' }, meta.disclaimer)
  );
}

function contents(catalog) {
  const entry = (text, children) => h('li', null, text, children ? h('ol', null, children.map((c) => h('li', null, c))) : null);
  return h('nav', { class: 'doc-section doc-toc', 'aria-label': 'Sumário' },
    h('h2', null, 'Sumário'),
    h('ol', null,
      entry('Apresentação: a FRANKFLIX e a Escola de Frankfurt'),
      entry('Originais FRANKFLIX', catalog.originals.map((i) => `${i.title}${i.subtitle ? ` — ${i.subtitle}` : ''} (${i.year})`)),
      entry('Mais Assistidos — Indústria Cultural', catalog.mostWatched.map((i) => `${i.concept}: ${i.title}`)),
      entry('Parecer final: por que você deveria cancelar a FRANKFLIX?'),
      entry('Referências bibliográficas e fontes das imagens')
    )
  );
}

function bibliography(catalog) {
  // Todas as referências citadas no catálogo, em ordem alfabética.
  const used = new Set([
    ...catalog.originals.flatMap((i) => i.references || []),
    ...catalog.mostWatched.flatMap((i) => i.references || []),
    ...(catalog.verdict.references || [])
  ]);
  const ids = [...used].sort((a, b) =>
    (catalog.references[a]?.citation || '').localeCompare(catalog.references[b]?.citation || '', 'pt-BR'));

  return h('section', { class: 'doc-section doc-biblio', id: 'p-referencias' },
    h('h2', null, '5. Referências bibliográficas'),
    referenceList(ids, catalog, 'refs refs--biblio'),
    h('h3', null, 'Fontes das imagens'),
    h('ul', { class: 'credits' }, (catalog.imageCredits || []).map((c) =>
      h('li', null, h('code', null, c.file), ' — ', c.description, ' ', h('em', null, c.license),
        c.url && safeUrl(c.url) ? [' ', safeUrl(c.url)] : null)
    )),
    h('p', { class: 'doc-credits' }, ...creditsLine(catalog.meta))
  );
}

/* ------------------------------------------------------------------ */
/* Formulário de identificação e opções                                */
/* ------------------------------------------------------------------ */

function initForm(student) {
  const form = document.querySelector('[data-student-form]');
  const body = document.body;

  const sync = () => {
    const data = {};
    FIELDS.forEach(([key]) => {
      const value = form.elements[key].value.trim();
      data[key] = value;
      document.querySelectorAll(`[data-field="${key}"]`).forEach((el) => {
        el.textContent = value;
        el.classList.toggle('is-empty', !value);
      });
    });
    body.classList.toggle('no-covers', !form.elements.covers.checked);
    body.classList.toggle('no-examples', !form.elements.examples.checked);
    store({ ...data, covers: form.elements.covers.checked, examples: form.elements.examples.checked });
  };

  FIELDS.forEach(([key]) => { form.elements[key].value = student[key] || ''; });
  ['covers', 'examples'].forEach((key) => {
    if (typeof student[key] === 'boolean') form.elements[key].checked = student[key];
  });
  form.addEventListener('input', sync);
  form.addEventListener('submit', (event) => event.preventDefault());
  sync();
}

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function store(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* armazenamento indisponível: os campos continuam funcionando nesta sessão */ }
}

main();
