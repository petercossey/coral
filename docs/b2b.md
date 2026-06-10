# B2B Edition Integration

## Purpose

This document is the design reference for integrating the BigCommerce B2B Edition GraphQL API into Coral theme features. It covers how B2B Edition's default storefront scripts authenticate, what Coral reuses from the open source Buyer Portal, and the shape of Coral's theme-owned B2B layer.

The goal is a small JavaScript SDK that authenticates against the B2B GraphQL API and powers Coral features such as company orders, quotes, and shopping lists. The goal is **not** to boot or reimplement the B2B Buyer Portal React SPA. Coral keeps its server-rendered Stencil baseline and adds theme modules and Preact leaves for specific B2B features, following the conventions in `docs/javascript.md`.

## Reference Materials

- **Buyer Portal source (open source SPA)**: `/Users/peter.cossey/www/coral-project/b2b-buyer-portal`
  - Auth flow: `apps/storefront/src/utils/loginInfo.ts`
  - Request layer: `apps/storefront/src/shared/service/request/` (`base.ts`, `fetch.ts`, `b3Fetch.ts`)
  - GraphQL operations by domain: `apps/storefront/src/shared/service/b2b/graphql/`
  - Permission checks: `apps/storefront/src/utils/b3CheckPermissions/`
  - Runtime config consumption: `apps/storefront/src/utils/basicConfig.ts`
- **Local developer docs**: `/Users/peter.cossey/www/coral-project/developer-docs`
  - `docs/b2b-edition/authentication/hosted-auth.mdx`
  - `docs/start/authentication/current-customer.mdx`
- **Default Script Manager snippets** that B2B Edition injects into Stencil storefronts (summarized below).

Treat the Buyer Portal source the same way Coral treats Cornerstone: reference material to confirm API expectations, not a base to copy wholesale. Query documents can be cropped from the source as each Coral feature lands.

## How B2B Edition Integrates with Stencil by Default

B2B Edition is a store-level module. When enabled, it adds storefront functionality through:

1. A **B2B GraphQL API** (effectively a third-party API, hosted at `https://api-b2b.bigcommerce.com`).
2. A hosted **React SPA** (the Buyer Portal) injected via Script Manager, which takes over account and login pages.

### Default header script

Purely cosmetic; no auth involvement. It hides the `body` on account/login pages so the Stencil page never flashes before the SPA replaces it, and injects a style element (`id="b2bPermissions-cartElement-id"`) that hides all add-to-cart affordances using Cornerstone-specific selectors:

```css
[href="/cart.php"], #form-action-addToCart, [data-button-type="add-cart"],
.button--cardAdd, .card-figcaption-button, [data-emthemesmodez-cart-item-add],
.add-to-cart-button { display: none !important }
```

The cart-hiding style is a pre-load safety measure. After boot, the SPA checks the logged-in user's permissions and removes the style unless the user is a B2B account without `purchase_enable` permission.

Coral does not adopt either pattern. Native account and B2B account pages are routed explicitly through templates rather than hidden-and-replaced. Cart and add-to-cart gating uses Coral-owned `data-*` hooks and a permission-aware theme module (see Roadmap).

### Default footer script

Defines the SPA's runtime configuration on `window.B3` and loads the hosted Buyer Portal bundle:

```js
window.B3 = {
  setting: {
    store_hash: "{{settings.store_hash}}",
    channel_id: 1,
    platform: "bigcommerce",
    b2b_client_id: "dl7c39mdpul6hyc489yk0vzxl6jesyx",
    b2b_url: "https://api.bundleb2b.net",
    captcha_setkey: "<recaptcha key>",
    environment: "production"
  },
  // "dom.*" keys: selectors the SPA uses to hijack the theme's
  // login links and checkout buttons. Coral does not use them.
};
```

Notes:

- `b2b_url: "https://api.bundleb2b.net"` is a legacy domain. The current Buyer Portal source resolves production to `https://api-b2b.bigcommerce.com` (`shared/service/request/base.ts`). Both front the same service; new code uses the bigcommerce.com domain.
- `b2b_client_id` (`dl7c39mdpul6hyc489yk0vzxl6jesyx`) is the B2B module's public client ID registered for the Current Customer API. It is a public storefront value, not a secret.
- Coral needs nothing else from this script. The SPA bundle, checkout DOM selectors, and captcha key are SPA boot concerns. B2B configuration in Coral lives under `window.Coral.b2b`, never as a second `window.B3` runtime.

### Store setup requirement: disable the default scripts

Any store used for Coral B2B development, QA, or production must have the default B2B Edition Script Manager scripts disabled (B2B Edition supports this). While those scripts are active, the injected SPA hides the `body` on account/login pages, hides cart UI with the permission CSS above, and hijacks login and account links — which breaks both the Coral pages under test and any validation pass run against them. Coral's theme features assume the theme owns account and login pages.

## Auth and Token Exchange

There are two related but different APIs; their tokens are not interchangeable:

- **B2B GraphQL API**: B2B Edition storefront features — company users, permissions, quotes, shopping lists, invoices, B2B pricing.
- **BigCommerce Storefront GraphQL API**: the core storefront graph at `<store origin>/graphql` — products, carts, customer data.

The B2B GraphQL API uses a three-step, cookie-bootstrapped token exchange. There is no OAuth redirect dance.

### 1. Get the BigCommerce customer JWT

The shopper's existing storefront session cookie authenticates a same-origin request to Stencil's Current Customer API:

```text
GET {window.origin}/customer/current.jwt?app_client_id={clientId}
```

- Returns a short-lived (about 15 minutes) signed JWT identifying the current customer, as plain text.
- Requires a logged-in customer session; returns an error otherwise.
- `app_client_id` must be a client ID registered for the Current Customer API. The B2B module's production ID is `dl7c39mdpul6hyc489yk0vzxl6jesyx`.
- Buyer Portal reference: `apps/storefront/src/shared/service/bc/api/login.ts`.

### 2. Exchange the customer JWT for a B2B token

A single **unauthenticated** GraphQL mutation against `https://api-b2b.bigcommerce.com/graphql`:

```graphql
mutation Authorize($bcToken: String!, $channelId: Int!) {
  authorization(authData: { bcToken: $bcToken, channelId: $channelId }) {
    result {
      token
      loginType
      permissions {
        code
        permissionLevel
      }
    }
  }
}
```

The B2B backend validates the JWT, resolves the customer's company membership, and returns:

- `token` — the B2B bearer token for all subsequent API calls.
- `loginType` — how the B2B user maps onto the BC customer.
- `permissions` — the user's B2B permission set, useful for feature gating without extra requests (see Permissions).

Buyer Portal reference: `apps/storefront/src/shared/service/b2b/graphql/global.ts` (`getB2BToken`).

### 3. Call the B2B GraphQL API

All subsequent requests go to `{b2bApiBaseUrl}/graphql` as `POST` with `content-type: application/json` and:

```text
Authorization: Bearer <B2BToken>
```

Pass GraphQL variables instead of interpolating user input into query strings. Known anonymous operations, such as company registration and the token-generating mutations, run without a bearer token.

Buyer Portal reference: `apps/storefront/src/shared/service/request/b3Fetch.ts` (`graphqlB2B`).

### Token lifecycle

- The B2B token is user-scoped and permission-scoped, and expires after about 1 day. The response does not include an expiry.
- The Buyer Portal caches tokens in `sessionStorage` and re-runs the exchange whenever a freshly fetched customer JWT differs from the cached one — this is how login, logout, and user-switching are detected (`apps/storefront/src/utils/loginInfo.ts`).
- There is **no refresh flow**. A GraphQL error with `extensions.code === 40101` means the token is invalid or expired. Coral treats 40101 as: invalidate the cache, re-run the exchange once, then fail.

### Related token types

The Buyer Portal manages these related tokens; only the first matters for Coral's first pass:

| Token | Purpose | How obtained | Coral relevance |
|---|---|---|---|
| `B2BToken` | B2B GraphQL API auth | `authorization` mutation (above) | **Primary — this is the one Coral needs** |
| `bcGraphqlToken` | BC Storefront GraphQL API | B2B API `storeFrontToken` mutation | Unnecessary on Stencil; `{{settings.storefront_api.token}}` provides this directly |
| `currentCustomerJWT` | Input to the exchange | Current Customer API | Transient; only cached to detect customer change |

For guests, the portal uses a proxy endpoint (`{b2bApiBaseUrl}/api/v3/proxy/bc-storefront/graphql`) with `Store-Hash` and `BC-Channel-Id` headers instead of a bearer token. Coral targets logged-in B2B users only, so this is out of scope.

The B2B `login` mutation and its `storefrontLoginToken` (synced back to the storefront via `GET /login/token/<token>`) authenticate a Company user independently of the native storefront login form. Coral keeps native BigCommerce login; these become relevant only if Coral intentionally builds a custom B2B login or registration experience.

Do not expose B2B server-to-server API tokens, BigCommerce store API access tokens, or customer impersonation tokens in Coral's browser JavaScript.

## B2B GraphQL API Surface

Operations in the Buyer Portal are plain GraphQL string templates organized by domain under `apps/storefront/src/shared/service/b2b/graphql/`:

| Domain | File | Representative operations |
|---|---|---|
| Orders | `orders.ts` | `allOrders`, `customerOrders`, order detail, order statuses |
| Quotes | `quote.ts` | quote list/detail, `createQuote`, `quoteCheckout`, PDF export |
| Shopping lists | `shoppingList.ts` | list CRUD, `shoppingListsItemsCreate` |
| Invoices | `invoice.ts` | invoice list/detail/stats, payment history, PDF download |
| Addresses | `address.ts` | company address CRUD |
| Company / users | `global.ts`, `users.ts` | company info, subsidiaries, masquerade, email checks |
| Products | `product.ts` | SKU search, variant info, B2B pricing (`priceProducts`) |
| Registration | `register.ts` | company/user registration, form fields |

A small set of REST endpoints exists (`/api/v2/media/upload`, extra-field validation); GraphQL covers everything Coral is likely to need.

The portal's request layer is React-free. Its only entanglements are Redux for token reads, an MUI snackbar for errors, and `window.B3` for config — all trivially replaceable.

## Coral Mini-SDK

A small theme-owned module set, following the JavaScript conventions in `docs/javascript.md`.

### Layout

```text
assets/js/b2b/
  config.js     Resolves store hash, channel ID, environment, client ID from theme context.
  auth.js       Token manager: returns a valid B2B token, owns caching and the exchange.
  client.js     gqlRequest(query, variables) — fetch wrapper with auth and error unwrapping.
  orders.js     Domain modules added one at a time as Coral features need them.
```

Domain modules hold only the operations Coral features actually use — do not port the portal's full API surface up front.

### Configuration

Configuration comes from the theme, not `window.B3`. Templates publish a narrow B2B config under `window.Coral.b2b` next to the existing `window.Coral` setup in `templates/layout/base.html`:

```html
<script nonce="{{nonce}}">
window.Coral = window.Coral || {};
window.Coral.b2b = {
  enabled: {{#if theme_settings.b2b_enabled}}true{{else}}false{{/if}},
  storeHash: '{{settings.store_hash}}',
  channelId: Number('{{settings.channel_id}}') || 1,
  customerId: Number('{{customer.id}}') || null,
  environment: '{{theme_settings.b2b_environment}}',
  apiBaseUrl: '{{theme_settings.b2b_api_base_url}}',
  appClientId: '{{theme_settings.b2b_client_id}}'
};
</script>
```

Exact theme setting names can change at implementation time. Defaults:

- `enabled`: false until the theme explicitly opts in.
- `channelId`: `settings.channel_id`, fallback to `1`.
- `environment`: `production`.
- `apiBaseUrl`: `https://api-b2b.bigcommerce.com`, with an override for staging/local testing.
- `appClientId`: the B2B module's public production ID, configurable.

Guest handling has two layers. Templates gate every B2B feature mount with `{{#if customer}}`, so guests never load B2B code paths. As a second guard, `customerId` is `null` for guests and the SDK refuses to attempt an exchange when it is not set.

### `auth.js`

Owns one job: return a valid B2B token.

1. Check `sessionStorage` for a cached token keyed by customer identity: `coral:b2b:<storeHash>:<channelId>:<customerId>`. The customer ID in the key is what prevents user-switching in the same browser session from reusing the previous user's still-valid B2B token; a cached entry for a different customer is discarded, not reused.
2. On miss: fetch `/customer/current.jwt?app_client_id=...`, run the `authorization` mutation, cache the result (token + permissions), return the token.
3. Deduplicate concurrent exchange attempts behind a single in-flight promise.
4. Expose `getB2BToken()` and `invalidateB2BToken()`, plus cached `permissions` for feature gating.

On logout, auth failure, or BigCommerce session mismatch, clear the cache.

### `client.js`

A thin fetch wrapper:

1. `gqlRequest(query, variables)` POSTs to `{b2bApiBaseUrl}/graphql` with `Authorization: Bearer <token>`.
2. Unwraps GraphQL `errors`; on `extensions.code === 40101`, invalidates the token, re-exchanges, and retries the request once.
3. Returns `data` or throws a typed error for callers to handle; the SDK does not own UI. Failures surface through Coral's existing notification events where a feature warrants it.

### Feature integration

B2B features follow the existing two-model split:

- **Theme modules** (`assets/js/theme/<area>/`) enhance server-rendered B2B markup.
- **Preact client components** own interactive B2B leaves (for example, a company orders table), mounted from normal Handlebars markup with `data-coral-component`.
- Shared B2B state, if a feature needs it, lives in `assets/js/state/` as signals; the SDK itself stays stateless apart from the token cache. A future shared state shape, if adopted, tracks `status` (`idle | loading | ready | guest | error`), `permissions`, `customer`, `company`, and `error`.

The SDK is lazy: features call `getB2BToken()` on demand rather than authorizing on every page load. There is no global B2B boot step until a feature proves one is needed.

## Permissions

The `authorization` response returns the permission set as:

```js
{ code: 'purchase_enable', permissionLevel: 1 }
```

Permission levels used by the Buyer Portal:

```js
const permissionLevels = {
  USER: 1,
  COMPANY: 2,
  COMPANY_SUBSIDIARIES: 3,
};
```

Common permission codes:

```js
const b2bPermissions = {
  purchase: 'purchase_enable',
  getShoppingLists: 'get_shopping_lists',
  createShoppingList: 'create_shopping_list',
  updateShoppingList: 'update_shopping_list',
  deleteShoppingList: 'delete_shopping_list',
  createShoppingListItem: 'create_shopping_list_item',
  getQuotes: 'get_quotes',
  createQuote: 'create_quote',
  updateQuoteMessage: 'update_quote_message',
  checkoutWithQuote: 'checkout_with_quote',
  getOrders: 'get_orders',
  getInvoices: 'get_invoices',
  payInvoice: 'pay_invoice',
  getAddresses: 'get_addresses',
  createAddress: 'create_address',
  getUsers: 'get_users',
  createUser: 'create_user',
  getCompanySubsidiaries: 'get_company_subsidiaries',
};
```

For page-level access, checking that a code exists is usually enough. For product/cart actions, the Buyer Portal compares `permissionLevel` against the active company hierarchy level. Coral starts with simple helpers:

```js
export function hasPermission(permissions, code) {
  return permissions.some((permission) => permission.code === code);
}

export function hasPermissionAtLevel(permissions, code, level) {
  const permission = permissions.find((item) => item.code === code);

  return Number(permission?.permissionLevel ?? 0) >= Number(level);
}
```

Client-side permission checks are UX controls. The B2B API remains the source of enforcement.

## Constraints and Open Questions

- **Client ID support status.** Coral piggybacks on the B2B module's registered `app_client_id` for the `current.jwt` call — exactly what the official footer script does — but the hosted bundle's IDs have changed over time. Confirm with the B2B team that third-party themes using this ID (or registering their own) is supported usage.
- **B2B enablement detection.** Decide whether Coral features detect B2B availability at runtime (exchange failure → hide features) or rely purely on a theme setting the merchant flips.
- **Permissions-driven UI.** Decide how much cart/checkout gating (the default header script's `removeCart` behavior) Coral reimplements server-side versus client-side.
- **Channel ID availability.** Confirm `settings.channel_id` exists in the Stencil context for all channels Coral will support.
- **Environment switching.** Decide how local development switches between production, staging, integration, and local B2B API hosts.

## Roadmap

### First implementation slice

A minimal end-to-end spike to validate the design against a sandbox store with B2B Edition enabled (default scripts disabled per the setup requirement). The slice ships no user-facing UI; B2B account-page features build on Coral's native auth/account templates as those workflows are introduced.

1. `config.js`, `auth.js`, and `client.js` with the exchange and 40101 retry.
2. One read-only domain call (for example `customerInfo` or `customerOrders`) exercised through a dev-only diagnostic — the browser console or a temporary harness, not a shipped page — confirming the token exchange, the permission payload, the customer-keyed cache, and the 40101 retry path.
3. Validate per the project checklist (`npm run build`, `stencil bundle`, `stencil start`) plus a manual login → exchange smoke test.

### Subsequent features

In rough order, each landing only after the previous layer is stable:

1. **Purchasability.** Permission-aware cart/add-to-cart gating in `assets/js/theme/b2b/purchasing.js` using `purchase_enable` and Coral `data-*` hooks — the theme-owned replacement for the default header script's `removeCart()`. Keep server-rendered add-to-cart as the fallback; avoid showing controls during auth that may be immediately disabled; show controls for guests, B2C customers, and permitted B2B users.
2. **Product pricing.** A `priceProducts` domain module to refresh product-page pricing for the selected variant/options, falling back to server-rendered Stencil pricing when unavailable. Product-card pricing can follow if templates expose enough variant data.
3. **Quote and shopping list leaves.** Preact components for add-to-quote and add-to-shopping-list interactions, gated by B2B permissions before mounting. Account dashboards stay out of scope.
4. **Account workflows.** Invoices, orders, addresses, company users, and account settings, one workflow at a time, after Coral's native auth/account templates have the routes each workflow needs. A read-only company orders list (`allOrders` / `customerOrders`) is the natural first workflow. Custom B2B login/registration (the `login` mutation and `storefrontLoginToken` sync) only if Coral decides to own those pages beyond Stencil's standard login flow.
