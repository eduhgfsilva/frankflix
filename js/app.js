/**
 * Ponto de entrada da página inicial (index.html).
 */
import { hydrateIcons, h } from './dom.js';
import { loadCatalog, renderHome, CatalogError } from './catalog.js';
import { initNavigation, initRows } from './navigation.js';
import { createModal } from './modal.js';
import { initPresentation } from './presentation.js';

async function main() {
  hydrateIcons();
  initNavigation();

  const status = document.querySelector('[data-status]');
  document.documentElement.classList.add('is-loading');

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    showError(status, error);
    return;
  } finally {
    document.documentElement.classList.remove('is-loading');
  }

  try {
    const modal = createModal(document.querySelector('[data-modal]'), catalog);
    renderHome(catalog, { onOpen: (item, trigger) => modal.open(item, trigger) });
    initRows();
    initPresentation({
      dialog: document.querySelector('[data-presentation]'),
      trigger: document.querySelector('[data-presentation-open]'),
      catalog
    });
    hydrateIcons();
  } catch (error) {
    showError(status, error);
  }
}

function showError(status, error) {
  console.error('[FRANKFLIX]', error);
  const message = error instanceof CatalogError
    ? error.message
    : 'Ocorreu um erro inesperado ao montar o catálogo. Consulte o console do navegador para detalhes.';
  status.replaceChildren(
    h('p', { class: 'alert alert--error' },
      h('strong', null, 'Não foi possível carregar o catálogo. '),
      message
    )
  );
  document.documentElement.classList.add('has-error');
}

main();
