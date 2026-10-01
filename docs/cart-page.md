# Cart Page

`templates/pages/cart.html` renders the shopper's cart server-side from the Stencil `cart` object (`page_type` `cart`, route `/cart.php`). The server cart is the authority: the page renders the amounts and quantities the platform supplies and computes or parses nothing.

## Context

The page declares `cart: true` in front matter, which also feeds the header cart link and the cart drawer mount in `layout/base`. The fields it reads were confirmed against Cornerstone 6.22.0 (`templates/pages/cart.html`, `templates/components/cart/content.html`, `templates/components/cart/totals.html`) and the observed `?debug=context` output:

| Area | Fields |
| --- | --- |
| Cart | `items`, `quantity`, `status_messages[].message`, `show_primary_checkout_button`, `multi_coupon_ui_enabled` |
| Line item | `id`, `product_id`, `variant_id`, `can_modify`, `min_purchase_quantity`, `max_purchase_quantity`, `name`, `url`, `brand.name`, `image`, `options[].name`, `options[].value`, `quantity`, `price`, `price_discounted`, `total`, `total_discounted`, `type` |
| Totals | `sub_total`, `display_discount_total` or `discount` and `coupons[].discount`, `gift_wrapping_cost`, `fees[].cost`, `shipping_handling.shipping_cost` and `shipping_cost_discounted`, `taxes[]` (`included`, `name`, `cost`), `gift_certificates[].used`, `grand_total` |
| Global | `cart_id`, `urls.home`, `urls.checkout.single_address`, `urls.auth.login`, `customer`, `settings.hide_price_from_guests` |

Every amount is a `formatted` string from the server, so store currency and tax display settings carry through.

## Behavior

- **Empty cart**: a "Your cart is empty" message and a "Continue shopping" link to the home page. No checkout action renders.
- **Status messages**: one-shot platform messages, such as a rejected `/cart.php?action=add`, render above the cart in a `role="status"` region. `message` is platform HTML and renders unescaped, as in Cornerstone.
- **Line items**: each item shows its image, brand, name (linked when the item has a `url`), selected options as a name/value list, unit price, quantity, and line total. Discounted unit and line amounts replace the originals when the platform supplies them.
- **Quantity and removal**: see [Editing Line Items](#editing-line-items).
- **Order summary**: subtotal, then each adjustment the platform supplies, then the grand total and any tax included in it. Rows follow Cornerstone's order so they reconcile with `grand_total`. Discounts render as one `display_discount_total` row when `multi_coupon_ui_enabled`, otherwise as `discount` plus one row per coupon.
- **Checkout**: when `show_primary_checkout_button` is true, a "Check out" link to `urls.checkout.single_address`, the hosted checkout.
- **Hidden prices**: when `settings.hide_price_from_guests` is on and no customer is signed in, item amounts read "Log in for pricing" (gift certificates excepted) and the summary is replaced by a "Log in to check out" link.

The layout is a single column that places the order summary beside the items at `lg`. Viewing the cart, product links, Continue shopping, and checkout are native links, so they work without JavaScript. Cart copy comes from `cart.*` in `lang/en.json`.

The header cart link and drawer render from the same server `cart` on this page, so their count and subtotal match the page after navigation or reload. See [cart-drawer.md](cart-drawer.md) for the drawer.

## Editing Line Items

Each ordinary product line (`can_modify` true and `type` not `GiftCertificate`) renders a form with a labelled quantity input, an Update button, and a Remove button. Other line types keep the read-only display and offer no mutation. `assets/js/theme/cart/cart-page.js` (the `cart` page module in `assets/js/theme/boot.js`) enhances these forms.

**No-JavaScript boundary.** The forms render `hidden` and the setup module reveals them, so no control is exposed before setup or without JavaScript. Without JavaScript the page shows the read-only quantity and a `<noscript>` note that changing quantities or removing items needs JavaScript. Coral uses no native mutation fallback: Cornerstone's cart controls are JavaScript-only, and the documented [`/cart.php` URLs](https://docs.bigcommerce.com/developer/docs/admin/checkout-and-cart/custom-checkouts/add-to-cart-ur-ls) add products but do not update or remove lines.

**Platform contract.** Mutations use the [REST Storefront Cart API](https://docs.bigcommerce.com/developer/api-reference/rest/storefront/carts), confirmed against Cornerstone 6.22.0 (`templates/components/cart/content.html`, `assets/js/theme/cart.js`), which addresses lines by `id` and offers controls when `can_modify` is true:

| Action | Request | Line identity |
| --- | --- | --- |
| Update | `PUT /api/storefront/carts/{cart_id}/items/{id}` with `{ lineItem: { productId, variantId, quantity } }` | `id` addresses the line; `product_id` is required; `variant_id` is required for option-bearing products and keeps the line's options. |
| Remove | `DELETE /api/storefront/carts/{cart_id}/items/{id}` | `id` |

A successful request returns the full cart. Removing the last line deletes the cart and returns `204` with no body. A rejected update returns a `4xx` problem body whose `detail` gives the reason, such as `Missing item quantity.`; a deleted cart or line returns `404`.

**Behavior.**

- Update validates the field before any request: blank, non-integer, and non-positive values, and values outside the rendered `min_purchase_quantity`/`max_purchase_quantity`, show an inline message, set `aria-invalid`, and send nothing. An unchanged quantity sends nothing.
- One mutation runs at a time across the page. While it is pending, every line's buttons are `aria-disabled` and inputs read-only, and repeated activation is ignored, so no duplicate or conflicting request is sent and no older response can land after a newer one. Controls stay focusable so keyboard focus is not lost.
- On success the module passes the returned cart to [cart state](cart-state-and-ui-updates.md) (`replaceCartSummary()`, or `clearCartSummary()` when the cart was deleted), emits `cart:item-updated` or `cart:item-removed`, and reloads the page. The reload renders the confirmed items, adjustments, and totals from the server; the browser computes no amounts.
- After the reload, an update moves focus to that line's quantity input and announces "Quantity updated." in the line's live message. A removal focuses the cart heading and announces "Item removed from cart." in the page status region, including when the cart is now empty. The result is carried across the reload in `sessionStorage`; without storage the reloaded cart still shows the result, without the announcement.
- On failure the module keeps the last confirmed cart, restores the input to the confirmed quantity, re-enables the controls, and shows a localized message in the line's live region. A `404` asks the shopper to reload because the cart changed; other `4xx` rejections append the platform's `detail`, such as an inventory limit.

The template passes localized copy for these states to the module through `data-message-*` attributes, and each control's accessible name includes the item name.

## Limitations

- No coupon, gift certificate, or shipping estimator inputs. Applied coupons, certificates, and estimated shipping still appear as summary rows.
- `cart.additional_checkout_buttons` (wallet buttons) and the multiple-address checkout link (`show_multiple_address_shipping`) are not rendered.
- Gift wrapping per item, event dates, and inventory or backorder messages are not rendered.
- Original prices are not shown beside discounted ones.
- Item images use the product image only; items without one, such as gift certificates, show an empty frame.

- Gift certificate lines cannot be removed from the cart page, and product options cannot be edited.
- A platform rejection message (`detail`) is shown as the platform sends it, in the store's default language.

## Future Work

- In-place cart refresh instead of a page reload, reconciling items, totals, and shared state from the server.
- Gift certificate removal and product option editing.
- Coupon and gift certificate entry, shipping estimation, and additional checkout buttons.
