# Storefront Coverage

This is the single reference for how far Coral covers the standard BigCommerce Stencil storefront workflows. It defines the coverage record, the evidence levels, the validation matrix, and the fixtures used to assess a workflow, and it holds the consolidated records.

A successful `npm run build`, `npm test`, or `stencil bundle` shows that the theme compiles and packages. None of them shows that a shopper can complete a workflow, so they are prerequisites for coverage evidence, not evidence.

The coverage record is for assessment. A missing or broken workflow is recorded as a gap and linked to a separate implementation issue; this document does not plan or track that implementation.

B2B Edition coverage keeps its own home in [b2b.md](b2b.md) and uses this record format and matrix where they apply.

## Coverage Records

One record covers one shopper workflow, such as "add a simple product to the cart from a product card", not one template. A workflow can span several templates, partials, and theme modules; a template can serve several workflows.

Each record captures:

- **Workflow**: the shopper task in one sentence.
- **Templates and code**: the page template, the partials and theme modules it depends on.
- **`page_type`**: the value observed on the representative route, not assumed from the filename.
- **Representative route**: one storefront URL that exercises the workflow on the development store.
- **Contract sources**: the Cornerstone file and official reference that confirm the template name, page type, and context fields (see [Contract Sources](#contract-sources)).
- **Required context**: front matter, Stencil objects and helpers the templates read, and any data seeded for client code.
- **Store settings**: control-panel configuration the workflow depends on.
- **Fixtures**: the fixture IDs from [Fixtures](#fixtures) the cases use.
- **Observed behavior**: what Coral does today, in present tense. Prefix a statement with *Source-derived* when it comes from reading templates or modules rather than from running the route; it stays that way until a validation case observes it.
- **Gaps**: missing or incorrect behavior, each linked to an issue or marked "issue needed".
- **Minimum functional completion criteria**: the smallest set of shopper-visible outcomes that make the workflow functional. Visual polish is excluded.
- **Validation cases**: the selected matrix cases, each with an evidence level, steps, expected and actual results, and an outcome.
- **Linked issues**: implementation issues and related foundations.
- **Evidence**: the reproducibility block in [Evidence](#evidence).

### Evidence Levels

Every validation case states one level. A record keeps the levels separate because each proves something the others do not.

| Level | Proves | Typical method |
| --- | --- | --- |
| Rendering | The route returns the expected page type and server-rendered markup for the given context. | `curl` or a browser on the local route, `?debug=context`, page source. |
| Interaction | A control on the rendered page behaves as specified: JavaScript enhancement, keyboard, focus, busy and error states, no-JS fallback navigation. | A browser with DevTools, keyboard only, JavaScript disabled, request blocking. |
| End-to-end | The shopper completes the task and the result persists in the store session or account across navigation. | A browser session followed through to the outcome, such as a reload or a later page showing the change. |

Source review and unit tests support a case's expected result but do not establish any level on their own.

### Outcomes

Each case has exactly one outcome:

- **Pass**: the actual result matches the expected result at that level.
- **Fail**: the actual result contradicts the expected result. Link the gap's issue, or write "issue needed".
- **Unverified**: the case was not exercised, or the method used cannot tell theme behavior apart from environment behavior. State the missing prerequisite and the next concrete step that would produce a Pass or Fail.

A case that does not apply is not listed. Record the reason for leaving out a matrix value in one line under the case table when it is not obvious.

## Validation Matrix

The matrix lists the dimensions a case can vary. A record chooses the cases that exercise the workflow's real branches; it is never a full Cartesian product.

| Dimension | Values | Include when |
| --- | --- | --- |
| Shopper | `guest`, `customer` | The template, prices, or links differ for signed-in shoppers. B2B roles are defined in [b2b.md](b2b.md). |
| State | `empty`, `populated`, `error` | The workflow renders a list, cart, or result set (`empty`/`populated`), or a request or validation can fail (`error`). |
| Fixture | IDs from [Fixtures](#fixtures) | The template or module branches on product or account data. |
| Viewport | `mobile` (375×812), `desktop` (1280×800) | Always include both for at least one rendering case. |
| Input | `pointer`, `keyboard` | Any interactive control. Keyboard cases for the cart drawer follow [#5](https://github.com/petercossey/coral/issues/5). |
| Script | `js`, `no-js` | The workflow has a server-rendered fallback for a JavaScript enhancement. |
| Locale | `default`, `alt-currency` | The workflow renders copy or amounts. Conventions are owned by [#7](https://github.com/petercossey/coral/issues/7). |

Cases are written as their non-default values, for example `guest · populated · F-SIMPLE · mobile · keyboard`. Unstated dimensions are `guest`, `desktop`, `pointer`, `js`, and `default` locale.

## Fixtures

Records refer to fixtures by ID, plus non-personal store identifiers such as a product ID. Keep the set minimal and reuse it across records.

| ID | Fixture | Setup |
| --- | --- | --- |
| `F-SIMPLE` | Simple product: no options, in stock, price visible, purchasable from a card. | Any sample-catalog product without options. |
| `F-OPTIONS` | Product with required variant options and at least one modifier. | Product with a variant option set and a required modifier. |
| `F-RESTRICTED` | Product that cannot be purchased: out of stock, purchasing disabled, or price hidden. | Inventory tracking at zero, or availability set to unavailable. |
| `F-QTY` | Product with minimum and maximum purchase quantities. | Order quantity limits on the product. |
| `F-UPLOAD` | Product with a file-upload modifier. | Modifier of type file. |
| `F-PREORDER` | Pre-order product. | Availability set to pre-order with a release date. |
| `F-CART-EMPTY` | New shopper session with no cart. | Private window, or cleared site cookies. |
| `F-CART-POPULATED` | Session with one `F-SIMPLE` and one `F-OPTIONS` line item. | Add both through the storefront. |
| `F-CUSTOMER` | Test customer account with a saved address. | Created in the control panel for testing; credentials stay out of records. |
| `F-ORDER` | Completed order on `F-CUSTOMER`. | Placed with a test payment method or created as a manual order; never a paid order. |
| `F-ALT-CURRENCY` | A second display currency on the storefront channel. | Currency enabled in the control panel; see [#7](https://github.com/petercossey/coral/issues/7). |

When the development store lacks a fixture, the affected cases are Unverified with "create fixture" as the next step.

## Contract Sources

Coral confirms Stencil contracts against references; it does not copy them.

1. **Cornerstone**: [`templates/pages`](https://github.com/bigcommerce/cornerstone/tree/master/templates/pages) confirms the template inventory and filenames, and Cornerstone's partials show which context fields a page relies on. Cite a release tag or commit.
2. **Official references**: the [front matter reference](https://docs.bigcommerce.com/developer/docs/storefront/stencil/themes/context/frontmatter-reference), [Handlebars reference](https://docs.bigcommerce.com/developer/docs/storefront/stencil/themes/context/handlebars-reference), [Stencil CLI docs](https://docs.bigcommerce.com/developer/docs/storefront/stencil/cli/development-server), and the [REST Storefront Carts reference](https://docs.bigcommerce.com/developer/api-reference/rest/storefront/carts).
3. **Observed context**: `?debug=context` on the representative route during `stencil start` shows the context the store actually supplies, including `page_type`.
4. **Local source**: Coral's templates and modules, which describe intended behavior but are not proof of it.

If an official page for a contract cannot be found, cite Cornerstone and the observed context, and say so in the record's contract sources. The current docs site has no page for the `page_type` object or the product card fields.

## Evidence

Every record ends with a reproducibility block:

```text
Coral commit:   <short SHA>, plus "uncommitted changes" if any
Reference:      Cornerstone <tag> (<commit>); docs pages cited above, accessed <date>
Environment:    Node <version>, Stencil CLI <version>, `stencil start` against a development store
                (<catalog description>, <default currency>), <browser and version or curl>
Date:           <YYYY-MM-DD>
Prerequisites:  <store settings and fixtures the cases need; missing ones are named here>
```

Steps and expected/actual results live in the case table, written so another contributor can repeat them from a fresh session.

Records never contain credentials, API tokens, `.stencil` or `secrets.stencil.json` values, session cookies, cart IDs, customer names, emails, addresses, or order numbers. Refer to accounts and orders by fixture ID, and redact identifiers from pasted output.

Cases that depend on the shopper session, such as a cart, run `stencil start --no-cache`. By default `stencil start` caches page responses for 15 seconds keyed on URL and request headers but not cookies, so a render can come from an earlier request or another session.

Cases that send native `/cart.php` adds, by `curl` or browser automation, present a desktop browser User-Agent: `curl -A '<desktop browser UA>'`, or `userAgent` on the automation context. The platform rejects native adds from user agents it classifies as automated, such as `curl/<version>` and headless Chromium's default `HeadlessChrome/<version>`. The request still returns `302` to `/cart.php`, no cart is created, and the cart page shows "Unfortunately this product is not available for purchase." for the same product that a browser adds successfully. The REST Storefront Cart API answers a plain `curl` request with a `403` bot challenge page. Neither rule is in the official docs; it is observed platform behavior ([#25](https://github.com/petercossey/coral/issues/25)).

Commands that start `stencil start` stop it once the evidence is captured.

## Record Template

Copy this block for each workflow:

````markdown
### <Workflow name>

**Workflow:** <one-sentence shopper task>
**Templates and code:** `<templates/pages/...>`, `<partials>`, `<assets/js/...>`
**`page_type`:** `<observed value>`
**Representative route:** `<path>`
**Contract sources:** <Cornerstone file @ tag>; <official reference>; `?debug=context`
**Required context:** <front matter, objects, helpers, seeded client data>
**Store settings:** <control-panel prerequisites>
**Fixtures:** <F-...>

**Observed behavior**

- <present-tense behavior>

**Gaps**

- <gap> (<#issue> or "issue needed")

**Minimum functional completion criteria**

- [ ] <shopper-visible outcome>

**Validation cases**

| Case | Level | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- | --- |
| `<matrix values>` | Rendering | <steps> | <expected> | <actual> | Pass |
| `<matrix values>` | Interaction | <steps> | <expected> | Not run | Unverified: <missing prerequisite>. Next: <concrete step>. |

**Linked issues:** <#...>

**Evidence**

```text
Coral commit:   <sha>
Reference:      <Cornerstone tag (commit)>; docs accessed <date>
Environment:    <Node, Stencil CLI, store, browser or curl>
Date:           <YYYY-MM-DD>
Prerequisites:  <present and missing>
```
````

## Shared Concerns

Records link these foundations instead of restating their scope:

- **Cart drawer accessibility**: focus, Escape, focus restoration, and reduced motion are specified by [#5](https://github.com/petercossey/coral/issues/5) and [cart-drawer.md](cart-drawer.md). Drawer-related keyboard cases cite #5 for expected behavior.
- **Localization and currency**: copy and amount conventions are owned by [#7](https://github.com/petercossey/coral/issues/7). Hardcoded copy or `$0.00` fallbacks are recorded as gaps linked to #7.
- **Checkout shell**: the hosted checkout document shell is specified in [checkout-shell.md](checkout-shell.md). Checkout records cover the handoff and link that doc for the shell.
- **B2B workflows**: coverage, roles, and prerequisites are owned by [#10](https://github.com/petercossey/coral/issues/10) and documented in [b2b.md](b2b.md).

## Contributing Records

Domain audit owners post their records as comments on their audit issue (children of [#9](https://github.com/petercossey/coral/issues/9)), using the [Record Template](#record-template), one comment per workflow. Corrections are posted as a new comment that names the record and replaces its changed cases and evidence block.

One integrator maintains this document. The integrator merges reviewed records into [Workflow Records](#workflow-records), resolves duplicates and contradictions between domains, and creates or links the implementation issues for confirmed gaps. Contributors do not edit this document directly unless they are changing the conventions above.

## Workflow Records

### Product-Card Add To Cart

This record is the worked example for the format.

**Workflow:** A shopper adds a simple product to the cart from a product card on the home page.
**Templates and code:** `templates/pages/home.html`, `templates/components/featured-products/featured-products.html`, `templates/components/header/cart-link.html`, `assets/js/theme/cart/add-to-cart.js`, `assets/js/state/cart.js`, `assets/js/theme/header/header-cart.js`, `assets/js/theme/notifications/notifications.js`. Design: [add-to-cart-theme-enhancement.md](add-to-cart-theme-enhancement.md).
**`page_type`:** `default`
**Representative route:** `/`
**Contract sources:** Cornerstone 6.22.0 [`templates/pages/home.html`](https://github.com/bigcommerce/cornerstone/blob/18de2b597813a632db33c153493fe12f3d7749e2/templates/pages/home.html) and [`templates/components/products/card.html`](https://github.com/bigcommerce/cornerstone/blob/18de2b597813a632db33c153493fe12f3d7749e2/templates/components/products/card.html); [front matter reference](https://docs.bigcommerce.com/developer/docs/storefront/stencil/themes/context/frontmatter-reference); [add-to-cart URLs](https://docs.bigcommerce.com/developer/docs/admin/checkout-and-cart/custom-checkouts/add-to-cart-ur-ls); [create cart](https://docs.bigcommerce.com/developer/api-reference/rest/storefront/carts/create-cart) and [add cart line item](https://docs.bigcommerce.com/developer/api-reference/rest/storefront/carts/cart-items/add-cart-line-item); `?debug=context` on `/`. No official page documents the card fields; they are confirmed from Cornerstone's card and the observed context.
**Required context:** front matter `products.featured.limit: 8` and `cart: true`; per card `id`, `url`, `name`, `image`, `price`, `show_cart_action`, `has_options`, `pre_order`, `pre_order_add_to_cart_url`, `add_to_cart_url`; globally `cart_id`, `cart.quantity`, `cart.sub_total.formatted`, `urls.cart`, seeded to client code through the cart drawer mount's `data-cart-*` attributes.
**Store settings:** at least one featured product; storefront display settings that show add-to-cart actions on cards (`show_cart_action` is true).
**Fixtures:** `F-SIMPLE`, `F-OPTIONS`, `F-PREORDER`, `F-RESTRICTED`, `F-CART-EMPTY`.

**Observed behavior**

- `/` renders the featured products as cards. A simple product card with `show_cart_action` renders an "Add to cart" link to `add_to_cart_url` (`/cart.php?action=add&product_id=<id>`) with `data-coral-add-to-cart` and `data-product-id`.
- *Source-derived, not route-observed:* a card renders "Choose options" linking to the product when `has_options` is true, and a plain "Pre-order" link for pre-order products.
- *Source-derived, not browser-observed:* with JavaScript, a standard click on an eligible link stays on the page, posts one line item to the REST Storefront Cart API (creating a cart when no cart ID is known), marks the link busy, replaces shared cart state from the response, and emits `cart:item-added`. The header count and subtotal render from shared state, and a notification offers "Open cart". Modified clicks, other targets, and ineligible links navigate normally.
- *Source-derived, not browser-observed:* a failed request restores the link, logs the error, and emits `cart:item-add-failed`, which shows a generic failure notification.
- Without JavaScript, the link follows `/cart.php?action=add&product_id=<id>`, which adds one unit and redirects to `/cart.php?suggest=<id>`. The cart page lists the item with server totals, and the header and cart drawer seed show the same count and subtotal after reload and navigation.
- A rejected native add redirects to `/cart.php`, where the platform's message renders in the cart page's status region and the cart stays empty. The platform rejects native adds from automated user agents; see [Evidence](#evidence).

**Gaps**

- Cards for products that cannot be purchased render no action. Cornerstone renders `out_of_stock_message` as a link to the product when present. (issue needed; product-selection audit [#15](https://github.com/petercossey/coral/issues/15))
- Rejected adds, such as stock or quantity limits, show only a generic failure message; validation details go to the console. (issue needed; open question in [add-to-cart-theme-enhancement.md](add-to-cart-theme-enhancement.md))
- Card copy and the `$0.00` cart fallbacks are hardcoded English and US dollars. ([#7](https://github.com/petercossey/coral/issues/7))

**Minimum functional completion criteria**

- [ ] Every card with `show_cart_action` renders exactly one action that matches the product: choose options, pre-order, add to cart, or the out-of-stock message.
- [ ] With JavaScript, one standard click or Enter keypress adds one unit without navigation, updates the header count and subtotal, and announces success with a route to the cart.
- [ ] Repeated activation while a request is in flight adds the item once.
- [ ] A rejected add restores the control and announces a recoverable failure.
- [ ] Without JavaScript, the link adds one unit and lands on a cart page that shows the item.
- [ ] After a reload, the header reflects the added item.

**Validation cases**

| Case | Level | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- | --- |
| `F-SIMPLE · F-CART-EMPTY` | Rendering | `curl -s http://localhost:3000/` and `curl -s 'http://localhost:3000/?debug=context'` from a fresh session. | 200; `page_type` `default`; each `F-SIMPLE` card with `show_cart_action` has one enhanced "Add to cart" link to `/cart.php?action=add&product_id=<id>`. | 200; `default`; two featured products (IDs 111 and 107), both simple, both with enhanced links. | Pass |
| `F-OPTIONS`, `F-PREORDER`, `F-RESTRICTED` | Rendering | Feature one product of each fixture, then repeat the case above. | "Choose options" link, plain "Pre-order" link, and out-of-stock message respectively. | Not run. | Unverified: the featured set contains only simple products. Next: feature the three fixtures in the development store and repeat. `F-RESTRICTED` is expected to Fail on the gap above. |
| `F-SIMPLE · mobile` | Rendering | Load `/` at 375×812. | Cards stack in one column; the action is fully visible and tappable. | Not run. | Unverified: no browser automation in the audit environment. Next: repeat in a browser with device emulation. |
| `F-SIMPLE · F-CART-EMPTY` | Interaction | In a browser, click "Add to cart" with the DevTools network panel open. | No navigation; one `POST /api/storefront/carts` returns 200; the link shows "Adding..." and then restores; header count is 1; a success notification with "Open cart" appears. | Not run. A `curl` POST to the same endpoint returned 403 with a bot challenge page (see [Evidence](#evidence)); it is not evidence about theme behavior. | Unverified: no browser session. Next: run the steps in a browser. |
| `F-SIMPLE · populated` | Interaction | After the case above, click "Add to cart" on the second card. | One `POST /api/storefront/carts/{cartId}/items`; header count is 2. | Not run. | Unverified: no browser session. Next: run in a browser after the case above. |
| `F-SIMPLE · keyboard` | Interaction | Tab to "Add to cart" and press Enter; press Enter again while it shows "Adding...". | Same as the pointer case; the second Enter adds nothing. | Not run. | Unverified: no browser session. Next: run keyboard-only in a browser. Drawer focus after "Open cart" follows #5. |
| `F-SIMPLE · error` | Interaction | Block `/api/storefront/carts*` in DevTools, then click "Add to cart". | No navigation; the link restores; a failure notification appears; header unchanged. | Not run. | Unverified: no browser session. Next: run with DevTools request blocking. |
| `F-SIMPLE · F-CART-EMPTY · no-js` | Interaction | `curl -s -A '<desktop Chrome UA>' -D - -o /dev/null 'http://localhost:3000/cart.php?action=add&product_id=111'` from a fresh session. | Redirect to the post-add cart page. | `302` with `Location: /cart.php?suggest=<id>`. | Pass |
| `F-SIMPLE · F-CART-EMPTY · no-js` | End-to-end | In a browser with JavaScript disabled and a desktop Chrome User-Agent, load `/` and click "Add to cart" on product 111. | One `GET /cart.php?action=add&product_id=111`; the cart page lists the item, quantity 1 and $25.00 totals. | Landed on `/cart.php?suggest=<id>`; one item row; $25.00 shown; header count 1. | Pass |
| `F-SIMPLE · F-CART-EMPTY · no-js` | End-to-end | After the case above, reload `/cart.php`, then load `/`. | The item persists; the header count and the cart drawer seed (`data-cart-quantity`, `data-cart-subtotal`, `data-cart-id`) agree with the page. | After reload one item row; on both pages header 1, seed quantity 1, subtotal $25.00, cart ID present. | Pass |
| `F-SIMPLE · F-CART-EMPTY · no-js · error` | End-to-end | Repeat the click with headless Chromium's default `HeadlessChrome` User-Agent. | The platform's rejection renders on the cart page; no success state. | Landed on `/cart.php`; status region shows "Unfortunately this product is not available for purchase."; no item; header 0 and seed 0 / $0.00 before and after reload. | Pass |
| `F-SIMPLE · F-CART-EMPTY` | End-to-end | Add with JavaScript, reload `/`, then open the cart drawer from the header. | After the reload, the header and drawer show 1 item and the server-rendered subtotal. | Not run. | Unverified: no browser session. Next: run in a browser after the first interaction case. |

The no-JS split reproduces on the live HTTPS storefront, which runs Cornerstone rather than Coral, so it confirms platform behavior only: with JavaScript disabled, clicking product 111's card link with a desktop Chrome User-Agent adds the item and survives reload, while the default `HeadlessChrome` User-Agent is rejected. `curl` GET adds with desktop Chrome, Firefox, and bare `Mozilla/5.0` User-Agents succeed; `curl/8.18.0` and `HeadlessChrome` are rejected. A same-origin multipart `POST /cart.php` with the product page's form fields and a `curl` User-Agent is also rejected. GET adds succeed with browser User-Agents, so the request method is not the cause and a POST form would not avoid the rejection.

`alt-currency` is left to [#7](https://github.com/petercossey/coral/issues/7), which owns amount rendering; `customer` is omitted because the card does not branch on the signed-in state.

**Linked issues:** [#5](https://github.com/petercossey/coral/issues/5), [#7](https://github.com/petercossey/coral/issues/7), [#15](https://github.com/petercossey/coral/issues/15), [#16](https://github.com/petercossey/coral/issues/16), [#25](https://github.com/petercossey/coral/issues/25).

**Evidence**

```text
Coral commit:   c7fc8db
Reference:      Cornerstone 6.22.0 (18de2b5); docs pages cited above, accessed 2026-10-01
Environment:    Node 24.16.0, Stencil CLI 10.0.0, `stencil start` against a development store
                (BigCommerce sample catalog, USD), curl 8.18.0
Date:           2026-10-01
Prerequisites:  Present: featured F-SIMPLE products, add-to-cart actions shown on cards.
                Missing: featured F-OPTIONS, F-PREORDER, F-RESTRICTED; a browser session for
                interaction and end-to-end cases.
```

The `no-js` cases were rerun for [#25](https://github.com/petercossey/coral/issues/25):

```text
Coral commit:   1f88375
Reference:      Add to Cart URLs docs page, accessed 2026-10-02
Environment:    Node 24.16.0, Stencil CLI 10.0.0, `stencil start --no-cache` against the development
                store (BigCommerce sample catalog, AUD) and the live HTTPS storefront; Google Chrome
                154 headless through playwright-core with JavaScript disabled; curl 8.18.0
Date:           2026-10-02
Prerequisites:  Present: featured F-SIMPLE product 111, a desktop browser User-Agent for native adds.
```

## Future Work

- Records for the remaining workflows come from the domain audits [#13](https://github.com/petercossey/coral/issues/13) to [#18](https://github.com/petercossey/coral/issues/18) and are consolidated, with the README link and baseline reproduction, in [#19](https://github.com/petercossey/coral/issues/19).
- The unverified cases in the worked example need a browser session and the missing fixtures.
