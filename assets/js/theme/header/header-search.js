import {
  activateSearchPreview,
  closeSearchPreview,
  updateSearchPreviewQuery,
} from '../../state/search-preview.js';

const formSelector = '[data-header-search-form]';
const inputSelector = '[data-header-search-input]';
const homePageType = 'default';

function readSearchQuery(input) {
  return input.value;
}

export function setupHeaderSearch({ root = document, pageType = '' } = {}) {
  if (pageType !== homePageType) {
    return;
  }

  for (const form of root.querySelectorAll(formSelector)) {
    const input = form.querySelector(inputSelector);

    if (!input) {
      continue;
    }

    form.addEventListener('focusin', () => {
      activateSearchPreview(readSearchQuery(input));
    });

    input.addEventListener('input', () => {
      updateSearchPreviewQuery(readSearchQuery(input));
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSearchPreview();
      }
    });
  }
}
