# Product Listings

Coral renders product lists server-side. The home page's featured products and the category page share one product-card partial; each page owns its own heading, list, and empty states.

## Product Card

`templates/components/product-card/product-card.html` renders one `<article>` from a Stencil product list item. Callers render the surrounding `<ul>`/`<li>` grid and pass two values that are not part of the product object:

```handlebars
{{#each category.products}}
    <li>
        {{> components/product-card/product-card customer=../customer hide_price_from_guests=../settings.hide_price_from_guests}}
    </li>
{{/each}}
```

Use `../` for these lookups, not `@root`; see [Template Context](stencil-primer.md#template-context).

The card renders:

- An image link and a title link to the product. Without an image, the image link shows a placeholder.
- The brand name and summary when present.
- The server-formatted `price.with_tax` or `price.without_tax`. When `hide_price_from_guests` is on and no customer is signed in, it shows a "Log in for pricing" message instead.
- When `show_cart_action` is true, at most one action:

| Product | Action |
| --- | --- |
| `has_options` | "Choose options" link to the product page. |
| `pre_order_add_to_cart_url`, or `pre_order` with `add_to_cart_url` | Plain "Pre-order" link to the cart URL. |
| `add_to_cart_url` | "Add to cart" link with the `data-coral-add-to-cart` hook. See [add-to-cart-theme-enhancement.md](add-to-cart-theme-enhancement.md). |
| None of the above | No action. |

Every link is a native anchor, so products, options, and the cart fallback work without JavaScript. Card copy comes from `products.card.*` in `lang/en.json`.

## Category Page

`templates/pages/category.html` renders every category route, such as `/shop-all/`. Its front matter declares the first page of products and the cart summary used by the header and cart drawer mounts:

```yaml
---
category:
    products:
        limit: 12
cart: true
---
```

The page renders, in order:

- `category.name` as the page heading, followed by `category.description` (merchant HTML) when present.
- A "Subcategories" navigation of `category.subcategories` links when the category has any.
- `category.products` as product cards in a one-column grid that becomes two columns at `sm` and three at `lg`.
- When there are no products: the `category.search_error` message if the platform reports a search error, otherwise a no-products message.

Category copy comes from `category.*` in `lang/en.json`.

## Future Work

- Sorting and pagination from `pagination.category` ([#14](https://github.com/petercossey/coral/issues/14) slice B), then filters (slice C).
- Breadcrumbs, the category image, and `{{region}}` placements.
- An out-of-stock card action that links to the product with `out_of_stock_message`, as Cornerstone does ([#15](https://github.com/petercossey/coral/issues/15)).
- Reusing the card for search, brand, and brands-index listings.
