/**
 * Modal de detalhes, baseado no elemento nativo <dialog>:
 * showModal() torna o restante da página inerte (o foco fica preso no modal)
 * e a tecla Escape fecha o diálogo. Aqui cuidamos do conteúdo, do bloqueio
 * de rolagem do fundo e do retorno do foco ao card que abriu o modal.
 */
import { buildDetail } from './catalog.js';

export function createModal(dialog, catalog) {
  const body = dialog.querySelector('[data-modal-body]');
  const closeButton = dialog.querySelector('[data-modal-close]');
  let opener = null;

  closeButton.addEventListener('click', () => dialog.close());

  // Clique no fundo escurecido (fora do quadro) fecha o modal.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    body.replaceChildren();
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });

  function open(item, trigger) {
    opener = trigger || document.activeElement;
    body.replaceChildren(buildDetail(item, catalog, { level: 2, mode: 'modal', titleId: 'modal-title' }));
    document.documentElement.classList.add('is-locked');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    body.scrollTop = 0;
    closeButton.focus();
  }

  return { open, close: () => dialog.close() };
}
