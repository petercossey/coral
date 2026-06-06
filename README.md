# Coral

A lightweight starter for BigCommerce Stencil themes.

## Current Shape

Coral is intentionally small:

- `config.json` defines theme metadata and the default variation.
- `templates/pages/home.html` is the first server-rendered page.
- `templates/pages/errors/404.html` prevents missing routes from failing local rendering.
- `templates/components/cart-drawer/` contains a client-rendered cart drawer shell.
- `templates/components/product-carousel/` contains a client-rendered product carousel.
- `templates/components/header/cart-link.html` is server-rendered cart markup enhanced by a small theme module.
- `templates/components/counter/` remains a tiny co-located client component example.
- `assets/css/style.css` is the Tailwind CSS entry.
- `assets/js/app.js` is the JavaScript boot entry.
- `assets/js/runtime/` contains the client component runtime and explicit registry.
- `assets/js/state/` contains shared signal state when separate roots need the same value; cart state currently only tracks drawer visibility.
- `assets/js/theme/` contains global and page/area-specific setup for server-rendered markup.
- `vite.config.ts` builds CSS and JavaScript into ignored `assets/dist/`.
- `stencil.conf.cjs` runs Vite during `stencil start` and before `stencil bundle`.
- `lang/en.json` keeps the language directory valid.

The storefront references `{{cdn 'assets/dist/style.css'}}` and `{{cdn 'assets/dist/app.js'}}`. Vite may also emit lazy JavaScript chunks for client components; those stay in ignored `assets/dist/` and are loaded from the `app.js` entry.

Local store config and credentials live in ignored `config.stencil.json` and `secrets.stencil.json`.

## JavaScript Orientation

`assets/js/context.js` is the read-only bridge from Stencil templates to client code. Templates set `window.Coral.pageType` and `window.Coral.context`; `assets/js/app.js` passes page data into theme setup, and client components read named context values only when larger server data is needed. Theme modules enhance Handlebars DOM under `assets/js/theme/`, while shared mutable values live in `assets/js/state/`.

## Client Components

Use client components for isolated UI leaves that Preact should own. Keep the page shell and initial data server-rendered with Handlebars.

To add a client component:

1. Create a co-located partial and client module:

   ```text
   templates/components/example-widget/
     example-widget.html
     example-widget.client.jsx
   ```

2. Add one mount root to the partial:

   ```html
   <div
     data-coral-component="example-widget"
     data-title="{{title}}"
   ></div>
   ```

3. Export a component definition from the client module:

   ```jsx
   function ExampleWidget({ title }) {
     return <button type="button">{title}</button>;
   }

   export default {
     component: ExampleWidget,
     props(element) {
       return {
         title: element.dataset.title || 'Example',
       };
     },
   };
   ```

4. Register the component in `assets/js/runtime/registry.js`:

   ```js
   export const componentRegistry = {
     'example-widget': () => import('../../../templates/components/example-widget/example-widget.client.jsx'),
   };
   ```

   The registry key must match the partial's `data-coral-component` value.

The runtime in `assets/js/runtime/boot.js` scans for `[data-coral-component]`, imports only the registered components present on the current page, and mounts each root once. Do not import client components directly in `assets/js/app.js`.

Use `data-*` attributes for simple initial props. For larger server-rendered data, inject it with Stencil's `{{inject}}` / `{{jsContext}}`, pass a small `data-context-key`, and read it from `assets/js/context.js`.

Most client modules should export `component` and `props(element)`. A custom `mount(element, context)` function is available only for unusual cases; return a cleanup function so `unmountComponents()` can release effects before dynamic fragments are removed.

Do not use `data-coral-component` for JavaScript attached to server-rendered markup. Put that code under `assets/js/theme/<area>/` and call it from the relevant global or page setup module.

## Server-Rendered Theme Modules

Use `assets/js/theme/` when JavaScript enhances existing Handlebars markup instead of owning the rendered UI. Theme modules are plain setup functions imported explicitly by `assets/js/theme/global.js` or a future page module. They do not go in `componentRegistry`, and they do not use `data-coral-component`.

Prefer feature-specific data hooks, such as `data-cart-drawer-trigger` or `data-quantity-control`, over generic enhancement markers. Preserve the server-rendered fallback where practical: `templates/components/header/cart-link.html` remains a normal cart link, and its theme module only intercepts standard clicks when the cart drawer component exists on the page.

Theme modules receive a small environment object with `root`, `context`, and `pageType`. They can import shared state actions from `assets/js/state/` or use `assets/js/events.js` when they need to announce something happened.

## Setup

```sh
npm install
```

## Commands

Build assets:

```sh
npm run build
```

Validate and package the theme:

```sh
stencil bundle
```

Run the local storefront:

```sh
stencil start
```

Do not run Vite as the storefront server. Stencil CLI renders the storefront; Vite only builds watched assets through `stencil.conf.cjs`.
