const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Auction = require('../models/Auction');
const Review = require('../models/Review');
const autenticar = require('../middleware/auth');
const notificar = require('../notificar');

const router = express.Router();

// Todas as rotas deste ficheiro exigem o papel 'admin'
router.use(autenticar('admin'));

/**
 * GET /api/admin/estatisticas — painel global.
 *
 * O total de encomendas e o volume de negócios saem de uma AGREGAÇÃO, não de
 * `Order.find()` seguido de um `reduce`. A diferença não se nota com dezenas de
 * encomendas, mas trazer a coleção toda para memória só para somar uma coluna
 * deixa de funcionar quando ela cresce. Assim a soma é feita pelo MongoDB e só
 * viaja o resultado.
 */
router.get('/estatisticas', async (req, res) => {
  const [encomendas] = await Order.aggregate([
    { $group: { _id: null, quantas: { $sum: 1 }, volume: { $sum: '$total' } } },
  ]);

  res.json({
    compradores: await User.countDocuments({ papel: 'comprador' }),
    produtores: await User.countDocuments({ papel: 'produtor', aprovado: 'aprovado' }),
    produtoresPendentes: await User.countDocuments({ papel: 'produtor', aprovado: 'pendente' }),
    produtos: await Product.countDocuments(),
    encomendas: encomendas?.quantas ?? 0,
    volumeNegocios: Number((encomendas?.volume ?? 0).toFixed(2)),
    leiloesAtivos: await Auction.countDocuments({ estado: 'ativo' }),
    avaliacoesDenunciadas: await Review.countDocuments({ denunciada: true, oculta: false }),
  });
});

/** GET /api/admin/produtores?aprovado=pendente — validação de registos. */
router.get('/produtores', async (req, res) => {
  const filtro = { papel: 'produtor' };
  if (req.query.aprovado) filtro.aprovado = req.query.aprovado;

  const produtores = await User.find(filtro).sort({ createdAt: -1 });
  res.json(produtores);
});

/** PATCH /api/admin/produtores/:id — aprovar ou rejeitar um produtor. */
router.patch('/produtores/:id', async (req, res) => {
  const { aprovado } = req.body;
  if (!['pendente', 'aprovado', 'rejeitado'].includes(aprovado)) {
    return res.status(400).json({ erro: 'Valor inválido' });
  }

  const produtor = await User.findOneAndUpdate(
    { _id: req.params.id, papel: 'produtor' },
    { aprovado },
    { new: true }
  );
  if (!produtor) return res.status(404).json({ erro: 'Produtor não encontrado' });

  // Avisa o produtor em tempo real na sua sala pessoal, e deixa-lhe a
  // notificação gravada — esta é a que ele mais provavelmente perderia, porque
  // ninguém fica à espera da decisão com a aplicação aberta.
  const io = req.app.get('io');
  io.to(`user:${produtor._id}`).emit('registo-validado', { aprovado });
  await notificar(io, produtor._id, {
    texto: aprovado === 'aprovado'
      ? 'O seu registo foi aprovado. Já pode publicar produtos e agendar leilões.'
      : `O administrador marcou o seu registo como "${aprovado}".`,
    para: '/produtor',
    tipo: aprovado === 'aprovado' ? 'sucesso' : 'erro',
  });
  res.json(produtor);
});

/** GET /api/admin/utilizadores — lista global. */
router.get('/utilizadores', async (req, res) => {
  const filtro = {};
  if (req.query.papel) filtro.papel = req.query.papel;
  const utilizadores = await User.find(filtro).sort({ createdAt: -1 });
  res.json(utilizadores);
});

/** GET /api/admin/encomendas — todas as encomendas da plataforma. */
router.get('/encomendas', async (req, res) => {
  const encomendas = await Order.find()
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(encomendas);
});

/** GET /api/admin/reviews?denunciadas=true — moderação de avaliações. */
router.get('/reviews', async (req, res) => {
  const filtro = {};
  if (req.query.denunciadas === 'true') filtro.denunciada = true;
  const avaliacoes = await Review.find(filtro).populate('produto', 'nome').sort({ createdAt: -1 });
  res.json(avaliacoes);
});

/** PATCH /api/admin/reviews/:id — esconder/repor uma avaliação. */
router.patch('/reviews/:id', async (req, res) => {
  const { oculta } = req.body;
  const avaliacao = await Review.findByIdAndUpdate(
    req.params.id,
    { oculta: Boolean(oculta), denunciada: false },
    { new: true }
  );
  if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });

  await require('./reviews').atualizarMedia(avaliacao.produto);
  res.json(avaliacao);
});

/** DELETE /api/admin/reviews/:id — apagar definitivamente. */
router.delete('/reviews/:id', async (req, res) => {
  const avaliacao = await Review.findByIdAndDelete(req.params.id);
  if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });

  await require('./reviews').atualizarMedia(avaliacao.produto);
  res.status(204).end();
});

module.exports = router;
