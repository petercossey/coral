import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lockDocumentScroll,
  prefersReducedMotion,
  resolveFocusTarget,
  restoreFocus,
  unlockDocumentScroll,
} from '../../assets/js/components/cart-drawer/modal.js';

function createFocusable({ connected = true } = {}) {
  return {
    isConnected: connected,
    focusCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
  };
}

describe('cart drawer modal helpers', () => {
  it('detects reduced motion from matchMedia', () => {
    assert.equal(
      prefersReducedMotion({
        matchMedia: () => ({ matches: true }),
      }),
      true,
    );
    assert.equal(
      prefersReducedMotion({
        matchMedia: () => ({ matches: false }),
      }),
      false,
    );
    assert.equal(prefersReducedMotion({}), false);
  });

  it('prefers a connected opener for focus restoration', () => {
    const opener = createFocusable();
    const fallback = createFocusable();
    const root = {
      querySelector() {
        return fallback;
      },
    };

    assert.equal(resolveFocusTarget(opener, { root }), opener);
  });

  it('falls back to the header cart trigger when the opener is gone', () => {
    const opener = createFocusable({ connected: false });
    const fallback = createFocusable();
    const root = {
      querySelector(selector) {
        assert.equal(selector, '[data-cart-drawer-trigger]');
        return fallback;
      },
    };

    assert.equal(resolveFocusTarget(opener, { root }), fallback);
    assert.equal(restoreFocus(opener, { root }), fallback);
    assert.equal(fallback.focusCalls, 1);
  });

  it('returns null when neither opener nor fallback can take focus', () => {
    const root = {
      querySelector() {
        return null;
      },
    };

    assert.equal(resolveFocusTarget(null, { root }), null);
    assert.equal(restoreFocus(null, { root }), null);
  });

  it('locks and restores document scroll styles', () => {
    const styles = {
      documentElementOverflow: '',
      bodyOverflow: '',
      bodyPosition: '',
      bodyTop: '',
      bodyWidth: '',
    };
    let scrolledTo = null;

    const doc = {
      documentElement: {
        scrollTop: 120,
        style: {
          get overflow() {
            return styles.documentElementOverflow;
          },
          set overflow(value) {
            styles.documentElementOverflow = value;
          },
        },
      },
      body: {
        style: {
          get overflow() {
            return styles.bodyOverflow;
          },
          set overflow(value) {
            styles.bodyOverflow = value;
          },
          get position() {
            return styles.bodyPosition;
          },
          set position(value) {
            styles.bodyPosition = value;
          },
          get top() {
            return styles.bodyTop;
          },
          set top(value) {
            styles.bodyTop = value;
          },
          get width() {
            return styles.bodyWidth;
          },
          set width(value) {
            styles.bodyWidth = value;
          },
        },
      },
      defaultView: {
        scrollY: 120,
        scrollTo(_x, y) {
          scrolledTo = y;
        },
      },
    };

    const snapshot = lockDocumentScroll(doc);

    assert.equal(styles.documentElementOverflow, 'hidden');
    assert.equal(styles.bodyOverflow, 'hidden');
    assert.equal(styles.bodyPosition, 'fixed');
    assert.equal(styles.bodyTop, '-120px');
    assert.equal(styles.bodyWidth, '100%');
    assert.equal(snapshot.scrollY, 120);

    unlockDocumentScroll(snapshot, doc);

    assert.equal(styles.documentElementOverflow, '');
    assert.equal(styles.bodyOverflow, '');
    assert.equal(styles.bodyPosition, '');
    assert.equal(styles.bodyTop, '');
    assert.equal(styles.bodyWidth, '');
    assert.equal(scrolledTo, 120);
  });

  it('ignores unlock when no snapshot exists', () => {
    assert.equal(unlockDocumentScroll(null), undefined);
  });
});
