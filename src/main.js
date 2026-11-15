import { startRouter } from './core/router.js';
import { initPWA } from './core/pwa.js';
import { applyTheme, currentTheme } from './core/session.js';

applyTheme(currentTheme());
initPWA();
startRouter();
