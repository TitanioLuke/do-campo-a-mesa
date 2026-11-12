const mongoose = require('mongoose');

/**
 * Coleção `users` — guarda os 3 papéis da aplicação (comprador, produtor, admin).
 * Opção de modelação: um único documento por utilizador, com os campos de
 * produtor opcionais. Evita uma coleção extra e uma junção em cada pedido.
 */
const userSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    papel: {
      type: String,
      required: true,
      enum: ['comprador', 'produtor', 'admin'],
      default: 'comprador',
    },

    // --- Contactos (os dois papéis) ---
    // O produtor mostra o telefone na sua página pública; o comprador guarda a
    // morada no registo para não a ter de escrever em cada encomenda.
    telefone: { type: String, trim: true },
    morada: { type: String, trim: true },

    // --- Campos usados apenas quando papel === 'produtor' ---
    localidade: { type: String, trim: true },
    descricao: { type: String, trim: true },
    // Coordenadas para o mapa da página pública do produtor
    latitude: { type: Number },
    longitude: { type: Number },
    // O administrador tem de validar o registo antes do produtor poder vender
    aprovado: { type: String, enum: ['pendente', 'aprovado', 'rejeitado'], default: 'aprovado' },
  },
  { timestamps: true }
);

// Nunca devolver o hash da password nas respostas da API
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
