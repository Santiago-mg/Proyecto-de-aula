/**
 * Compila el frontend apuntando a la API que usarán las pruebas.
 *
 * Modo simulado (por defecto): VITE_API_URL = API simulada de support/.
 * Modo real (E2E_FRONT_URL definido): no compila nada, las pruebas usan el
 * frontend que ya esté corriendo contra el backend real.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { API_URL_SIMULADA } = require('./puertos');

if (process.env.E2E_FRONT_URL) {
  console.log(`Modo real: se usará ${process.env.E2E_FRONT_URL}, no se compila el frontend.`);
  process.exit(0);
}

const raizFront = path.resolve(__dirname, '..', '..');
const resultado = spawnSync(
  'npx',
  ['vite', 'build', '--outDir', path.join('e2e', '.front-dist'), '--emptyOutDir'],
  {
    cwd: raizFront,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_API_URL: API_URL_SIMULADA },
  },
);

process.exit(resultado.status ?? 1);
