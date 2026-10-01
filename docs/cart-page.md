# Cart Page

`templates/pages/cart.html` renders the shopper's cart server-side from the Stencil `cart` object (`page_type` `cart`, route `/cart.php`). The server cart is the authority: the page renders the amounts and quantities the platform supplies and computes or parses nothing.

## Context

The page declares `cart: true` in front matter, which also feeds the header cart link and the cart drawer mount in `layout/base`. The fields it reads were confirmed against Cornerstone 6.22.0 (`templates/pages/cart.html`, `templates/components/cart/content.html`, `templates/components/cart/totals.html`) and the observed `?debug=context` output:

| Area | Fields |
| --- | --- |
| Cart | `items`, `quantity`, `status_messages[].message`, `show_primary_checkout_button`, `multi_coupon_ui_enabled` |
| Line item | `name`, `url`, `brand.name`, `image`, `options[].name`, `options[].value`, `quantity`, `price`, `price_discounted`, `total`, `total_discounted`, `type` |
| Totals | `sub_total`, `display_discount_total` or `discount` and `coupons[].discount`, `gift_wrapping_cost`, `fees[].cost`, `shipping_handling.shipping_cost` and `shipping_cost_discounted`, `taxes[]` (`included`, `name`, `cost`), `gift_certificates[].used`, `grand_total` |
| Global | `urls.home`, `urls.checkout.single_address`, `urls.auth.login`, `customer`, `settings.hide_price_from_guests` |

Every amount is a `formatted` string from the server, so store currency and tax display settings carry through.

## Behavior

- **Empty cart**: a "Your cart is empty" message and a "Continue shopping" link to the home page. No checkout action renders.
- **Status messages**: one-shot platform messages, such as a rejected `/cart.php?action=add`, render above the cart in a `role="status"` region. `message` is platform HTML and renders unescaped, as in Cornerstone.
- **Line items**: each item shows its image, brand, name (linked when the item has a `url`), selected options as a name/value list, unit price, quantity, and line total. Discounted unit and line amounts replace the originals when the platform supplies them.
- **Order summary**: subtotal, then each adjustment the platform supplies, then the grand total and any tax included in it. Rows follow Cornerstone's order so they reconcile with `grand_total`. Discounts render as one `display_discount_total` row when `multi_coupon_ui_enabled`, otherwise as `discount` plus one row per coupon.
- **Checkout**: when `show_primary_checkout_button` is true, a "Check out" link to `urls.checkout.single_address`, the hosted checkout.
- **Hidden prices**: when `settings.hide_price_from_guests` is on and no customer is signed in, item amounts read "Log in for pricing" (gift certificates excepted) and the summary is replaced by a "Log in to check out" link.

The layout is a single column that places the order summary beside the items at `lg`. Every action is a native link, so the page works without JavaScript. Cart copy comes from `cart.*` in `lang/en.json`.

The header cart link and drawer render from the same server `cart` on this page, so their count and subtotal match the page after navigation or reload. See [cart-drawer.md](cart-drawer.md) for the drawer.

## Limitations

- Quantities are read-only; there is no update or remove control.
- No coupon, gift certificate, or shipping estimator inputs. Applied coupons, certificates, and estimated shipping still appear as summary rows.
- `cart.additional_checkout_buttons` (wallet buttons) and the multiple-address checkout link (`show_multiple_address_shipping`) are not rendered.
- Gift wrapping per item, event dates, and inventory or backorder messages are not rendered.
- Original prices are not shown beside discounted ones.
- Item images use the product image only; items without one, such as gift certificates, show an empty frame.

## Future Work

- Quantity editing and item removal (next cart slice), keeping the header and drawer in sync through [cart state](cart-state-and-ui-updates.md).
- Coupon and gift certificate entry, shipping estimation, and additional checkout buttons.
