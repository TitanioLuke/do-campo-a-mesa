/**
 * Origens autorizadas a chamar a API (CORS).
 *
 * Em desenvolvimento a variável não está definida e fica `*`: qualquer origem
 * pode chamar a API, que é o cómodo quando se trabalha em localhost.
 * Em produção define-se CORS_ORIGIN com o endereço da SPA publicada, para
 * só ela poder usar a API. Aceita vários endereços separados por vírgula.
 */
module.exports = function origensPermitidas() {
  const valor = process.env.CORS_ORIGIN;
  if (!valor || valor === '*') return '*';
  return valor.split(',').map((origem) => origem.trim());
};
