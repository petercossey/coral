import { launchHarnessBrowser } from './browser-harness.js';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3000/';
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForDrawerReady(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.coral-cart-drawer')));
}

async function waitForDrawerOpenSettled(page) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('.coral-cart-drawer');
    if (!dialog?.open || dialog.classList.contains('is-opening') || dialog.classList.contains('is-closing')) {
      return false;
    }

    if (getComputedStyle(dialog).display !== 'flex') {
      return false;
    }

    // Accept a fully settled open panel; allow sub-pixel transform residue.
    const rect = dialog.getBoundingClientRect();
    return rect.width > 0 && rect.left < window.innerWidth - 8 && Math.abs(rect.right - window.innerWidth) < 2;
  });
}

async function waitForDrawerClosed(page) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('.coral-cart-drawer');
    return !dialog?.open && getComputedStyle(dialog).display === 'none';
  });
}

async function openDrawerFromHeader(page, { via = 'enter' } = {}) {
  const trigger = page.locator('[data-cart-drawer-trigger]').first();
  await trigger.focus();

  if (via === 'click') {
    await trigger.click();
  } else {
    await page.keyboard.press('Enter');
  }

  await waitForDrawerOpenSettled(page);
}

async function collectKeyboardCycle(page, key, presses = 8) {
  const stops = [];

  for (let index = 0; index < presses; index += 1) {
    await page.keyboard.press(key);
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement;

        if (!(el instanceof HTMLElement) || el === document.body || el === document.documentElement) {
          return { kind: 'transient' };
        }

        if (el.closest('.coral-cart-drawer')) {
          return {
            kind: 'drawer',
            label: el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName,
          };
        }

        return {
          kind: 'outside',
          label: `${el.tagName}${el.id ? `#${el.id}` : ''}`,
        };
      }),
    );
  }

  return stops;
}

async function main() {
  const browser = await launchHarnessBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle' });
    await waitForDrawerReady(page);

    {
      const closedCount = await page.getByRole('dialog', { name: 'Cart' }).count();
      const display = await page.locator('.coral-cart-drawer').evaluate((el) => getComputedStyle(el).display);
      record(
        'closed drawer absent from accessibility tree on load',
        closedCount === 0 && display === 'none',
        `count=${closedCount} display=${display}`,
      );
    }

    await openDrawerFromHeader(page);

    {
      const dialogCount = await page.getByRole('dialog', { name: 'Cart' }).count();
      const active = await page.evaluate(() => ({
        ariaLabel: document.activeElement?.getAttribute('aria-label') || '',
        className: typeof document.activeElement?.className === 'string' ? document.activeElement.className : '',
      }));
      const focusedClose =
        active.ariaLabel === 'Close cart' || active.className.includes('coral-cart-drawer__close');
      record('keyboard open exposes dialog named Cart', dialogCount === 1, `count=${dialogCount}`);
      record('initial focus moves to close button', focusedClose, JSON.stringify(active));
      record('open dialog matches :modal', await page.evaluate(() => document.querySelector('.coral-cart-drawer')?.matches(':modal') === true));
    }

    {
      const tabStops = await collectKeyboardCycle(page, 'Tab');
      const escaped = tabStops.some((stop) => stop.kind === 'outside');
      const drawerLabels = [...new Set(tabStops.filter((stop) => stop.kind === 'drawer').map((stop) => stop.label))];
      record(
        'Tab cycle stays inside modal (ignoring transient body focus)',
        !escaped && drawerLabels.includes('Close cart') && drawerLabels.includes('View cart'),
        JSON.stringify({ drawerLabels, kinds: tabStops.map((stop) => stop.kind) }),
      );

      const shiftStops = await collectKeyboardCycle(page, 'Shift+Tab');
      const shiftEscaped = shiftStops.some((stop) => stop.kind === 'outside');
      const shiftLabels = [...new Set(shiftStops.filter((stop) => stop.kind === 'drawer').map((stop) => stop.label))];
      record(
        'Shift+Tab cycle stays inside modal (ignoring transient body focus)',
        !shiftEscaped && shiftLabels.includes('Close cart') && shiftLabels.includes('View cart'),
        JSON.stringify({ shiftLabels, kinds: shiftStops.map((stop) => stop.kind) }),
      );
    }

    await page.keyboard.press('Escape');
    await waitForDrawerClosed(page);
    {
      const dialogCount = await page.getByRole('dialog', { name: 'Cart' }).count();
      const restored = await page.evaluate(() => document.activeElement?.matches?.('[data-cart-drawer-trigger]') === true);
      record('Escape dismisses drawer and hides from a11y tree', dialogCount === 0, `count=${dialogCount}`);
      record('Escape restores focus to header cart trigger', restored);
    }

    await openDrawerFromHeader(page, { via: 'click' });
    await page.locator('.coral-cart-drawer__close').click();
    await waitForDrawerClosed(page);
    record('close button dismisses drawer', (await page.getByRole('dialog', { name: 'Cart' }).count()) === 0);

    await openDrawerFromHeader(page, { via: 'click' });
    await page.mouse.click(40, 300);
    await waitForDrawerClosed(page);
    record('backdrop click dismisses drawer', (await page.getByRole('dialog', { name: 'Cart' }).count()) === 0);

    // Fresh navigation avoids leftover scroll-lock/layout state before the mutation path.
    await page.goto(STOREFRONT_URL, { waitUntil: 'networkidle' });
    await waitForDrawerReady(page);

    const addToCart = page.locator('[data-coral-add-to-cart]').first();
    await addToCart.scrollIntoViewIfNeeded();
    await addToCart.click();

    // Scope to the notification root — the header cart aria-label also starts with "Open cart".
    const openCartAction = page.locator('[data-coral-component="notifications"] a', { hasText: /^Open cart$/ });
    await openCartAction.waitFor({ state: 'visible', timeout: 15000 });
    await openCartAction.click();
    await waitForDrawerOpenSettled(page);
    record(
      'notification Open cart opens drawer named Cart',
      (await page.getByRole('dialog', { name: 'Cart' }).count()) === 1,
    );

    // Simulate notification expiry while drawer stays open.
    await page.evaluate(() => {
      document.querySelector('[data-coral-component="notifications"]')?.replaceChildren();
    });
    await page.keyboard.press('Escape');
    await waitForDrawerClosed(page);
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-cart-drawer-trigger]') === true);
    {
      const restored = await page.evaluate(() => document.activeElement?.matches?.('[data-cart-drawer-trigger]') === true);
      record('after notification opener disappears, focus falls back to header cart trigger', restored);
    }

    await openDrawerFromHeader(page, { via: 'click' });
    {
      const snapshot = await page.locator('.coral-cart-drawer').ariaSnapshot();
      const compact = snapshot.replace(/\s+/g, ' ').trim();
      record(
        'aria snapshot exposes dialog Cart with Close cart control',
        /dialog/i.test(compact) && /Cart/i.test(compact) && /Close cart/i.test(compact),
        compact.slice(0, 240),
      );
    }

    await page.keyboard.press('Escape');
    await waitForDrawerClosed(page);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const failed = results.filter((result) => !result.ok);
  console.log('\n--- summary ---');
  console.log(`passed=${results.filter((result) => result.ok).length} failed=${failed.length}`);

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
