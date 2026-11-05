const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const autenticar = require('../middleware/auth');

const router = express.Router();

/** GET /api/producers — lista pública de produtores aprovados. */
router.get('/', async (req, res) => {
  const { q, localidade } = req.query;
  const filtro = { papel: 'produtor', aprovado: 'aprovado' };
  if (q) filtro.nome = { $regex: q, $options: 'i' };
  if (localidade) filtro.localidade = localidade; // exata: vem da lista de concelhos

  const produtores = await User.find(filtro).sort({ nome: 1 });
  res.json(produtores);
});

/**
 * GET /api/producers/me/estatisticas — indicadores do painel do produtor.
 * Tem de vir antes de /:id para não ser apanhada como um id.
 */
router.get('/me/estatisticas', autenticar('produtor'), async (req, res) => {
  const encomendas = await Order.find({ produtor: req.user.id });
  const entregues = encomendas.filter((e) => e.estado === 'entregue');

  const avaliacoes = await Review.find({ produtor: req.user.id, oculta: false });
  const notaMedia = avaliacoes.length
    ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length
    : 0;

  // Alertas de stock baixo: produtos com menos de 5 unidades ($lt)
  const stockBaixo = await Product.find({ produtor: req.user.id, stock: { $lt: 5 } }).select('nome stock unidade');

  res.json({
    totalProdutos: await Product.countDocuments({ produtor: req.user.id }),
    totalEncomendas: encomendas.length,
    encomendasPendentes: encomendas.filter((e) => e.estado === 'pendente').length,
    vendasTotais: entregues.reduce((soma, e) => soma + e.total, 0),
    notaMedia: Number(notaMedia.toFixed(1)),
    numAvaliacoes: avaliacoes.length,
    stockBaixo,
  });
});

/** GET /api/producers/:id — página pública do produtor (dados + produtos + avaliações). */
router.get('/:id', async (req, res) => {
  const produtor = await User.findOne({ _id: req.params.id, papel: 'produtor' });
  if (!produtor) return res.status(404).json({ erro: 'Produtor não encontrado' });

  const [produtos, avaliacoes] = await Promise.all([
    Product.find({ produtor: produtor._id }).sort({ createdAt: -1 }),
    Review.find({ produtor: produtor._id, oculta: false })
      .populate('produto', 'nome')  // para distinguir avaliações ao produto das avaliações ao produtor
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  res.json({ produtor, produtos, avaliacoes });
});

module.exports = router;
