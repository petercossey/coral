# Coral

A lightweight starter for BigCommerce Stencil themes.

Coral keeps storefront rendering in Stencil and Handlebars, uses Vite for the CSS and JavaScript asset build, and adds Preact only for isolated interactive leaves.

## Quick Start

Coral is a Stencil theme, so local development needs Stencil CLI connected to a BigCommerce store. One-time setup:

1. Install [Stencil CLI](https://developer.bigcommerce.com/docs/storefront/stencil/cli/install) on a supported Node.js version: `npm install -g @bigcommerce/stencil-cli`.
2. Create a [Stencil-CLI API token](https://developer.bigcommerce.com/docs/storefront/stencil/cli/development-server#creating-stencil-api-credentials) in your store's control panel. Any store works, including a trial or sandbox store.
3. In this directory, run `npm install`, then `stencil init` with your store URL and access token. This writes local store config and credentials into the git-ignored `config.stencil.json` and `secrets.stencil.json`.

Then run the storefront:

```sh
npm run build
stencil start
```

`stencil start` owns storefront rendering. Vite runs only as the asset watcher configured in `stencil.conf.cjs`.

To validate and package the theme:

```sh
stencil bundle
```

New to Stencil? Read [docs/stencil-primer.md](docs/stencil-primer.md) for how templates, data, and page types work in Coral.

## Developer Guide

Coral is intentionally smaller than Cornerstone. Use Handlebars for page structure and initial data, then add JavaScript only where the storefront needs interaction.

Use plain theme modules in `assets/js/theme/` when JavaScript enhances server-rendered markup. Use Preact client components only when a specific UI leaf needs client-owned rendering, with optional `data-coral-load` hints when delayed mounting is safe. Keep Preact implementations in `assets/js/components/`; put simple `data-coral-component` mount roots inline where they are rendered.

Shared page context flows from templates into `window.Coral`, through `assets/js/context.js`, then into theme setup. Shared mutable state lives in `assets/js/state/`.

If you are used to Cornerstone, the useful mental model is still global setup plus optional page setup, but Coral avoids the PageManager class, jQuery plugin patterns, and broad folder structures until real use justifies them.

For the detailed JavaScript conventions, see [docs/javascript.md](docs/javascript.md).

## Project Layout

```text
config.json                 Theme metadata and variation config
stencil.conf.cjs            Stencil hooks that run the Vite asset build
lang/en.json                Required language file

assets/
  css/style.css             Tailwind CSS entry
  js/app.js                 Storefront JavaScript boot entry
  js/components/            Preact client component implementations
  js/context.js             Read-only adapter for window.Coral
  js/runtime/               Preact component discovery and mounting
  js/state/                 Shared signal state
  js/theme/                 Plain setup modules for server-rendered DOM
  dist/                     Ignored Vite build output

templates/
  layout/                   Base document layouts
  common/                   Shared structural regions for layout shells
  pages/                    Server-rendered Stencil pages
  components/               Reusable feature partials

docs/
  stencil-primer.md         Stencil orientation for developers new to BigCommerce
  javascript.md             Client component and theme module conventions
  *.md                      Feature design notes and workflow guides
```

The storefront references built assets with `{{cdn 'assets/dist/style.css'}}` and `{{cdn 'assets/dist/app.js'}}`. Do not use Stencil's `{{stylesheet}}` helper for Coral's main CSS.

Page templates define a `page` block and then render either `{{> layout/base}}` for normal storefront chrome or `{{> layout/empty}}` for chrome-free system pages such as checkout. Shared structural regions such as the site header, body wrapper, and footer live in `templates/common/`; `templates/components/` is reserved for reusable feature-specific Handlebars partials. Create a mount partial there only when the mount markup has meaningful template logic, reuse, or more structure than a local root element.

## Commands

- `npm run build` builds CSS and JavaScript into `assets/dist/`.
- `npm run dev` watches and rebuilds assets; this is run by `stencil start`.
- `stencil start` runs the local storefront.
- `stencil bundle` validates and packages the theme.

## Internationalization

Coral does not yet have a consistent internationalization approach. Storefront copy is hardcoded in templates and JavaScript, money fallbacks assume `$0.00`, and `lang/en.json` is minimal. A consistent `{{lang}}` and currency strategy is still to be tackled.

## Docs

- [docs/stencil-primer.md](docs/stencil-primer.md): Stencil orientation for developers new to BigCommerce.
- [docs/javascript.md](docs/javascript.md): stable JavaScript conventions for components, theme modules, state, and events.
- [docs/cart-state-and-ui-updates.md](docs/cart-state-and-ui-updates.md): cart state boundaries and update patterns.
- [docs/cart-drawer.md](docs/cart-drawer.md): cart drawer design and roadmap.
- [docs/add-to-cart-theme-enhancement.md](docs/add-to-cart-theme-enhancement.md): product-card add-to-cart enhancement design.
- [docs/theme-notifications.md](docs/theme-notifications.md): theme notification design.
- [docs/git-branching.md](docs/git-branching.md): lightweight human branching guide.
