import { h, render } from 'preact';

// This runtime is intentionally narrow: it mounts Preact client components
// declared with data-coral-component. JavaScript for server-rendered markup
// lives under assets/js/theme/ and is booted separately.
const componentSelector = '[data-coral-component]';

// Track mounted DOM roots so repeated subtree boots do not duplicate work.
// When removing dynamic HTML, call unmountComponents() first so component
// effects and custom mount cleanup functions can run.
const mountedRoots = new WeakMap();
const scheduledRoots = new WeakMap();

/**
 * @typedef {Object} MountContext
 * @property {string} name
 * @property {ParentNode} root
 * @property {string} [pageType]
 * @property {Record<string, unknown>} [context]
 */

/**
 * @typedef {Object} ComponentDefinition
 * @property {import('preact').ComponentType<any>} [component]
 * @property {(element: Element, context: MountContext) => Record<string, unknown>} [props]
 * @property {(element: Element, context: MountContext) => void | (() => void)} [mount]
 */

/**
 * @typedef {Object} MountOptions
 * @property {ParentNode} [root]
 * @property {string} [pageType]
 * @property {Record<string, unknown>} [context]
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

  const props = typeof definition.props === 'function' ? definition.props(element, context) : {};

  render(h(definition.component, props), element);
  mountedRoots.set(element, {
    cleanup() {
      render(null, element);
    },
  });
}

function getLoadMode(element) {
  const loadMode = element.dataset.coralLoad || 'immediate';

  if (loadMode === 'immediate' || loadMode === 'idle' || loadMode === 'visible') {
    return loadMode;
  }

  warn(`Unknown Coral component load mode: ${loadMode}`, element);

  return 'immediate';
}

function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback);

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, 1);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function scheduleVisible(element, callback) {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) {
      return;
    }

    observer.disconnect();
    scheduledRoots.delete(element);
    callback();
  });

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}

function scheduleMount(element, loadMode, callback) {
  if (mountedRoots.has(element) || scheduledRoots.has(element)) {
    return undefined;
  }

  if (loadMode === 'immediate') {
    return callback();
  }

  let cancel;

  const run = () => {
    scheduledRoots.delete(element);

    if (!element.isConnected) {
      return;
    }

    callback();
  };

  if (loadMode === 'idle') {
    cancel = scheduleIdle(run);
  }

  if (loadMode === 'visible') {
    if (typeof window.IntersectionObserver !== 'function') {
      return callback();
    }

    cancel = scheduleVisible(element, run);
  }

  if (typeof cancel === 'function') {
    scheduledRoots.set(element, { cancel });
  }

  return undefined;
}

function normalizeBootOptions(options) {
  if (options && typeof options.querySelectorAll === 'function') {
    return { root: options };
  }

  return options ?? {};
}

export function bootComponents(registry, options = {}) {
  // Public boot API for app.js keeps the common call site terse:
  // bootComponents(componentRegistry, env).
  const mountOptions = normalizeBootOptions(options);

  return mountComponents(mountOptions.root ?? document, registry, mountOptions);
}

/**
 * Mount registered client components found in a document or subtree.
 *
 * Use this after inserting server-rendered fragments that may contain
 * data-coral-component roots. Existing mounted roots are skipped.
 */
export async function mountComponents(root = document, registry = {}, options = {}) {
  const rootsByName = groupRootsByComponentName(root);
  const definitionPromises = new Map();
  const mountTasks = [];

  function getDefinitionPromise(name, load) {
    if (!definitionPromises.has(name)) {
      definitionPromises.set(name, load().then(getDefinition));
    }

    return definitionPromises.get(name);
  }

  async function mountRegisteredRoot(element, name, load) {
    try {
      const definition = await getDefinitionPromise(name, load);

      mountRoot(element, definition, {
        name,
        root,
        pageType: options.pageType ?? '',
        context: options.context ?? {},
      });
    } catch (mountError) {
      error(`Failed to mount Coral client component: ${name}`, mountError);
    }
  }

  for (const [name, roots] of rootsByName.entries()) {
    const load = registry[name];

    if (!load) {
      warn(`Unknown Coral client component: ${name}`);
      continue;
    }

    for (const element of roots) {
      const task = scheduleMount(element, getLoadMode(element), () => {
        return mountRegisteredRoot(element, name, load);
      });

      if (task) {
        mountTasks.push(task);
      }
    }
  }

  await Promise.all(mountTasks);
}

export function unmountComponents(root = document) {
  for (const element of getComponentRoots(root)) {
    const scheduled = scheduledRoots.get(element);

    if (scheduled) {
      scheduled.cancel();
      scheduledRoots.delete(element);
    }

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
