import {
  closeSearchPreview,
  searchPreviewOpen,
  searchPreviewQuery,
} from '../../state/search-preview.js';

const placeholderItems = [
  'Product suggestions',
  'Category matches',
  'Helpful pages',
];

export function SearchPreview() {
  const isOpen = searchPreviewOpen.value;
  const query = searchPreviewQuery.value.trim();

  if (!isOpen) {
    return null;
  }

  return (
    <section
      class="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white"
      role="dialog"
      aria-label="Search preview"
    >
      <div class="mx-auto max-w-6xl px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">Search preview</p>
            <p class="mt-1 text-sm text-slate-700" aria-live="polite">
              {query ? `Previewing "${query}"` : 'Focus is active. Start typing to preview a search term.'}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex size-10 items-center justify-center rounded text-slate-700 focus:outline-none cursor-pointer"
            onClick={() => closeSearchPreview({ source: 'search-preview' })}
            aria-label="Close search preview"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              aria-hidden="true"
              class="size-6"
            >
              <path
                fill-rule="evenodd"
                d="M12 13.487 7.487 18 6 16.513 10.513 12 6 7.487 7.487 6 12 10.513 16.513 6 18 7.487 13.487 12 18 16.513 16.513 18z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>

        <ul class="mt-5 grid gap-3 md:grid-cols-3">
          {placeholderItems.map((item) => (
            <li class="rounded border border-slate-200 p-4" key={item}>
              <p class="text-sm font-semibold text-slate-950">{item}</p>
              <p class="mt-2 text-sm text-slate-600">Placeholder content for the search companion spike.</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default {
  component: SearchPreview,
};
