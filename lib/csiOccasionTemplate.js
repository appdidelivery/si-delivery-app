// Variáveis reutilizáveis para o modelo Meta velo_momentos_bebidas.
// Uma ocasião por disparo: futebol, encontro, churrasco, fim de semana.
export const CSI_OCCASIONS = Object.freeze({
  wed: 'Um bom jogo de futebol',
  fri: 'O início do fim de semana',
  sat: 'Um encontro com os amigos',
  sun: 'Um churrasco de domingo',
  football: 'Um bom jogo de futebol',
});

export function occasionPhrase(occasion) {
  return CSI_OCCASIONS[occasion] || null;
}

// O modelo possui EXATAMENTE uma variável no corpo, {{1}}.
// A Meta exige que a estrutura corresponda ao template previamente aprovado.
export function occasionTemplateComponents(occasion) {
  const phrase = occasionPhrase(occasion);
  if (!phrase) return null;
  return [{ type: 'body', parameters: [{ type: 'text', text: phrase }] }];
}

export function canUseGenericOccasionTemplate(cfg = {}) {
  return cfg.occasionTemplateApproved === true &&
    cfg.marketingPolicyReviewed === true &&
    cfg.occasionTemplateBodyVariableCount === 1 &&
    /^[a-z0-9_]{4,100}$/.test(String(cfg.occasionTemplateName || ''));
}
