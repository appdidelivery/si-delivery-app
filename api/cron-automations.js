import mainHandler from './index.js';
import { runPre30Journey } from './journey-cron.js';

// Wrapper do cron já existente. A Vercel já chama /api/cron-automations diariamente.
// A jornada pré-30 roda primeiro para marcar os registros e evitar duplicidade com os motores legados.
export default async function handler(req, res) {
  try {
    await runPre30Journey();
  } catch (error) {
    console.error('[Cron Wrapper] Jornada pré-30 falhou, seguindo com rotinas legadas:', error?.message || error);
  }

  return mainHandler(req, res);
}
