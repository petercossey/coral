import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from 'playwright-core';

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

export async function startDrawerHarnessServer() {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    publicDir: false,
    plugins: [tailwindcss()],
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'preact',
    },
    optimizeDeps: {
      include: [
        'preact',
        'preact/hooks',
        'preact/jsx-runtime',
        'preact/jsx-dev-runtime',
        '@preact/signals',
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      warmup: {
        clientFiles: ['./tests/cart-drawer/fixtures/drawer-harness.js'],
      },
    },
  });

  await server.listen();
  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const origin = `http://127.0.0.1:${port}`;

  // Warm the module graph before Playwright attaches so the first browser
  // visit does not get interrupted by a Vite dependency-optimizer reload.
  await fetch(`${origin}/tests/cart-drawer/fixtures/drawer-harness.html`);
  await fetch(`${origin}/tests/cart-drawer/fixtures/drawer-harness.js`);

  return {
    origin,
    async close() {
      await server.close();
    },
  };
}

export async function launchHarnessBrowser() {
  let lastError;

  for (const executablePath of chromeCandidates) {
    try {
      return await chromium.launch({
        executablePath,
        headless: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox'],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to launch a local Chrome/Chromium browser for drawer checks.');
}

export async function openDrawerHarnessPage(browser, origin) {
  const page = await browser.newPage();
  await page.goto(`${origin}/tests/cart-drawer/fixtures/drawer-harness.html`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__coralCartDrawerHarness?.isReady() === true);

  // If Vite still reloads after optimizer discovery, wait briefly for a remount.
  await Promise.race([
    page.waitForEvent('load', { timeout: 1000 }).catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 250)),
  ]);
  await page.waitForFunction(() => window.__coralCartDrawerHarness?.isReady() === true);

  return page;
}

export async function waitForDrawerOpenSettled(page) {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('.coral-cart-drawer');

    if (!dialog?.open || dialog.classList.contains('is-opening')) {
      return false;
    }

    return getComputedStyle(dialog).display === 'flex' && getComputedStyle(dialog).transform === 'matrix(1, 0, 0, 1, 0, 0)';
  });
}

export async function collectTabStopIds(page, maxStops = 12) {
  await page.locator('body').click({ position: { x: 0, y: 0 } });

  const stops = [];

  for (let index = 0; index < maxStops; index += 1) {
    await page.keyboard.press('Tab');

    const stop = await page.evaluate(() => {
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || active === document.body) {
        return null;
      }

      return {
        id: active.id || null,
        className: typeof active.className === 'string' ? active.className : '',
        ariaLabel: active.getAttribute('aria-label'),
        tagName: active.tagName,
        inCartDrawer: Boolean(active.closest('.coral-cart-drawer')),
      };
    });

    if (!stop) {
      break;
    }

    const fingerprint = `${stop.tagName}:${stop.id}:${stop.className}:${stop.ariaLabel}`;

    if (stops.some((entry) => entry.fingerprint === fingerprint)) {
      break;
    }

    stops.push({ ...stop, fingerprint });
  }

  return stops;
}

export async function getClosedDrawerSnapshot(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('.coral-cart-drawer');
    const closeButton = document.querySelector('.coral-cart-drawer__close');
    const viewCartLink = dialog?.querySelector('a[href="/cart.php"]');

    closeButton?.focus();
    const activeAfterCloseFocus = document.activeElement;

    viewCartLink?.focus();
    const activeAfterViewCartFocus = document.activeElement;

    return {
      hasOpenAttribute: dialog?.hasAttribute('open') ?? null,
      dialogOpen: dialog?.open ?? null,
      display: dialog ? getComputedStyle(dialog).display : null,
      closeFocused: activeAfterCloseFocus === closeButton,
      viewCartFocused: activeAfterViewCartFocus === viewCartLink,
      accessibleDialogCount: document.querySelectorAll('dialog[open]').length,
    };
  });
}
