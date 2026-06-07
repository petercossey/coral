import { useSignal } from '@preact/signals';

function readInitialCount(element) {
  const count = Number.parseInt(element.dataset.initialCount ?? '', 10);

  return Number.isFinite(count) ? count : 0;
}

export function Counter({ initialCount = 0 }) {
  const count = useSignal(initialCount);

  return (
    <button
      type="button"
      onClick={() => {
        count.value += 1;
      }}
      class="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      Count: {count}
    </button>
  );
}

export default {
  component: Counter,
  props(element) {
    return {
      initialCount: readInitialCount(element),
    };
  },
};
