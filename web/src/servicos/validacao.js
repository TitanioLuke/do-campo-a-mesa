// Auxiliares de validação dos formulários.
//
// Os formulários levam `noValidate`: a validação do browser fica desligada,
// porque a mensagem dele é uma caixa cinzenta e aparece no idioma do browser
// ("Please fill out this field") mesmo numa aplicação em português. As
// mensagens passam a ser escritas por nós, por baixo do campo errado.
//
// Estas duas funções ficam aqui para a mesma regra não ser escrita de maneiras
// diferentes em cada página.

/** O campo está vazio ou só tem espaços? */
export const vazio = (valor) => String(valor ?? '').trim() === '';

/**
 * Tem a forma de um email? Só verifica que há alguma coisa, um @, alguma
 * coisa, um ponto e mais alguma coisa — chega para apanhar um engano de
 * escrita. Se o endereço existe mesmo, só se sabe ao enviar-lhe uma mensagem.
 */
export const emailValido = (valor) => /\S+@\S+\.\S+/.test(String(valor).trim());
