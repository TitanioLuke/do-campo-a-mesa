/**
 * Dois utilitários para a pesquisa, usados pelas rotas que aceitam texto
 * escrito pelo utilizador.
 */

/**
 * Minúsculas e sem acentos: "Maçã" -> "maca", "Abóbora" -> "abobora".
 *
 * Numa aplicação portuguesa isto não é cosmético. Metade dos nomes de produtos
 * leva acento e quase ninguém os escreve no telemóvel: sem isto, procurar
 * "maca" não encontrava "Maçã Bravo de Esmolfe".
 *
 * A decomposição NFD separa a letra do acento, e a gama ̀-ͯ apanha
 * os acentos para serem removidos.
 */
function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Escapa os caracteres que têm significado especial numa expressão regular.
 *
 * O que o utilizador escreve é TEXTO, não um padrão. Sem isto, escrever "("
 * na caixa de pesquisa produzia uma expressão regular inválida e a API
 * respondia 500; escrever ".*" devolvia o catálogo inteiro; e um padrão como
 * "a{1,99999}" podia pôr o servidor a trabalhar à toa.
 */
function escaparRegex(texto = '') {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { normalizar, escaparRegex };
