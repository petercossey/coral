import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  collectTabStopIds,
  getClosedDrawerSnapshot,
  launchHarnessBrowser,
  openDrawerHarnessPage,
  startDrawerHarnessServer,
  waitForDrawerOpenSettled,
} from './browser-harness.js';

async function stubReducedMotion(page, matches) {
  await page.emulateMedia({ reducedMotion: matches ? 'reduce' : 'no-preference' });
  await page.evaluate((reducedMotionMatches) => {
    if (!window.__coralOriginalMatchMedia) {
      window.__coralOriginalMatchMedia = window.matchMedia.bind(window);
    }

    window.matchMedia = (query) => {
      if (String(query).includes('prefers-reduced-motion: reduce')) {
        return {
          matches: reducedMotionMatches,
          media: String(query),
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        };
      }

      return window.__coralOriginalMatchMedia(query);
    };
  }, matches);
}

describe('cart drawer closed-state browser checks', () => {
  let server;
  let browser;
  let page;

  before(async () => {
    server = await startDrawerHarnessServer();
    browser = await launchHarnessBrowser();
    page = await openDrawerHarnessPage(browser, server.origin);
  });

  after(async () => {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  });

  async function assertClosedDrawerIsInert() {
    const snapshot = await getClosedDrawerSnapshot(page);
    const tabStops = await collectTabStopIds(page);
    const accessibleDialogCount = await page.getByRole('dialog', { name: 'Cart' }).count();

    assert.equal(snapshot.hasOpenAttribute, false);
    assert.equal(snapshot.dialogOpen, false);
    assert.equal(snapshot.display, 'none');
    assert.equal(snapshot.closeFocused, false);
    assert.equal(snapshot.viewCartFocused, false);
    assert.equal(snapshot.accessibleDialogCount, 0);
    assert.equal(accessibleDialogCount, 0);
    assert.deepEqual(
      tabStops.map((stop) => stop.id),
      ['before-link', 'cart-trigger', 'after-link'],
    );
    assert.equal(
      tabStops.some((stop) => stop.inCartDrawer || stop.className.includes('coral-cart-drawer__close')),
      false,
    );
  }

  it('keeps closed drawer controls out of the tab order and accessibility tree on initial mount', async () => {
    await assertClosedDrawerIsInert();
  });

  it('keeps [open] and display:flex during the exit animation, then hides again after dismissal', async () => {
    await stubReducedMotion(page, false);

    await page.evaluate(() => {
      const dialog = document.querySelector('.coral-cart-drawer');
      dialog.style.setProperty('--coral-cart-drawer-duration', '400ms');
      window.__coralCartDrawerHarness.openCartDrawer();
    });

    await waitForDrawerOpenSettled(page);

    assert.equal(await page.getByRole('dialog', { name: 'Cart' }).count(), 1);
    assert.equal(await page.evaluate(() => window.__coralCartDrawerHarness.prefersReducedMotion()), false);

    const closingWhileOpen = page.waitForFunction(() => {
      const dialog = document.querySelector('.coral-cart-drawer');
      return dialog?.open && dialog.classList.contains('is-closing') && getComputedStyle(dialog).display === 'flex';
    });

    await page.evaluate(() => {
      window.__coralCartDrawerHarness.closeCartDrawer();
    });

    await closingWhileOpen;

    await page.waitForFunction(() => {
      const dialog = document.querySelector('.coral-cart-drawer');
      return !dialog?.open && getComputedStyle(dialog).display === 'none';
    });

    await assertClosedDrawerIsInert();
  });

  it('hides closed drawer controls after a reduced-motion dismissal', async () => {
    await stubReducedMotion(page, true);

    await page.evaluate(() => {
      window.__coralCartDrawerHarness.openCartDrawer();
    });

    await page.waitForFunction(() => document.querySelector('.coral-cart-drawer')?.open === true);
    assert.equal(await page.getByRole('dialog', { name: 'Cart' }).count(), 1);

    await page.evaluate(() => {
      window.__coralCartDrawerHarness.closeCartDrawer();
    });

    await page.waitForFunction(() => {
      const dialog = document.querySelector('.coral-cart-drawer');
      return !dialog?.open && getComputedStyle(dialog).display === 'none';
    });

    await assertClosedDrawerIsInert();
  });
});
