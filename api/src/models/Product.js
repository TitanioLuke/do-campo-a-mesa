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

/**
 * Índice composto para a consulta mais usada da aplicação: o catálogo filtrado
 * por categoria e por preço.
 *
 * A ordem dos campos não é arbitrária — segue a regra ESR: primeiro o campo
 * comparado por IGUALDADE (`categoria`), depois o usado em INTERVALO e para
 * ORDENAR (`preco`). Com esta ordem, o MongoDB percorre só o troço do índice
 * que interessa; ao contrário, teria de ler o índice todo.
 *
 * Os índices de chave estrangeira (`produtor`) estão declarados campo a campo.
 */
productSchema.index({ categoria: 1, preco: 1 });

module.exports = mongoose.model('Product', productSchema);
