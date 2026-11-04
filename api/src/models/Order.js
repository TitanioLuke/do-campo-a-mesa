const mongoose = require('mongoose');

/**
 * Coleção `orders`.
 * As LINHAS são EMBEBIDAS (embedding): são poucas, só fazem sentido dentro da
 * encomenda e são sempre lidas com ela. Guardam uma cópia do nome e do preço
 * para a encomenda não mudar se o produtor alterar o produto mais tarde.
 * Comprador e produtor são REFERENCIADOS.
 */
const orderSchema = new mongoose.Schema(
  {
    comprador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    produtor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    linhas: [
      {
        produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        nome: { type: String, required: true },      // cópia no momento da compra
        precoUnit: { type: Number, required: true },  // cópia no momento da compra
        quantidade: { type: Number, required: true, min: 1 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: ['pendente', 'confirmada', 'pronta', 'entregue'],
      default: 'pendente',
    },
    entrega: {
      tipo: { type: String, enum: ['levantamento', 'entrega'], default: 'levantamento' },
      morada: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
