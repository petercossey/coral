import { useSignal } from '@preact/signals';
import { getContextValue } from '../../../assets/js/context.js';

function getImageUrl(product) {
  if (typeof product.image === 'string') {
    return product.image;
  }

  return product.image?.data ?? '';
}

function getPrice(product) {
  return (
    product.price?.without_tax?.formatted ??
    product.price?.with_tax?.formatted ??
    product.price?.formatted ??
    ''
  );
}

function ProductCard({ product }) {
  const imageUrl = getImageUrl(product);

  return (
    <article class="min-w-64 rounded border border-slate-200 bg-white">
      <a href={product.url} class="block">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.image?.alt ?? product.name ?? ''}
            class="h-48 w-full rounded-t bg-slate-100 object-cover"
            loading="lazy"
          />
        ) : (
          <div class="flex h-48 w-full items-center justify-center rounded-t bg-slate-100 text-sm text-slate-500">
            No image
          </div>
        )}
      </a>
      <div class="p-4">
        <a href={product.url} class="line-clamp-2 text-sm font-medium text-slate-950 hover:underline">
          {product.name}
        </a>
        <p class="mt-2 text-sm font-semibold text-slate-950">{getPrice(product)}</p>
      </div>
    </article>
  );
}

export function ProductCarousel({ products = [], title = 'Featured products' }) {
  const currentIndex = useSignal(0);
  const visibleProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  const canMove = visibleProducts.length > 1;

  function move(direction) {
    if (!canMove) {
      return;
    }

    currentIndex.value = (currentIndex.value + direction + visibleProducts.length) % visibleProducts.length;
  }

  return (
    <section class="w-full">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-xl font-semibold text-slate-950">{title}</h2>
        {canMove ? (
          <div class="flex gap-2">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 text-slate-950 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              onClick={() => move(-1)}
              aria-label="Previous product"
            >
              &lt;
            </button>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-300 text-slate-950 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              onClick={() => move(1)}
              aria-label="Next product"
            >
              &gt;
            </button>
          </div>
        ) : null}
      </div>

      {visibleProducts.length > 0 ? (
        <div class="overflow-hidden">
          <div
            class="flex gap-4 transition-transform duration-200"
            style={{ transform: `translateX(-${currentIndex.value * 17}rem)` }}
          >
            {visibleProducts.map((product) => (
              <ProductCard key={product.id ?? product.url} product={product} />
            ))}
          </div>
        </div>
      ) : (
        <div class="rounded border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No products are available for this carousel yet.
        </div>
      )}
    </section>
  );
}

export default {
  component: ProductCarousel,
  props(element) {
    return {
      products: getContextValue(element.dataset.contextKey, []),
      title: element.dataset.title || 'Featured products',
    };
  },
};
