# Cart State And UI Updates

## Purpose

Cart state is a shared theme concern. Product cards, product forms, cart drawer controls, and cart-page controls can mutate the cart. Header links, the cart drawer, and future badges or summaries can read the cart. Coral should coordinate those pieces through shared cart state instead of letting one feature update another feature's DOM.

## Boundary

`assets/js/state/cart.js` owns durable cart values and cart transitions:

- cart ID
- quantity
- subtotal and total display values
- line items when the UI needs them
- freshness, loading, and error state when refresh behavior is added

Theme modules and client components should import state actions and signals from this module. They should not parse each other's DOM or keep private cart totals that can diverge.

## Mutation Pattern

Any feature that successfully changes cart contents should route the result through cart state.

Default rule:

1. If the mutation response contains a complete Storefront cart object, call `replaceCartSummary(responseCart, { source: 'rest-storefront' })`.
2. If the response contains only partial cart information, update known fields through a dedicated state action and mark the summary stale.
3. If the response contains no reliable cart summary, remember any known cart ID and let a later refresh path reconcile state.
4. Emit a Coral event only after the state transition when other modules need a moment notification.

Mutation modules should not know whether the header, drawer, or another widget is listening. Their responsibility is to validate their own interaction, perform the mutation, and pass the resulting cart information to shared state.

## Reader Pattern

UI that displays cart values should render from `cartSummary`:

- Preact components can read the signal directly during render.
- Theme modules can subscribe with `effect()` and update their own server-rendered markup.
- A reader should update only DOM it owns or enhances.

For example, the header cart link remains a normal Handlebars link. Its theme module opens the drawer on standard clicks and updates its own count/subtotal text when `cartSummary` changes.

## Events

Use state for current cart values. Use events for moments.

Good event topics:

- `cart:item-added`
- `cart:item-updated`
- `cart:item-removed`
- `cart:refreshed`
- `cart:stale`

Events should not be the source of truth for visible cart totals. A listener may react to an event by opening the drawer or showing feedback, but count and amount rendering should come from normalized cart state.

## Current Slice

The product-card add-to-cart enhancement posts to the REST Storefront Cart API. On success it now replaces `cartSummary` with the returned cart object, then emits `cart:item-added`.

The header cart enhancement subscribes to `cartSummary` and updates only its own count, subtotal, and accessible label. The cart drawer already reads the same state signal.

## Future Work

- Add `cartStatus`, `cartError`, `markCartStale()`, and `ensureCartFresh()` when the drawer needs authoritative refreshes.
- Add a stale-response policy before introducing concurrent drawer mutations.
- Add dedicated partial-state actions only when a real mutation returns less than a full cart object.
- Keep Storefront API transport helpers inside `assets/js/state/cart.js` until multiple modules need direct low-level API access.
