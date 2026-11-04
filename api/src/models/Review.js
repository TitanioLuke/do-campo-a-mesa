const mongoose = require('mongoose');

/**
 * Coleção `reviews` — avaliações.
 * Coleção própria (linking) porque crescem sem limite e são moderadas pelo
 * administrador de forma independente do produto.
 *
 * A mesma coleção guarda os dois tipos de avaliação que o comprador pode fazer:
 *   - com `produto` preenchido  -> avaliação a um produto
 *   - com `produto` a null      -> avaliação ao produtor (atendimento, entrega)
 * O campo `produtor` está sempre preenchido, por isso a página do produtor
 * mostra as duas com uma única pesquisa.
 */
const reviewSchema = new mongoose.Schema(
  {
    produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    produtor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    comprador: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, required: true }, // cópia do nome do comprador
    nota: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, trim: true, maxlength: 500 },
    denunciada: { type: Boolean, default: false },
    oculta: { type: Boolean, default: false }, // escondida pelo administrador
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
