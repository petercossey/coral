# Theme Notifications

## Purpose

Coral includes a small notification layer for theme moments such as AJAX add-to-cart success, recoverable errors, and cart actions.

The toast container is Coral-native, not a floating-positioning dependency. Fixed viewport toasts do not need Floating UI; reserve Floating UI for future anchored overlays such as tooltips, menus, and button-attached popovers.

## Direction

- Keep shared notification state under `assets/js/state/notifications.js`.
- Render notifications with one Preact client component mounted from `templates/layout/base.html`.
- Keep event producers as plain theme modules.
- Listen for moments such as `cart:item-added` and `cart:item-add-failed`, then enqueue notifications from a small theme setup module.
- Position notifications fixed at the bottom center of the viewport with modest margin from the bottom edge.
- Use restrained Tailwind utilities. The current visual direction is a dark inline bar with light text and inline action links.
- Announce ordinary success messages with polite status semantics.
- Use assertive alert semantics only for urgent failures.

## JavaScript Boundary

This feature is both shared state and a client-rendered UI leaf.

Use a Preact client component for the notification container because it owns dynamic UI: a queue, optional actions, timers, and render updates.

Use theme enhancement modules for event wiring because cart links, product forms, and future server-rendered interactions should stay Handlebars-owned. A theme module can subscribe to Coral events and call notification state actions without knowing how the toast UI renders.

Shape:

```text
assets/js/
  state/notifications.js
  components/notifications/notifications.client.jsx
  theme/notifications/notifications.js
```

The layout mount can stay minimal:

```html
<div data-coral-component="notifications"></div>
```

## Example Flow

1. `assets/js/theme/cart/add-to-cart.js` successfully mutates the cart.
2. It updates cart state.
3. It emits `cart:item-added`.
4. `assets/js/theme/notifications/notifications.js` handles the event.
5. It enqueues a success notification with optional inline actions such as "Open cart".
6. `assets/js/components/notifications/notifications.client.jsx` renders the toast from shared notification state.

Events remain moments. Notification state owns the visible queue.

## Non-Goals

- Do not add Floating UI for the initial toast stack.
- Do not add Sonner, Radix Toast, Zag Toast, or another React-oriented toast package.
- Do not replace server-rendered interactions with Preact just to show feedback.
- Do not make notifications the source of truth for cart state.
- Do not add decorative motion, heavy shadows, or branded styling in the starter.
