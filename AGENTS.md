# AGENTS.md

## Project

Coral is a lightweight starter framework for BigCommerce Stencil themes. Build it from a mostly blank structure in small, deliberate steps.

Stencil is BigCommerce's native storefront theme framework. Themes are primarily Handlebars templates, packaged and validated by Stencil CLI.

## Direction

- Keep the starter theme minimal, contemporary, and easy to reason about.
- Prefer server-rendered Handlebars as the baseline.
- Add JavaScript only when an interaction needs it.
- When interactive widgets are introduced, prefer progressive enhancement with small Preact islands.
- Do not import Cornerstone's Sass architecture, JS PageManager framework, Grunt setup, or broad JavaScript conventions unless a specific need is proven.
- Avoid broad folder structures until repeated real use justifies them.

## Asset Pipeline

- Use npm for package management.
- Use Vite for JavaScript and CSS builds.
- Use Tailwind CSS through `@tailwindcss/vite`; do not add PostCSS unless another transform requires it.
- Source CSS from `assets/css/style.css` and source JavaScript from `assets/js/app.js`.
- Build output goes to ignored `assets/dist/` as `style.css` and `app.js`.
- Reference built assets with `{{cdn 'assets/dist/style.css'}}` and `{{cdn 'assets/dist/app.js'}}`.
- Bypass Stencil's built-in Sass pipeline; do not use `{{stylesheet}}` for Coral's main CSS unless we intentionally adopt Stencil Theme Editor stylesheet rewriting later.
- Do not run Vite as the storefront server. `stencil start` owns storefront rendering; Vite runs only as an asset watcher through `stencil.conf.cjs`.

## Local References

- Cornerstone reference theme: `/Users/peter.cossey/www/coral-project/cornerstone`
- Stencil CLI source reference: `/Users/peter.cossey/www/coral-project/stencil-cli`
- BigCommerce developer docs: `/Users/peter.cossey/www/coral-project/developer-docs`

Use Cornerstone and the docs to confirm Stencil expectations, template names, config shape, theme objects, and packaging behavior. Treat Cornerstone as reference material, not as a base to copy wholesale.

Use the globally installed `stencil` command for local validation. Do not run the local `stencil-cli` source tree as the project CLI.

## Working Style

- Make the smallest useful change that advances the starter kit.
- Preserve a clean, understandable theme structure over matching Cornerstone.
- Keep templates and data flow explicit.
- Introduce abstractions only after repeated real use.
- Prefer native browser APIs and platform features before adding client-side packages.
- Keep generated or bundled artifacts out of source unless the project intentionally adopts them.
- Update this file when validation rules or architecture decisions become real project conventions.

## Validation

For each meaningful theme change, verify as much of this as is practical:

- `npm run build` builds Vite assets.
- `stencil bundle` validates and packages the theme.
- `stencil start` can run the theme locally.
- Any introduced build, lint, or test command passes.

If validation cannot run because store credentials, `.stencil` config, dependencies, or another local prerequisite is missing, say that explicitly and include the next concrete step.

Do not leave long-running `stencil start` sessions active after validation unless the user asks for a dev server to stay running.

## BigCommerce Notes

- Theme configuration lives in `config.json`.
- Template context is exposed through Stencil Handlebars objects and helpers.
- Use `{{inject}}` / `{{jsContext}}` only when client-side code genuinely needs server-rendered context.
- Include Stencil-expected page templates as they become relevant, starting with `templates/pages/home.html` and `templates/pages/errors/404.html`.
- Storefront API work should be checked against the local developer docs before implementation.
- Keep the no-JavaScript experience functional wherever practical; Preact islands should enhance existing markup, not replace the whole page.
