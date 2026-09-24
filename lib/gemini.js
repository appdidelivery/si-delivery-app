const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mantém a interface do fetch, mas adiciona retry e fallback para chamadas Gemini.
 * Nunca registra a URL completa, pois ela contém a chave da API.
 */
export async function fetchGeminiWithRetry(url, init, options = {}) {
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(/\/models\/([^/:]+):generateContent$/);
  if (!match) return fetch(url, init);

  const requestedModel = match[1];
  const models = [...new Set([requestedModel, ...(options.models || FALLBACK_MODELS)])];
  const attemptsPerModel = options.attemptsPerModel || 2;
  let lastResponse;

  for (const model of models) {
    parsedUrl.pathname = parsedUrl.pathname.replace(
      /\/models\/[^/:]+:generateContent$/,
      `/models/${model}:generateContent`,
    );

    for (let attempt = 0; attempt < attemptsPerModel; attempt += 1) {
      try {
        const response = await fetch(parsedUrl, init);
        lastResponse = response;
        // Modelo indisponível: tenta o próximo sem repetir o mesmo 404.
        if (response.status === 404) break;
        if (response.ok || !RETRYABLE_STATUS.has(response.status)) return response;

        console.warn('[Gemini] Falha transitória', {
          status: response.status,
          model,
          attempt: attempt + 1,
        });
      } catch (error) {
        console.warn('[Gemini] Falha de rede', {
          model,
          attempt: attempt + 1,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        if (attempt === attemptsPerModel - 1 && model === models.at(-1)) throw error;
      }

      await wait(500 * (2 ** attempt) + Math.floor(Math.random() * 250));
    }
  }

  return lastResponse;
}
