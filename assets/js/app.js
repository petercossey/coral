import '../css/style.css';
import { getCoralContext, getCoralPageType } from './context.js';
import { bootComponents } from './runtime/boot.js';
import { componentRegistry } from './runtime/registry.js';
import { bootTheme } from './theme/boot.js';

document.documentElement.classList.add('js');

const env = {
  pageType: getCoralPageType(),
  context: getCoralContext(),
};

bootComponents(componentRegistry, env);
bootTheme(env);
