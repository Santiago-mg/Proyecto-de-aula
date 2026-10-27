// Puertos del modo simulado. Compartidos entre el build del frontend
// (scripts/build-front.js) y el arranque de los servidores (support/config.ts).
const PUERTO_API = Number(process.env.E2E_API_PORT ?? 3101);
const PUERTO_FRONT = Number(process.env.E2E_FRONT_PORT ?? 4174);

module.exports = {
  PUERTO_API,
  PUERTO_FRONT,
  API_URL_SIMULADA: `http://localhost:${PUERTO_API}/api/v1`,
  FRONT_URL_SIMULADO: `http://localhost:${PUERTO_FRONT}`,
};
