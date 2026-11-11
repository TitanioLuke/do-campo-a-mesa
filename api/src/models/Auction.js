const mongoose = require('mongoose');

/**
 * Coleção `auctions`.
 * `licitacaoAtual` é EMBEBIDO porque é um único valor lido sempre com o leilão.
 * O histórico de licitações fica na coleção `bids` (linking): cresce sem limite.
 *
 * Um leilão passa por três estados:
 *   agendado  -> criado, mas ainda não abriu. Ninguém pode licitar.
 *   ativo     -> entre `comecaEm` e `terminaEm`. É a janela das licitações.
 *   terminado -> passou de `terminaEm`. Quem tiver a licitação mais alta ganha.
 * As passagens de um estado para o outro são feitas pelo servidor (ver
 * `sockets/leiloes.js`), nunca pelo cliente.
 */
const auctionSchema = new mongoose.Schema(
  {
    produtor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lote: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    imagem: { type: String, default: '' },
    precoBase: { type: Number, required: true, min: 0 },
    incremento: { type: Number, required: true, min: 1, default: 5 },
    licitacaoAtual: {
      valor: { type: Number, required: true },
      comprador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      nome: { type: String, default: '' }, // cópia do nome, para mostrar na sala
    },
    comecaEm: { type: Date, required: true },
    terminaEm: { type: Date, required: true },
    estado: {
      type: String,
      enum: ['agendado', 'ativo', 'terminado'],
      default: 'agendado',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
