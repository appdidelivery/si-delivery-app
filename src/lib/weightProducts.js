// Utilitários de unidades para produtos de mercado. Estoque e quantidade em kg;
// o formulário recebe gramas inteiros para evitar erros de ponto flutuante.
export const isWeightedProduct = (product) => product?.saleUnit === 'kg';

export const getWeightStepGrams = (product) => {
  const step = Number(product?.weightStepGrams);
  return Number.isInteger(step) && step > 0 && step <= 1000 ? step : 100;
};

export const getMinWeightGrams = (product) => {
  const min = Number(product?.minWeightGrams);
  return Number.isInteger(min) && min > 0 ? min : getWeightStepGrams(product);
};

export const quantityKgFromGrams = (grams) => Math.round(Number(grams)) / 1000;

export const gramsFromInput = (value, unit = 'g') => {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return NaN;
  const grams = unit === 'kg' ? parsed * 1000 : parsed;
  return Number.isInteger(Math.round(grams)) && Math.abs(grams - Math.round(grams)) < 1e-6
    ? Math.round(grams) : NaN;
};

export const validateWeight = (product, grams, existingQuantityKg = 0) => {
  if (!isWeightedProduct(product)) return 'Produto não configurado para venda por peso.';
  if (!Number.isInteger(grams) || grams <= 0) return 'Informe um peso válido em gramas ou quilogramas.';
  const step = getWeightStepGrams(product);
  const min = getMinWeightGrams(product);
  if (grams < min) return `Peso mínimo: ${formatWeight(min / 1000)}.`;
  if (grams % step !== 0) return `Escolha múltiplos de ${step} g.`;
  const stock = product.stock;
  if (stock !== undefined && stock !== null && stock !== '' &&
      (quantityKgFromGrams(grams) + Number(existingQuantityKg) > Number(stock) + 1e-9)) {
    return `Estoque disponível: ${formatWeight(Number(stock))}.`;
  }
  return null;
};

export const formatWeight = (kg) => {
  const roundedGrams = Math.round(Number(kg) * 1000);
  if (!Number.isFinite(roundedGrams)) return '0 g';
  return roundedGrams < 1000 ? `${roundedGrams} g` :
    `${(roundedGrams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`;
};

export const formatCartQuantity = (product) => isWeightedProduct(product)
  ? formatWeight(product.quantity) : `${product.quantity} un.`;

export const totalWeightPrice = (pricePerKg, grams) =>
  Math.round(Number(pricePerKg) * Number(grams) / 10) / 100;
