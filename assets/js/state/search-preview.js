import { signal } from '@preact/signals';
import { emit } from '../events.js';

export const searchPreviewOpen = signal(false);
export const searchPreviewQuery = signal('');

function normalizeQuery(query) {
  return String(query ?? '');
}

function emitSearchPreviewEvent(topic, source = 'header') {
  emit(topic, {
    open: searchPreviewOpen.value,
    query: searchPreviewQuery.value,
    source,
  });
}

export function activateSearchPreview(query = '', { source = 'header' } = {}) {
  searchPreviewQuery.value = normalizeQuery(query);
  searchPreviewOpen.value = true;
  emitSearchPreviewEvent('search-preview:activated', source);
}

export function updateSearchPreviewQuery(query = '', { source = 'header' } = {}) {
  searchPreviewQuery.value = normalizeQuery(query);

  if (!searchPreviewOpen.value) {
    searchPreviewOpen.value = true;
  }

  emitSearchPreviewEvent('search-preview:query-change', source);
}

export function closeSearchPreview({ source = 'header' } = {}) {
  if (!searchPreviewOpen.value) {
    return;
  }

  searchPreviewOpen.value = false;
  emitSearchPreviewEvent('search-preview:closed', source);
}
