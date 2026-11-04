const mongoose = require('mongoose');

/**
 * Coleção `products`.
 * O produtor é REFERENCIADO (linking): os dados do produtor mudam
 * (localidade, descrição) e são partilhados por muitos produtos.
 */
const productSchema = new mongoose.Schema(
  {
    produtor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    categoria: {
      type: String,
      required: true,
      enum: ['Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Outros'],
    },
    preco: { type: Number, required: true, min: 0 },
    unidade: { type: String, default: 'kg', enum: ['kg', 'un', 'L', 'dz', 'cx'] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    biologico: { type: Boolean, default: false },
    epoca: {
      type: String,
      enum: ['Primavera', 'Verão', 'Outono', 'Inverno', 'Todo o ano'],
      default: 'Todo o ano',
    },
    imagem: { type: String, default: '' },
    // Média das avaliações, recalculada quando é criada uma avaliação.
    // Guardada aqui (desnormalização) para não ter de somar avaliações em cada listagem.
    notaMedia: { type: Number, default: 0 },
    numAvaliacoes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
