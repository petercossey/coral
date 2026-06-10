# Building A Feature

How to add a storefront feature the Coral way, with the shipped add-to-cart flow as the worked example. The full conventions live in [javascript.md](javascript.md); this guide is the practical path through them.

## Choose The Model

Work down this list and stop at the first layer that solves the problem:

1. **Handlebars only.** Render structure and data server-side. Most features need no JavaScript.
2. **Theme module.** A plain setup function in `assets/js/theme/<area>/` that enhances server-rendered markup.
3. **Preact client component.** Only when a UI leaf needs client-owned rendering, in `assets/js/components/<name>/`.
4. **Shared state.** Signals in `assets/js/state/` when separate pieces need the same current values.
5. **Events.** `assets/js/events.js` when a module announces a moment others may react to.

## Worked Example: Add To Cart

A shopper clicks "Add to cart" on a product card; the cart mutates via the REST Storefront API; the header count, cart drawer, and a notification all react. Every step is shipped code you can read.

### 1. Server-rendered markup with a hook

`templates/components/featured-products/featured-products.html` renders a normal anchor:

```html
<a href="{{add_to_cart_url}}" data-coral-add-to-cart data-product-id="{{id}}">
  Add to cart
</a>
```

The `href` is the no-JavaScript fallback. The feature-specific `data-coral-add-to-cart` attribute is the enhancement hook.

### 2. A theme module enhances it

`assets/js/theme/cart/add-to-cart.js` exports `setupAddToCartButtons()`. It validates each link is eligible, intercepts standard clicks only, and posts to the REST Storefront Cart API. `assets/js/theme/global.js` registers it so it runs on every page.

### 3. The mutation updates shared state

On success the module calls `replaceCartSummary(cart, { source: 'rest-storefront' })` from `assets/js/state/cart.js`. It never touches the header or drawer DOM — see [cart-state-and-ui-updates.md](cart-state-and-ui-updates.md) for the boundary.

### 4. Readers render from state

- `assets/js/theme/header/header-cart.js` subscribes with `effect()` and updates only its own count and subtotal markup.
- `assets/js/components/cart-drawer/cart-drawer.client.jsx` reads the `cartSummary` signal during render.

### 5. Events announce the moment

After the state update, the module emits `cart:item-added`. `assets/js/theme/notifications/notifications.js` listens and enqueues a notification; `assets/js/components/notifications/notifications.client.jsx` renders it from notification state.

## Recipes

### Add a theme module

1. Create `assets/js/theme/<area>/<feature>.js` exporting `setup<Feature>({ root, pageType, context })`.
2. Hook the markup with a feature-specific `data-*` attribute and keep the server-rendered fallback working.
3. Register the setup in `theme/global.js` (every page) or in `pageModules` in `theme/boot.js` (one page type).

### Add a client component

1. Create `assets/js/components/<name>/<name>.client.jsx` exporting `{ component, props() }`.
2. Add a `data-coral-component="<name>"` root in the owning template, passing initial data through `data-*` attributes.
3. Register it in `assets/js/runtime/registry.js`.
4. Add `data-coral-load="idle"` or `"visible"` only when delayed mounting is safe.

### Add shared state

1. Create `assets/js/state/<concern>.js` with module-level signals and named action functions.
2. Mutators call actions; readers read signals — components during render, theme modules with `effect()`.
3. Emit events for moments, never as the source of durable values.

## Validate

Run `npm run build`, check the feature in `stencil start`, and confirm `stencil bundle` still validates and packages the theme.
