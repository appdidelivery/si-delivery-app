// Importacao/exportacao CSV do catalogo. Nao depende de Excel ou de bibliotecas externas.
const normalizeHeader = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

export function parseDelimitedCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = raw.split(/\r?\n/, 1)[0] || '';
  const candidates = [';', '\t', ','];
  const delimiter = candidates.map(character => ({
    character,
    count: firstLine.split(character).length - 1
  })).sort((a, b) => b.count - a.count)[0].character;

  const result = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      if (quoted && raw[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && raw[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(cell => String(cell).trim() !== '')) result.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV com aspas nao fechadas.');
  row.push(field);
  if (row.some(cell => String(cell).trim() !== '')) result.push(row);
  return result;
}

const columnAliases = {
  code: ['codigo', 'sku', 'linvixcode', 'codigoproduto', 'coderp'],
  name: ['descricao', 'nome', 'nomedoproduto', 'produto'],
  category: ['grupo', 'categoria'],
  costPrice: ['precocusto', 'custounitario', 'custo'],
  price: ['precovenda', 'precodevenda', 'preco', 'valor'],
  unit: ['unidade', 'saleunit', 'unidadedevenda'],
  stock: ['estoque', 'estoqueatual'],
  idVelo: ['idvelo'],
  active: ['ativo', 'status']
};

function parsePrice(value) {
  if (isBlank(value)) return NaN;
  let source = String(value).trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (source.includes(',') && source.includes('.')) {
    source = source.lastIndexOf(',') > source.lastIndexOf('.')
      ? source.replace(/\./g, '').replace(',', '.')
      : source.replace(/,/g, '');
  } else if (source.includes(',')) {
    source = source.replace(',', '.');
  }
  const number = Number(source);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
}

function inferSaleUnit(unit, name, category) {
  const explicit = String(unit || '').trim().toLowerCase();
  if (['kg', 'quilo', 'quilos', 'kilograma', 'quilograma'].includes(explicit)) return 'kg';
  if (['un', 'unidade', 'unidades', 'und'].includes(explicit)) return 'un';
  const upper = String(name).toUpperCase();
  if (/(^|\s)KG(\s|$)|(^|\s)QUILO(\s|$)/.test(upper)) return 'kg';
  if (String(category).toUpperCase() === 'ACOUGUE' &&
      !/(^|\s)(UN|PCT|PACOTE|BANDEJA|BDJ)(\s|$)/.test(upper)) return 'kg';
  return 'un';
}

export function parseProductCatalogCsv(text) {
  const matrix = parseDelimitedCsv(text);
  if (matrix.length < 2) throw new Error('A planilha nao possui produtos.');
  const header = matrix[0].map(normalizeHeader);
  const indices = Object.fromEntries(Object.entries(columnAliases).map(([key, aliases]) => [
    key, header.findIndex(item => aliases.includes(item))
  ]));
  if (indices.code < 0 || indices.name < 0 || indices.price < 0) {
    throw new Error('Colunas obrigatorias: codigo, descricao e preco_venda.');
  }

  const rows = [];
  const errors = [];
  const codes = new Set();
  let uncategorizedCount = 0;
  let duplicateCount = 0;
  const read = (line, column) => indices[column] < 0 ? '' : String(line[indices[column]] ?? '').trim();

  matrix.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const code = read(line, 'code');
    const name = read(line, 'name');
    const price = parsePrice(read(line, 'price'));
    const rawCost = read(line, 'costPrice');
    const costPrice = isBlank(rawCost) ? null : parsePrice(rawCost);
    if (!code || !name || !Number.isFinite(price) || price <= 0 ||
        (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0))) {
      if (errors.length < 40) errors.push('Linha ' + lineNumber + ': codigo, descricao ou preco invalido.');
      return;
    }
    if (codes.has(code)) { duplicateCount++; return; }
    codes.add(code);
    const rawCategory = read(line, 'category');
    const category = rawCategory || 'A CLASSIFICAR';
    if (!rawCategory) uncategorizedCount++;
    const rawStock = read(line, 'stock');
    const stock = isBlank(rawStock) || /^ilimitado$/i.test(rawStock)
      ? null : Number(rawStock.replace(',', '.'));
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
      if (errors.length < 40) errors.push('Linha ' + lineNumber + ': estoque invalido.');
      return;
    }
    const active = read(line, 'active');
    rows.push({
      code, name, category, price, costPrice,
      saleUnit: inferSaleUnit(read(line, 'unit'), name, category),
      stock, idVelo: read(line, 'idVelo'),
      active: /^(sim|true|1|ativo)$/i.test(active) ? true :
        /^(nao|não|false|0|inativo)$/i.test(active) ? false : null
    });
  });
  if (!rows.length) throw new Error('Nenhum produto valido encontrado.');
  return { rows, errors, uncategorizedCount, duplicateCount };
}

const csvCell = (value) => {
  const content = value === null || value === undefined ? '' : String(value);
  return '"' + content.replace(/"/g, '""') + '"';
};

export function exportProductCatalogCsv(products) {
  const headers = ['id_velo', 'codigo', 'descricao', 'grupo', 'preco_custo',
    'preco_venda', 'unidade', 'estoque', 'ativo'];
  const data = (products || []).map(product => [
    product.id || '',
    product.sku || product.linvixCode || product.gtin || product.id || '',
    product.name || '',
    product.category || '',
    product.costPrice ?? '',
    product.price ?? '',
    product.saleUnit || 'un',
    product.stock === undefined || product.stock === null ? '' : product.stock,
    product.isActive === false ? 'nao' : 'sim'
  ].map(csvCell).join(';'));
  return '\uFEFF' + [headers.map(csvCell).join(';'), ...data].join('\r\n');
}
