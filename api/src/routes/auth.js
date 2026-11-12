const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const autenticar = require('../middleware/auth');

const router = express.Router();

/**
 * Limite de tentativas nas rotas de autenticação.
 *
 * Sem isto, nada impede alguém de experimentar passwords a um ritmo de
 * milhares por minuto contra um email conhecido. O bcrypt torna cada tentativa
 * lenta, mas é o atacante que escolhe quantas faz — este limite é que decide.
 * Vale por IP e por janela de 15 minutos.
 *
 * `skipSuccessfulRequests` faz com que só as tentativas FALHADAS contem. Quem
 * sabe a password pode entrar as vezes que quiser; quem a anda a adivinhar
 * esgota as dez e fica à espera.
 */
const limiteTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Demasiadas tentativas. Tente de novo dentro de 15 minutos.' },
});

/** Gera o JWT que o cliente guarda e envia em cada pedido. */
function gerarToken(utilizador) {
  return jwt.sign(
    { id: utilizador._id, papel: utilizador.papel, nome: utilizador.nome },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRA || '8h' }
  );
}

/**
 * POST /api/auth/registo — cria uma conta de comprador ou de produtor.
 * O produtor fica "pendente" até o administrador validar o registo.
 */
router.post('/registo', limiteTentativas, async (req, res) => {
  const { nome, email, password, papel, localidade, descricao, telefone, morada, latitude, longitude } =
    req.body;

  if (!nome || !email || !password) {
    return res.status(400).json({ erro: 'Nome, email e password são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ erro: 'A password tem de ter pelo menos 6 caracteres' });
  }
  if (papel && !['comprador', 'produtor'].includes(papel)) {
    return res.status(400).json({ erro: 'Papel inválido' });
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(400).json({ erro: 'Já existe uma conta com este email' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const utilizador = await User.create({
    nome,
    email,
    passwordHash,
    papel: papel || 'comprador',
    localidade,
    descricao,
    telefone,
    morada,
    latitude,
    longitude,
    // só o produtor precisa de validação do administrador
    aprovado: papel === 'produtor' ? 'pendente' : 'aprovado',
  });

  res
    .status(201)
    .location(`/api/users/${utilizador._id}`)
    .json({ utilizador, token: gerarToken(utilizador) });
});

/** POST /api/auth/login — devolve o token JWT. */
router.post('/login', limiteTentativas, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ erro: 'Email e password são obrigatórios' });

  const utilizador = await User.findOne({ email: email.toLowerCase() });
  if (!utilizador || !(await bcrypt.compare(password, utilizador.passwordHash))) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  res.json({ utilizador, token: gerarToken(utilizador) });
});

/** GET /api/auth/me — dados do utilizador com sessão iniciada. */
router.get('/me', autenticar(), async (req, res) => {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador) return res.status(404).json({ erro: 'Utilizador não encontrado' });
  res.json(utilizador);
});

/** PUT /api/auth/me — o utilizador atualiza o seu próprio perfil. */
router.put('/me', autenticar(), async (req, res) => {
  const camposPermitidos = ['nome', 'localidade', 'descricao', 'telefone', 'morada', 'latitude', 'longitude'];
  const alteracoes = {};
  for (const campo of camposPermitidos) {
    if (req.body[campo] !== undefined) alteracoes[campo] = req.body[campo];
  }

  const utilizador = await User.findByIdAndUpdate(req.user.id, alteracoes, {
    new: true,
    runValidators: true,
  });
  if (!utilizador) return res.status(404).json({ erro: 'Utilizador não encontrado' });
  res.json(utilizador);
});

module.exports = router;
