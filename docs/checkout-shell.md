# Checkout Document Shell

Coral hosts BigCommerce Optimized One-Page Checkout in a chrome-free document. This page documents the shell conventions; it is not a custom checkout implementation.

## Layout

`templates/pages/checkout.html` renders through `{{> layout/empty}}`. The empty layout provides:

- UTF-8 charset and a mobile viewport (`width=device-width, initial-scale=1`)
- Favicon, `head.meta_tags`, and `head.config`
- A minimal `.sr-only` utility for accessible headings

It does not load Coral's theme stylesheet (`assets/dist/style.css`) or storefront chrome (header, footer, cart drawer, notifications, `app.js`). Tailwind Preflight from the theme CSS would otherwise compete with hosted checkout form and control styles.

## Checkout Template

The checkout page keeps the required BigCommerce emissions, each once:

| Emission | Role |
| --- | --- |
| `{{{ checkout.checkout_head }}}` | Hosted checkout head assets |
| `window.language = {{{langJson 'optimized_checkout'}}}` | Checkout localization data |
| `{{{ head.scripts }}}` | Storefront head scripts |
| Checkout header with store logo or name | Brand mark linking home |
| `{{{ checkout.checkout_content }}}` | Hosted checkout body |
| `{{{ footer.scripts }}}` | Storefront footer scripts |

The accessible page title uses Coral's `sr-only` class (same utility as other theme screens) on an `h1`, with the visible store identity in the following heading.

Missing `optimized_checkout` translation coverage is tracked in [#7](https://github.com/petercossey/coral/issues/7).

## Styling Boundaries

- Keep the shell chrome-free: no theme layout regions or client mounts.
- Do not load the main theme CSS on checkout; limit any theme CSS here to functional compatibility (today: `.sr-only` only).
- Hosted checkout appearance stays with BigCommerce's checkout assets and any future optimized-checkout theme stylesheet, not Tailwind utilities.

## Validation

- Inspect the generated document for a single charset, viewport, checkout head/content block, language script, and `head`/`footer` scripts.
- Open hosted checkout at mobile and desktop widths with a populated cart; confirm the visually hidden heading, keyboard focus into checkout controls, and that form controls are not flattened by theme base styles.
- Do not place a paid order as part of shell validation.
- `npm run build` and `stencil bundle` still apply as theme packaging checks.

## Future Work

- Order confirmation page shell, if Coral adopts a theme-owned confirmation template.
- Optional optimized-checkout theme stylesheet for logo/header tokens without pulling in storefront Preflight.
