import { cartDrawerOpen, closeCartDrawer } from '../../../assets/js/state/cart.js';

export function CartDrawer({ cartUrl = '/cart.php' }) {
  const isOpen = cartDrawerOpen.value;

  return (
    <div
      // #TODO: When closed, keep drawer controls out of the tab order; pointer-events alone only prevents mouse interaction.
      class={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={isOpen ? 'false' : 'true'}
    >
      <button
        type="button"
        class={`absolute inset-0 bg-slate-950/30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeCartDrawer}
        aria-label="Close cart"
      />
      <aside
        class={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-semibold text-slate-950">Cart</h2>
          <button
            type="button"
            class="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            onClick={closeCartDrawer}
          >
            Close
          </button>
        </div>

        <div class="min-h-0 flex-1 px-5 py-6">
          {/* #todo Implement cart contents after the data source and refresh strategy are settled. */}
        </div>

        <div class="border-t border-slate-200 px-5 py-4">
          <a
            href={cartUrl}
            class="inline-flex w-full items-center justify-center rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            View cart
          </a>
        </div>
      </aside>
    </div>
  );
}

export default {
  component: CartDrawer,
  props(element) {
    return {
      cartUrl: element.dataset.cartUrl || '/cart.php',
    };
  },
};
