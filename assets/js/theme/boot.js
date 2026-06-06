import { setupGlobal } from './global.js';

const pageModules = {};

function reportThemeError(pageType, error) {
  if (import.meta.env.DEV) {
    console.error(`Failed to load Coral theme setup for page type: ${pageType}`, error);
  }
}

export function bootTheme({ pageType = '', context = {}, root = document } = {}) {
  const env = { pageType, context, root };

  setupGlobal(env);

  const loadPageModule = pageModules[pageType];

  if (typeof loadPageModule !== 'function') {
    return;
  }

  loadPageModule()
    .then((module) => {
      const setup = module.setup ?? module.default;

      if (typeof setup === 'function') {
        setup(env);
      }
    })
    .catch((error) => {
      reportThemeError(pageType, error);
    });
}
