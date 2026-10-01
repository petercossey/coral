// Manual smoke check for cart-page quantity editing and removal against a running
// `stencil start --no-cache` storefront. It creates a guest cart; no order is placed.
// Usage: node tests/cart-page/storefront-smoke.mjs
// Env: STOREFRONT_URL (default http://localhost:3000), SIMPLE_PRODUCT_ID (default 111),
//      OPTION_PRODUCT (default "77:108=69,109=8;108=70,109=10": product, then two option sets).
import { launchHarnessBrowser } from '../cart-drawer/browser-harness.js';

const STOREFRONT_URL = (process.env.STOREFRONT_URL || 'http://localhost:3000').replace(/\/$/, '');
const SIMPLE_PRODUCT_ID = Number(process.env.SIMPLE_PRODUCT_ID || 111);
const [optionProductId, optionSets] = (process.env.OPTION_PRODUCT || '77:108=69,109=8;108=70,109=10').split(':');
// Native /cart.php adds reject automated user agents (#27); present a desktop browser.
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function parseOptionSet(text) {
  return text.split(',').map((pair) => {
    const [optionId, optionValue] = pair.split('=').map(Number);
    return { optionId, optionValue };
  });
}

async function createCart(page) {
  return page.evaluate(
    async ({ simpleId, optionId, sets }) => {
      const response = await fetch('/api/storefront/carts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: [
            { productId: simpleId, quantity: 1 },
            ...sets.map((optionSelections) => ({ productId: optionId, quantity: 1, optionSelections })),
          ],
        }),
      });
      return response.status;
    },
    { simpleId: SIMPLE_PRODUCT_ID, optionId: Number(optionProductId), sets: optionSets.split(';').map(parseOptionSet) },
  );
}

async function readCart(page) {
  return page.evaluate(() => {
    const lines = [...document.querySelectorAll('[data-cart-items] > li')].map((li) => {
      const form = li.querySelector('[data-cart-item-form]');
      const options = [...li.querySelectorAll('h2 ~ dl dd')].map((dd) => dd.textContent.trim()).join('/');
      const amounts = [...li.querySelectorAll('dl:last-of-type dd')].map((dd) => dd.textContent.trim());
      return {
        id: form?.dataset.itemId ?? null,
        name: li.querySelector('h2')?.textContent.trim(),
        options,
        quantity: form?.querySelector('input')?.value ?? null,
        total: amounts.at(-1),
        formVisible: Boolean(form && !form.hidden),
        staticQuantityHidden: li.querySelector('[data-cart-item-quantity-display]')?.hidden ?? null,
      };
    });
    const summary = [...document.querySelectorAll('section dl')].at(-1);
    const trigger = document.querySelector('[data-cart-drawer-trigger]');
    return {
      lines,
      subtotal: summary?.querySelector('dd')?.textContent.trim() ?? null,
      checkout: Boolean(document.querySelector('a[href*="checkout"]')),
      empty: !document.querySelector('[data-cart-items]'),
      headerCount: trigger?.querySelector('[data-cart-link-count]')?.textContent.trim() ?? null,
      headerSubtotal: trigger?.querySelector('[data-cart-link-subtotal]')?.textContent.trim() ?? null,
      pageMessage: document.querySelector('[data-cart-page-message]')?.textContent.trim() ?? '',
      active: document.activeElement?.id || document.activeElement?.tagName,
    };
  });
}

async function waitForSetup(page) {
  await page.waitForFunction(() => {
    const form = document.querySelector('[data-cart-item-form]');
    return !document.querySelector('[data-cart-items]') || (form && !form.hidden);
  });
}

async function gotoCart(page) {
  await page.goto(`${STOREFRONT_URL}/cart.php`);
  await waitForSetup(page);
}

async function updateLine(page, itemId, quantity, { via = 'click' } = {}) {
  const input = page.locator(`#cart-item-quantity-${itemId}`);
  await input.fill(String(quantity));
  const navigation = page.waitForEvent('load');

  if (via === 'enter') {
    await input.press('Enter');
  } else {
    await page.locator(`[data-item-id="${itemId}"] [type="submit"]`).click();
  }

  await navigation;
  await waitForSetup(page);
  await page.waitForTimeout(200);
}

async function removeLine(page, itemId) {
  const navigation = page.waitForEvent('load');
  await page.locator(`[data-item-id="${itemId}"] [data-cart-item-remove]`).click();
  await navigation;
  await waitForSetup(page);
  await page.waitForTimeout(200);
}

async function readDrawer(page) {
  await page.locator('[data-cart-drawer-trigger]').first().click();
  await page.waitForFunction(() => document.querySelector('.coral-cart-drawer')?.open);
  const text = await page.locator('.coral-cart-drawer').innerText();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.coral-cart-drawer')?.open);
  return text.replace(/\s+/g, ' ');
}

function cartRequests(page) {
  const requests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/storefront/carts')) {
      requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  return requests;
}

const browser = await launchHarnessBrowser();

try {
  const context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const requests = cartRequests(page);

  await page.goto(`${STOREFRONT_URL}/`);
  record('create three-line cart (simple + two option sets)', (await createCart(page)) === 200);

  await gotoCart(page);
  let cart = await readCart(page);
  const [simple, optionA, optionB] = cart.lines;
  record(
    'controls enabled after setup, static quantity hidden',
    cart.lines.length === 3 && cart.lines.every((line) => line.formVisible && line.staticQuantityHidden),
  );
  const names = await page.$$eval('[data-cart-item-form] input, [data-cart-item-form] button', (elements) =>
    elements.map((element) => element.getAttribute('aria-label')),
  );
  record('controls have item-specific accessible names', names.every((name) => name && name.includes('[Sample]')), names[0]);

  const before = cart;
  await updateLine(page, optionA.id, 2);
  cart = await readCart(page);
  const updatedA = cart.lines.find((line) => line.id === optionA.id);
  record(
    'update 1 → 2 changes only the addressed option line',
    updatedA.quantity === '2' &&
      updatedA.options === optionA.options &&
      updatedA.total !== optionA.total &&
      cart.lines.find((line) => line.id === optionB.id).quantity === '1' &&
      cart.lines.find((line) => line.id === simple.id).quantity === '1',
    `${optionA.options} ${optionA.total} → ${updatedA.total}; subtotal ${before.subtotal} → ${cart.subtotal}`,
  );
  record('subtotal changes with the server cart', cart.subtotal !== before.subtotal);
  record('header count and subtotal agree', cart.headerCount === '4' && cart.headerSubtotal === cart.subtotal, `${cart.headerCount} / ${cart.headerSubtotal}`);
  record('focus returns to the updated quantity', cart.active === `cart-item-quantity-${optionA.id}`, cart.active);
  const lineMessage = await page.locator(`#cart-item-message-${optionA.id}`).textContent();
  record('update result is announced on the line', lineMessage.trim() === 'Quantity updated.', lineMessage);
  const drawer = await readDrawer(page);
  record('drawer summary agrees', drawer.includes('4 items') && drawer.includes(cart.subtotal), drawer);

  await page.reload();
  await waitForSetup(page);
  const reloaded = await readCart(page);
  record('reload retains the update', reloaded.lines.find((line) => line.id === optionA.id).quantity === '2');

  await updateLine(page, optionA.id, 1, { via: 'enter' });
  cart = await readCart(page);
  record(
    'keyboard Enter updates 2 → 1 and restores totals',
    cart.lines.find((line) => line.id === optionA.id).quantity === '1' && cart.subtotal === before.subtotal,
    cart.subtotal,
  );

  const sentBefore = requests.length;
  for (const value of ['', '0', '-1', '1.5']) {
    await page.locator(`#cart-item-quantity-${simple.id}`).fill(value);
    await page.locator(`[data-item-id="${simple.id}"] [type="submit"]`).click();
  }
  const invalid = await page.locator(`#cart-item-quantity-${simple.id}`).getAttribute('aria-invalid');
  const invalidMessage = await page.locator(`#cart-item-message-${simple.id}`).textContent();
  record('invalid quantities send no request', requests.length === sentBefore && invalid === 'true', invalidMessage);
  await page.locator(`#cart-item-quantity-${simple.id}`).fill('1');

  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/storefront/carts/*/items/*', async (route) => {
    await held;
    await route.continue();
  });
  const duplicateStart = requests.length;
  await page.locator(`#cart-item-quantity-${simple.id}`).fill('2');
  await page.locator(`[data-item-id="${simple.id}"] [type="submit"]`).click();
  // Busy controls are aria-disabled, so force the repeated activations.
  await page.locator(`[data-item-id="${simple.id}"] [type="submit"]`).click({ force: true });
  await page.locator(`[data-item-id="${optionB.id}"] [data-cart-item-remove]`).click({ force: true });
  await page.locator(`#cart-item-quantity-${simple.id}`).press('Enter');
  const busy = await page.locator(`[data-item-id="${optionB.id}"] [data-cart-item-remove]`).getAttribute('aria-disabled');
  const duplicateNavigation = page.waitForEvent('load');
  release();
  await duplicateNavigation;
  await page.unroute('**/api/storefront/carts/*/items/*');
  await waitForSetup(page);
  cart = await readCart(page);
  record(
    'repeated activation while pending sends one mutation',
    requests.length - duplicateStart === 1 && busy === 'true' && cart.lines.length === 3,
    requests.slice(duplicateStart).join(', '),
  );
  await updateLine(page, simple.id, 1);

  await page.route('**/api/storefront/carts/*/items/*', (route) => route.abort('failed'));
  await page.locator(`#cart-item-quantity-${simple.id}`).fill('3');
  await page.locator(`[data-item-id="${simple.id}"] [type="submit"]`).click();
  await page.waitForFunction((id) => document.querySelector(`#cart-item-message-${id}`)?.textContent.includes('Try again'), simple.id);
  const failed = await page.evaluate((id) => ({
    value: document.querySelector(`#cart-item-quantity-${id}`).value,
    disabled: document.querySelector(`[data-item-id="${id}"] [type="submit"]`).getAttribute('aria-disabled'),
    message: document.querySelector(`#cart-item-message-${id}`).textContent,
  }), simple.id);
  record('network failure restores the confirmed quantity and controls', failed.value === '1' && failed.disabled === null, failed.message);
  await page.unroute('**/api/storefront/carts/*/items/*');

  await page.route('**/api/storefront/carts/*/items/*', (route) =>
    route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ status: 422, title: 'Unprocessable', detail: 'Only 2 left in stock.' }) }),
  );
  await page.locator(`#cart-item-quantity-${simple.id}`).fill('5');
  await page.locator(`[data-item-id="${simple.id}"] [type="submit"]`).click();
  await page.waitForFunction((id) => document.querySelector(`#cart-item-message-${id}`)?.textContent.includes('stock'), simple.id);
  const rejected = await page.locator(`#cart-item-message-${simple.id}`).textContent();
  record('platform rejection is surfaced', rejected.includes('Only 2 left in stock.'), rejected);
  await page.unroute('**/api/storefront/carts/*/items/*');
  await page.reload();
  await waitForSetup(page);
  cart = await readCart(page);
  record('failures leave the server cart unchanged', cart.subtotal === before.subtotal && cart.lines.length === 3);

  await removeLine(page, optionB.id);
  cart = await readCart(page);
  record(
    'remove deletes only the selected line',
    cart.lines.length === 2 && !cart.lines.some((line) => line.id === optionB.id) && cart.lines.some((line) => line.id === optionA.id && line.options === optionA.options),
  );
  record('removal moves focus to the heading and announces it', cart.active === 'cart-heading' && cart.pageMessage === 'Item removed from cart.', `${cart.active}: ${cart.pageMessage}`);
  record('header count follows removal', cart.headerCount === '2' && cart.headerSubtotal === cart.subtotal, cart.headerCount);

  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const box = await page.locator(`[data-item-id="${simple.id}"] [data-cart-item-remove]`).boundingBox();
  record('controls fit a 375px viewport', overflow <= 0 && box && box.x + box.width <= 375, `overflow ${overflow}px`);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.locator(`#cart-item-quantity-${simple.id}`).focus();
  await page.keyboard.press('Tab');
  const focusStyle = await page.evaluate(() => ({
    label: document.activeElement.getAttribute('aria-label'),
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  record('keyboard focus reaches Update with a visible outline', focusStyle.label?.startsWith('Update') && focusStyle.outline !== 'none', JSON.stringify(focusStyle));

  for (const line of cart.lines) {
    await removeLine(page, line.id);
  }
  cart = await readCart(page);
  record('removing the last line shows the empty state without checkout', cart.empty && !cart.checkout, cart.pageMessage);
  record('header count is 0 after emptying', cart.headerCount === '0', cart.headerCount);

  await page.goto(`${STOREFRONT_URL}/`);
  const addStart = requests.length;
  await page.locator('a[data-coral-add-to-cart]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-cart-link-count]')?.textContent.trim() === '1');
  record('add after empty creates a new cart', requests.slice(addStart).join() === 'POST /api/storefront/carts', requests.slice(addStart).join());
  await gotoCart(page);
  cart = await readCart(page);
  const checkoutHref = await page.locator('a[href*="checkout"]').first().getAttribute('href');
  const checkout = await page.goto(new URL(checkoutHref, STOREFRONT_URL).href);
  record('checkout handoff loads', cart.lines.length === 1 && checkout.status() === 200, `${checkoutHref} ${checkout.status()}`);

  const noJs = await browser.newContext({ userAgent: USER_AGENT, javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  const added = await noJsPage.goto(`${STOREFRONT_URL}/cart.php?action=add&product_id=${SIMPLE_PRODUCT_ID}`);
  const baseline = await noJsPage.evaluate(() => ({
    items: document.querySelectorAll('[data-cart-items] > li').length,
    formsHidden: [...document.querySelectorAll('[data-cart-item-form]')].every((form) => form.hidden),
    productLink: Boolean(document.querySelector('[data-cart-items] h2 a[href]')),
    checkout: Boolean(document.querySelector('a[href*="checkout"]')),
    notice: document.querySelector('noscript')?.textContent.trim(),
  }));
  record(
    'no-JS cart lists items with controls hidden and links intact',
    added.status() === 200 && baseline.items === 1 && baseline.formsHidden && baseline.productLink && baseline.checkout,
    JSON.stringify(baseline),
  );
  await noJs.close();
  await context.close();
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;
