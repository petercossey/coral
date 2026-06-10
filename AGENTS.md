# AGENTS.md

## Project

Coral is a lightweight starter framework for BigCommerce Stencil themes. Build it from a mostly blank structure in small, deliberate steps.

Stencil is BigCommerce's theme engine for building hosted storefronts. Themes are primarily Handlebars templates, packaged and validated by Stencil CLI.

## Direction

- Keep the starter theme minimal, contemporary, and easy to reason about.
- Use Tailwind utilities in a bare-bones starter-kit style: prefer layout, spacing, type, borders, and simple responsive behavior over branded visual polish.
- Keep default styling unopinionated: avoid decorative gradients, heavy shadows, hover flourishes, and branded color treatments.
- Use motion only when it communicates state, such as the cart drawer opening or cart count feedback, and respect `prefers-reduced-motion`.
- Prefer server-rendered Handlebars as the baseline and add JavaScript only when an interaction needs it.
- When interactive widgets are introduced, prefer small Preact client components at isolated leaves.
- Use plain theme setup modules for JavaScript that enhances server-rendered DOM.
- Avoid broad folder structures until repeated real use justifies them.

## Asset Pipeline

- Use npm for package management.
- Use Vite for JavaScript and CSS builds.
- Use Tailwind CSS through `@tailwindcss/vite`; do not add PostCSS unless another transform requires it.
- Source CSS from `assets/css/style.css` and source JavaScript from `assets/js/app.js`.
- `assets/js/app.js` is the small boot entry that starts Preact client components and server-rendered theme setup.
- `assets/js/context.js` is a read-only adapter for `window.Coral`; keep theme behavior in `assets/js/theme/` and mutable state in `assets/js/state/`.
- Preact client component code lives under `assets/js/components/<name>/`; simple `data-coral-component` roots may be written inline where they are rendered.
- Preact client component roots use `data-coral-component`; optional delayed mounting uses `data-coral-load="idle"` or `data-coral-load="visible"` when safe.
- JavaScript for server-rendered markup lives under `assets/js/theme/<area>/` as plain setup functions.
- Build output goes to ignored `assets/dist/` as `style.css` and `app.js`.
- Reference built assets with `{{cdn 'assets/dist/style.css'}}` and `{{cdn 'assets/dist/app.js'}}`.
- Bypass Stencil's built-in Sass pipeline; do not use `{{stylesheet}}` for Coral's main CSS.
- Do not run Vite as the storefront server. `stencil start` owns storefront rendering; Vite runs only as an asset watcher through `stencil.conf.cjs`.

## Local References

- Cornerstone reference theme: `/Users/peter.cossey/www/coral-project/cornerstone`
- Stencil CLI source reference: `/Users/peter.cossey/www/coral-project/stencil-cli`
- Stencil Utils source reference: `/Users/peter.cossey/www/coral-project/stencil-utils`
- BigCommerce developer docs: `/Users/peter.cossey/www/coral-project/developer-docs`

Use Cornerstone and the docs to confirm Stencil expectations, template names, config shape, theme objects, and packaging behavior. Treat Cornerstone as reference material, not as a base to copy wholesale.

Use the globally installed `stencil` command for local validation. Do not run the local `stencil-cli` source tree as the project CLI.

## Working Style

- Make the smallest useful change that advances the starter kit.
- Preserve a clean, understandable theme structure over matching Cornerstone.
- Keep templates and data flow explicit.
- Prefer native browser APIs and platform features before adding client-side packages.
- Keep generated or bundled artifacts out of source unless the project intentionally adopts them.
- Update this file when validation rules or architecture decisions become real project conventions.

## Docs

- Docs state principles and implemented behavior in present tense; they are conventions, not proposals.
- When a change implements or alters a documented design, update the doc in the same change.
- Keep future or not-yet-implemented work in a concise section at the end of the doc, such as Roadmap or Future Work; do not add status sections that need maintenance as features land.
- Give each convention one home and link to it instead of restating it.

## Template Layout

- Page templates define a `page` block and then render `{{> layout/base}}` or `{{> layout/empty}}`.
- Use `templates/layout/base.html` for normal storefront pages with the document shell, Coral assets, shared client mounts such as cart drawer and notifications, and shared structural partials.
- Use `templates/layout/empty.html` for chrome-free system pages such as checkout; add only the checkout-specific head/content that page needs.
- Keep shared structural regions such as header, body, and footer under `templates/common/`.
- Keep `templates/components/` for reusable feature-specific Handlebars partials, not client component implementations or broad layout structure. Add a Preact mount partial only when the mount markup needs meaningful template logic, reuse, or more structure than a local root element.

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
- Storefront API work should be checked against the local developer docs before implementation.
- No-JavaScript fallbacks are optional for client components; do not replace whole pages with Preact.
- Theme modules should preserve server-rendered fallbacks where practical.
