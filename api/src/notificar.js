const Notification = require('./models/Notification');

/** Formata um valor em euros, como o cliente faz: 2.2 -> "2,20 €". */
const euros = (valor) =>
  Number(valor || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

/**
 * Notifica um utilizador: **grava primeiro, emite depois**.
 *
 * A ordem não é indiferente. Gravando primeiro, a notificação existe mesmo que
 * ninguém esteja ligado para a receber — e é isso que faz o produtor encontrar
 * a venda quando abrir a aplicação, em vez de a ter perdido por não estar a
 * olhar. O `emit` é só a entrega imediata a quem por acaso está presente.
 *
 * Os textos ficam todos aqui, do lado do servidor, e não espalhados pelo
 * cliente: é a mesma frase que vai para a base de dados e para o ecrã.
 *
 * @param io            instância do Socket.io (`req.app.get('io')`)
 * @param utilizador    id de quem recebe
 * @param texto         a frase a mostrar
 * @param para          caminho da página que a resolve
 * @param tipo          'sucesso' | 'info' | 'erro' (cor do aviso)
 */
async function notificar(io, utilizador, { texto, para = '/', tipo = 'info' }) {
  const notificacao = await Notification.create({ utilizador, texto, para, tipo });

  io.to(`user:${utilizador}`).emit('notificacao', {
    _id: notificacao._id,
    texto: notificacao.texto,
    para: notificacao.para,
    tipo: notificacao.tipo,
    lida: false,
    createdAt: notificacao.createdAt,
  });

  return notificacao;
}

module.exports = notificar;
module.exports.euros = euros;
