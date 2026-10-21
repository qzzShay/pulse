// Builds the self-contained artifact preview: node demo/build.mjs [out.html]
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const abs = p => resolve(root, p);
const out = process.argv[2] || abs('demo/dist/pulse-preview.html');

const alias = {
  name: 'demo-alias',
  setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: abs('demo/mocks/next-link.tsx') }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: abs('demo/mocks/next-navigation.ts') }));
    b.onResolve({ filter: /^\.\/account$/ }, args => (args.importer.includes('/app/dashboard/settings/') ? { path: abs('demo/mocks/account.ts') } : undefined));
    b.onResolve({ filter: /^\.\/security$/ }, args => (args.importer.includes('/app/dashboard/settings/') ? { path: abs('demo/mocks/security.ts') } : undefined));
    b.onResolve({ filter: /actions$/ }, args => {
      if (args.path === '@/app/login/actions') return { path: abs('demo/mocks/login-actions.ts') };
      if (args.path === '../actions' && args.importer.includes('/app/dashboard/')) return { path: abs('demo/mocks/actions.ts') };
      if (args.path === './actions' && args.importer.includes('/app/dashboard/admin/')) return { path: abs('demo/mocks/admin-actions.ts') };
      if (args.path === './actions' && args.importer.includes('/app/dashboard/community/')) return { path: abs('demo/mocks/community-actions.ts') };
      return undefined;
    });
  },
};

const result = await build({
  entryPoints: [abs('demo/entry.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  jsx: 'automatic',
  write: false,
  tsconfig: abs('tsconfig.json'),
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
  plugins: [alias],
  logLevel: 'warning',
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(abs('app/globals.css'), 'utf8');
const extra = `
.demo-badge { position: fixed; z-index: 150; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 14px; border-radius: 999px; background: rgba(20,20,22,.9); border: 1px solid var(--line-2); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); font-size: 12.5px; color: var(--muted); box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.demo-badge button { border: 0; border-radius: 999px; padding: 6px 11px; background: #fff; color: #000; font-weight: 600; font-size: 12px; cursor: pointer; }
`;

const html = `<title>Pulse Vorschau</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<style>${css}${extra}</style>
<div id="root"></div>
<script>${js}</script>
`;

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
