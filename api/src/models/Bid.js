const mongoose = require('mongoose');

/**
 * Coleção `bids` — histórico de licitações, uma por documento.
 * Separada do leilão (linking) porque cresce sem limite durante o leilão.
 */
const bidSchema = new mongoose.Schema(
  {
    leilao: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
    comprador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, required: true },
    valor: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
