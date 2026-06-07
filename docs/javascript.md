# Coral JavaScript Guide

## Purpose

This guide documents Coral's JavaScript conventions: how storefront data reaches client code, when to use Preact, and how theme modules enhance server-rendered markup.

Coral is primarily a server-rendered BigCommerce Stencil theme. Handlebars templates provide the page structure and initial data. JavaScript is added only where the storefront needs interaction.

Coral uses two small JavaScript models:

1. **Client components**: isolated Preact components mounted into `data-coral-component` roots.
2. **Theme modules**: plain JavaScript setup functions that enhance existing server-rendered DOM.

These models run side by side. Preact owns client-rendered leaves. Theme modules add behavior to Handlebars markup. Shared state and native events let them coordinate when needed.

Short model: templates publish page data to `window.Coral`; `context.js` reads it; `app.js` passes the same page environment into client component mounting and theme setup. Keep durable state in `assets/js/state/` and DOM behavior in `assets/js/theme/`.

## Boot Flow

`assets/js/app.js` is the storefront boot entry. It should stay boring:

```js
import '../css/style.css';
import { getCoralContext, getCoralPageType } from './context.js';
import { bootComponents } from './runtime/boot.js';
import { componentRegistry } from './runtime/registry.js';
import { bootTheme } from './theme/boot.js';

document.documentElement.classList.add('js');

const env = {
  pageType: getCoralPageType(),
  context: getCoralContext(),
};

bootComponents(componentRegistry, env);
bootTheme(env);
```

Stencil templates expose the current page type and injected context before `app.js` loads:

```html
<script nonce="{{nonce}}">
  window.Coral = window.Coral || {};
  window.Coral.pageType = '{{page_type}}';
  window.Coral.context = JSON.parse({{jsContext}});
</script>
<script nonce="{{nonce}}" type="module" src="{{cdn 'assets/dist/app.js'}}"></script>
```

This is inspired by Cornerstone's useful PageManager idea: global setup runs on every page, and page setup can run by `page_type`. Coral does not copy Cornerstone's class structure, jQuery assumptions, or broad plugin conventions.

## File Layout

Current JavaScript layout:

```text
assets/js/
  app.js
  context.js
  events.js
  runtime/
    boot.js
    registry.js
  state/
    cart.js
  theme/
    boot.js
    global.js
    header/
      header-cart.js

templates/components/
  cart-drawer/
    cart-drawer.html
    cart-drawer.client.jsx
```

Grow this only when real pages or repeated interactions need it.

## Client Components

Use client components for isolated UI leaves that Preact should own.

Markup:

```html
<div
  data-coral-component="counter"
  data-initial-count="{{initial_count}}"
></div>
```

Module:

```jsx
function Counter({ initialCount = 0 }) {
  return <button type="button">Count: {initialCount}</button>;
}

export default {
  component: Counter,
  props(element, mountContext) {
    return {
      initialCount: Number.parseInt(element.dataset.initialCount ?? '0', 10),
    };
  },
};
```

Client component modules export a definition object:

```js
export default {
  component,
  props(element, mountContext) {},
  mount(element, mountContext) {},
};
```

Most components should use `component` and `props()`. The `mount()` function is an escape hatch for unusual client modules that need to own their own rendering or third-party setup, and may return a cleanup function.

`mountContext` includes:

- `name`: the registered component name.
- `root`: the document or subtree being mounted.
- `pageType`: the current Stencil `page_type`.
- `context`: injected `window.Coral.context` data.

Use `data-coral-load` when a Preact root should not mount immediately:

```html
<div
  data-coral-component="recommendations-carousel"
  data-coral-load="visible"
></div>
```

Supported loading modes:

- Omitted or `immediate`: import and mount as soon as the runtime boots.
- `idle`: wait for browser idle time, with a short timeout fallback.
- `visible`: wait until the root enters the viewport, with an immediate fallback when `IntersectionObserver` is unavailable.

Use `idle` for non-critical components that can appear after the first page interaction path has settled. Do not use it for UI that a shopper may trigger immediately, such as menus, search, product options, or the cart drawer.

Rules:

- Use `data-coral-component="<name>"` only for Preact client component mounts.
- Use lower-case kebab-case names.
- Keep initial props in simple `data-*` attributes where practical.
- Use injected JSON context only when the client genuinely needs larger server-rendered data.
- Use `data-coral-load` only for client components that can safely mount after initial boot.
- Register components explicitly in `assets/js/runtime/registry.js`.
- Do not put theme modules in the component registry.

The component runtime owns discovery, lazy imports, loading hints, one-time mounting, and unmounting for Preact roots.

## Theme Modules

Use theme modules for JavaScript that enhances server-rendered Handlebars markup.

Coral's current Theme Module model is explicit setup functions. Templates use feature-specific hooks, and `assets/js/theme/boot.js` decides which setup functions run globally or by page type.

Theme modules are plain setup functions:

```js
import { openCartDrawer } from '../../state/cart.js';

const triggerSelector = '[data-cart-drawer-trigger]';
const drawerSelector = '[data-coral-component="cart-drawer"]';

function isStandardClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function setupHeaderCart({ root = document } = {}) {
  if (!document.querySelector(drawerSelector)) {
    return;
  }

  for (const link of root.querySelectorAll(triggerSelector)) {
    link.addEventListener('click', (event) => {
      if (!isStandardClick(event)) {
        return;
      }

      event.preventDefault();
      openCartDrawer();
    });
  }
}
```

Global setup imports the modules that should run on every page:

```js
import { setupHeaderCart } from './header/header-cart.js';

export function setupGlobal(env = {}) {
  setupHeaderCart(env);
}
```

Page-specific setup can be added later through `assets/js/theme/boot.js`:

```js
const pageModules = {
  product: () => import('./product.js'),
  cart: () => import('./cart.js'),
};
```

Rules:

- Keep theme modules under `assets/js/theme/<area>/`.
- Export setup functions named after the feature, such as `setupHeaderCart()` or `setupProductForm()`.
- Use feature-specific data hooks such as `data-cart-drawer-trigger` or `data-quantity-control`.
- Preserve server-rendered fallbacks where practical.
- Keep page setup explicit; do not add a global enhancement registry or generic `data-coral-enhancement` marker yet.
- Do not introduce a PageManager class unless repeated real use proves it would simplify the theme.

## Future Declarative Theme Modules

A future Coral version may add declarative Theme Modules for repeated element-level behaviors. This would let templates declare the behavior they need while the runtime lazy-loads only matching modules.

Potential markup:

```html
<form
  action="/cart/add"
  method="post"
  data-coral-module="cart.add"
  data-cart-open-on-success
>
  ...
</form>
```

Potential module contract:

```js
export default function cartAddModule(element, env) {
  const handleSubmit = async (event) => {
    event.preventDefault();
    // Submit and update shared cart state.
  };

  element.addEventListener('submit', handleSubmit);

  return () => {
    element.removeEventListener('submit', handleSubmit);
  };
}
```

Do not implement this as a generic registry until there are enough repeated behaviors to justify the extra runtime. If Coral adopts it, the implementation should:

- Use the namespaced `data-coral-module` attribute, not a generic `data-module` attribute.
- Pass the same page environment used by components and explicit theme setup.
- Deduplicate booting for already-mounted elements.
- Require cleanup functions for modules that attach listeners or observers.
- Support subtree mounting and unmounting for dynamically inserted server-rendered fragments.
- Keep page-level orchestration in `assets/js/theme/boot.js` when behavior is truly page-wide.

## Shared State

Use `@preact/signals` when separate roots or theme modules need the same current value.

```js
import { signal } from '@preact/signals';

export const cartDrawerOpen = signal(false);

export function openCartDrawer() {
  cartDrawerOpen.value = true;
}

export function closeCartDrawer() {
  cartDrawerOpen.value = false;
}
```

Rules:

- Use component-local `useSignal()` for state owned by one component instance.
- Use module-level `signal()` for state shared by separate client roots or theme modules.
- Export named actions for state transitions that have meaning.
- Do not add a broader app-state library until Coral has app-like complexity.

## Events

Use native events for moments and notifications, not durable state.

Call `emit()` / `on()` with unprefixed event topics:

- `cart:item-added`
- `product:variant-selected`
- `modal:close-requested`

The helper owns the DOM namespace and dispatches full browser event names such as `coral:cart:item-added`.

Use shared state for current values such as whether the cart drawer is open. Use events when a module needs to announce that something happened and zero or more other modules may react.

## Current Cart Example

The header cart link is server-rendered markup with a normal `href` fallback. Its theme module intercepts only standard clicks when the cart drawer component exists, then calls `openCartDrawer()` from shared cart state.

That example shows the intended coordination:

- The header link remains Handlebars markup.
- The cart drawer remains a Preact client component.
- Shared cart state is the bridge between them.

## Future Work

Keep these decisions open until real features need them:

- Page-specific module mappings beyond the empty `pageModules` object.
- A cleanup lifecycle for theme modules.
- Stencil Utils integration versus direct storefront API calls.
- JSON prop helpers for complex client component data.
- Automatic component registration with `import.meta.glob()`.
- Dynamic fragment mounting policy.

Do not add Stimulus, Alpine, htmx, Turbo, a global enhancement registry, or a PageManager clone in the first pass.
