import { h, render } from 'preact';

// This runtime is intentionally narrow: it mounts Preact client components
// declared with data-coral-component. JavaScript for server-rendered markup
// lives under assets/js/theme/ and is booted separately.
const componentSelector = '[data-coral-component]';

// Track mounted DOM roots so repeated subtree boots do not duplicate work.
// When removing dynamic HTML, call unmountComponents() first so component
// effects and custom mount cleanup functions can run.
const mountedRoots = new WeakMap();

/**
 * @typedef {Object} MountContext
 * @property {string} name
 * @property {ParentNode} root
 */

/**
 * @typedef {Object} ComponentDefinition
 * @property {import('preact').ComponentType<any>} [component]
 * @property {(element: Element) => Record<string, unknown>} [props]
 * @property {(element: Element, context: MountContext) => void | (() => void)} [mount]
 */

function warn(message, detail = undefined) {
  if (import.meta.env.DEV) {
    console.warn(message, detail);
  }
}

function error(message, detail = undefined) {
  if (import.meta.env.DEV) {
    console.error(message, detail);
  }
}

function getComponentRoots(root) {
  const roots = [];

  if (root instanceof Element && root.matches(componentSelector)) {
    roots.push(root);
  }

  if (typeof root.querySelectorAll === 'function') {
    roots.push(...root.querySelectorAll(componentSelector));
  }

  return roots;
}

function groupRootsByComponentName(root) {
  const rootsByName = new Map();

  for (const element of getComponentRoots(root)) {
    const name = element.dataset.coralComponent;

    if (!name) {
      continue;
    }

    if (!rootsByName.has(name)) {
      rootsByName.set(name, []);
    }

    rootsByName.get(name).push(element);
  }

  return rootsByName;
}

function getDefinition(module) {
  return module.default ?? module;
}

function mountRoot(element, definition, context) {
  if (mountedRoots.has(element)) {
    return;
  }

  if (typeof definition.mount === 'function') {
    // Most client modules should export component and props. Custom mount is
    // an escape hatch for unusual client components and should return cleanup.
    const cleanup = definition.mount(element, context);

    mountedRoots.set(element, {
      cleanup: typeof cleanup === 'function' ? cleanup : undefined,
    });
    return;
  }

  if (!definition.component) {
    warn('Coral component definition is missing a component export.', definition);
    return;
  }

  const props = typeof definition.props === 'function' ? definition.props(element) : {};

  render(h(definition.component, props), element);
  mountedRoots.set(element, {
    cleanup() {
      render(null, element);
    },
  });
}

export function bootComponents(registry, root = document) {
  // Public boot API for app.js keeps the common call site terse:
  // bootComponents(componentRegistry).
  return mountComponents(root, registry);
}

/**
 * Mount registered client components found in a document or subtree.
 *
 * Use this after inserting server-rendered fragments that may contain
 * data-coral-component roots. Existing mounted roots are skipped.
 */
export async function mountComponents(root = document, registry = {}) {
  const rootsByName = groupRootsByComponentName(root);

  await Promise.all(
    Array.from(rootsByName.entries()).map(async ([name, roots]) => {
      const load = registry[name];

      if (!load) {
        warn(`Unknown Coral client component: ${name}`);
        return;
      }

      try {
        const definition = getDefinition(await load());

        for (const element of roots) {
          try {
            mountRoot(element, definition, { name, root });
          } catch (mountError) {
            error(`Failed to mount Coral client component: ${name}`, mountError);
          }
        }
      } catch (loadError) {
        error(`Failed to load Coral client component: ${name}`, loadError);
      }
    }),
  );
}

export function unmountComponents(root = document) {
  for (const element of getComponentRoots(root)) {
    const mounted = mountedRoots.get(element);

    if (!mounted) {
      continue;
    }

    if (mounted.cleanup) {
      mounted.cleanup();
    }

    mountedRoots.delete(element);
  }
}
