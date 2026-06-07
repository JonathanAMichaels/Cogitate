import { defineConfig } from 'vite';

// Static-site build. `base: './'` makes the built asset paths relative so the
// experiment works when served from a subpath (e.g. GitHub Pages) or uploaded
// to a jsPsych host. The test config points Vitest at the node environment;
// the core game logic is pure JS and needs no DOM.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
