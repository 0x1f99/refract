'use strict';

document.addEventListener('DOMContentLoaded', () => {
  RefractState.init();
  RefractUI.init();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
  systemTheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('refract_theme')) {
      RefractUI.applyTheme(e.matches ? 'light' : 'dark');
    }
  });
});
