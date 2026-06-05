# Coral

A lightweight starter for BigCommerce Stencil themes.

## Current Shape

Coral is intentionally small:

- `config.json` defines theme metadata and the default variation.
- `templates/pages/home.html` is the first server-rendered page.
- `templates/pages/errors/404.html` prevents missing routes from failing local rendering.
- `assets/css/style.css` is the Tailwind CSS entry.
- `assets/js/app.js` is the JavaScript entry.
- `vite.config.ts` builds CSS and JavaScript into ignored `assets/dist/`.
- `stencil.conf.cjs` runs Vite during `stencil start` and before `stencil bundle`.
- `lang/en.json` keeps the language directory valid.

Local store config and credentials live in ignored `config.stencil.json` and `secrets.stencil.json`.

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
