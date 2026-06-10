# Stencil Primer

A short orientation for developers new to BigCommerce Stencil, covering only what Coral uses. The [BigCommerce Stencil docs](https://developer.bigcommerce.com/docs/storefront/stencil/start) are the authoritative reference; this primer maps Coral onto them.

## Pages And Templates

Stencil owns storefront routing. Themes do not define URLs; instead, each file in `templates/pages/` renders a storefront page type: `home.html` is the homepage, `product.html` is every product detail page, `search.html` is search results, and so on. See the [theme directory structure](https://developer.bigcommerce.com/docs/storefront/stencil/themes/foundations/directory-structure) for the full template-to-page mapping.

## Front Matter

The YAML block at the top of a page template declares the data Stencil fetches for that page:

```yaml
---
products:
    featured:
        limit: 8
cart: true
---
```

Only declared data is available to the template. Some objects, such as `product` on product pages, are provided automatically. See the [front matter reference](https://developer.bigcommerce.com/docs/storefront/stencil/themes/context/frontmatter-reference).

## Template Context

Templates render from Stencil's Handlebars context: objects such as `product`, `cart`, `urls`, `settings`, and `categories`, plus helpers such as `{{cdn}}` and `{{getImageSrcset}}`. See the [Handlebars reference](https://developer.bigcommerce.com/docs/storefront/stencil/themes/context/handlebars-reference).

To inspect the context for any page during `stencil start`, append `?debug=context` to the local URL for raw JSON, or `?debug=bar` to see the rendered page and JSON together.

## Page Types

`{{page_type}}` is a global string identifying the current page. Coral exposes it to client code as `window.Coral.pageType`, and `assets/js/theme/boot.js` can run page-specific setup from it. Common values:

| Page | `page_type` |
| --- | --- |
| Homepage | `default` |
| Product detail | `product` |
| Category listing | `category` |
| Search results | `search` |
| Cart | `cart` |
| Web page | `page` |

Note the homepage is `default`, not `home`. The full list is in the [page_type reference](https://developer.bigcommerce.com/docs/storefront/stencil/themes/context/object-reference/page-type).

## Server Data In Client Code

The browser only receives template data that is explicitly passed: through `data-*` attributes on markup, or through `{{inject}}` rendered by `{{jsContext}}`. Coral's base layout publishes both onto `window.Coral`, and `assets/js/context.js` is the read-only adapter client code reads from. Do not assume a Stencil object is available in JavaScript just because a template can render it.
