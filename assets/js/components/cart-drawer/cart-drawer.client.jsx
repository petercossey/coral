import { cartDrawerOpen, cartSummary, closeCartDrawer, seedCartSummary } from '../../state/cart.js';

function getItemLabel(quantity) {
  return quantity === 1 ? '1 item' : `${quantity} items`;
}

export function CartDrawer({ cartUrl = '/cart.php' }) {
  const isOpen = cartDrawerOpen.value;
  const summary = cartSummary.value;
  const quantity = summary?.quantity ?? 0;
  const subtotal = summary?.subtotal?.formatted || '$0.00';
  const hasCartItems = quantity > 0;

  return (
    <div
      class={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={isOpen ? 'false' : 'true'}
      inert={!isOpen}
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
            class="inline-flex size-10 items-center justify-center rounded text-slate-700 focus:outline-none cursor-pointer"
            onClick={closeCartDrawer}
            aria-label="Close cart"
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

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {hasCartItems ? (
            <div class="flex flex-col gap-5">
              <div class="border border-slate-200 bg-slate-50 p-4">
                <h3 class="text-sm font-semibold text-slate-950">Cart summary</h3>
                <dl class="mt-4 flex flex-col gap-3">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-sm text-slate-600">Items</dt>
                    <dd class="text-sm font-semibold text-slate-950">{getItemLabel(quantity)}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                    <dt class="text-sm text-slate-600">Subtotal</dt>
                    <dd class="text-base font-semibold text-slate-950">{subtotal}</dd>
                  </div>
                </dl>
              </div>
              <p class="text-sm leading-6 text-slate-600">
                Open the full cart to review items, discounts, shipping, and checkout options.
              </p>
            </div>
          ) : (
            <div class="flex min-h-48 flex-col items-center justify-center border border-dashed border-slate-300 px-4 py-10 text-center">
              <p class="text-base font-semibold text-slate-950">Your cart is empty.</p>
              <p class="mt-2 max-w-64 text-sm leading-6 text-slate-600">Items you add will appear here.</p>
            </div>
          )}
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
    seedCartSummary({
      id: element.dataset.cartId || null,
      quantity: element.dataset.cartQuantity,
      subtotal: {
        formatted: element.dataset.cartSubtotal,
      },
    });

    return {
      cartUrl: element.dataset.cartUrl || '/cart.php',
    };
  },
};
