/**
 * Ejecuta todas las pruebas del navegador y deja la evidencia en
 * ../docs/evidencias: E2E Screenplay (reporte Cucumber JSON + capturas),
 * Katalon (registro por comando + capturas), accesibilidad e interfaz.
 *
 * Uso: npm run evidencias
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..', '..', 'docs', 'evidencias');
for (const carpeta of ['e2e-screenplay', 'katalon', 'interfaz', path.join('accesibilidad', 'despues')]) {
  fs.rmSync(path.join(raiz, carpeta), { recursive: true, force: true });
}
fs.mkdirSync(path.join(raiz, 'e2e-screenplay'), { recursive: true });

const pasos = [
  ['npm', ['run', 'build:front']],
  ['npx', ['cucumber-js', '--format', `json:${path.join(raiz, 'e2e-screenplay', 'cucumber.json')}`]],
  ['npx', ['ts-node', 'katalon/validar-suite.ts']],
  ['npx', ['ts-node', 'calidad/accesibilidad.ts', 'despues']],
  ['npx', ['ts-node', 'calidad/interfaz.ts']],
];

let fallos = 0;
for (const [cmd, args] of pasos) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, E2E_EVIDENCIA: 'true' },
  });
  if (r.status !== 0) fallos++;
}
process.exit(fallos ? 1 : 0);
