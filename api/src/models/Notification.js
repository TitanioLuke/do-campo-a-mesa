const mongoose = require('mongoose');

/**
 * Coleção `notifications`.
 *
 * Antes, uma notificação era só um evento do WebSocket: nascia no servidor,
 * era atirada à sala pessoal e guardada no `localStorage` de quem a recebia.
 * Isso tinha duas consequências más — quem não tivesse a aplicação aberta
 * perdia-a para sempre, e quem a tivesse ficava com ela presa àquele browser.
 *
 * Passando a existir aqui, a notificação é um recurso como outro qualquer: o
 * servidor grava-a e só depois a emite. Quem está ligado vê-a na hora; quem
 * não está vê-a mal inicie sessão, em qualquer computador.
 */
const notificationSchema = new mongoose.Schema(
  {
    utilizador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    texto: { type: String, required: true },
    // Caminho da página que resolve a notificação: a encomenda, a sala do
    // leilão, as avaliações. É o que faz a linha do sininho ser clicável.
    para: { type: String, default: '/' },
    tipo: { type: String, enum: ['sucesso', 'info', 'erro'], default: 'info' },
    lida: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A lista é o que ainda interessa ver, não um arquivo: ao fim de 30 dias o
// próprio MongoDB apaga os documentos, sem ninguém ter de o fazer.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Notification', notificationSchema);
