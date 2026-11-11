const express = require('express');
const mongoose = require('mongoose');
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
  const produtor = new mongoose.Types.ObjectId(req.user.id);

  // Uma única passagem pelas encomendas deste produtor: conta todas, conta as
  // pendentes e soma as entregues, com $cond a escolher o que entra em cada conta.
  const [encomendas] = await Order.aggregate([
    { $match: { produtor } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pendentes: { $sum: { $cond: [{ $eq: ['$estado', 'pendente'] }, 1, 0] } },
        vendas: { $sum: { $cond: [{ $eq: ['$estado', 'entregue'] }, '$total', 0] } },
      },
    },
  ]);

  // A média das avaliações é feita pelo MongoDB com $avg
  const [avaliacoes] = await Review.aggregate([
    { $match: { produtor, oculta: false } },
    { $group: { _id: null, quantas: { $sum: 1 }, media: { $avg: '$nota' } } },
  ]);

  // Alertas de stock baixo: produtos com menos de 5 unidades ($lt)
  const stockBaixo = await Product.find({ produtor, stock: { $lt: 5 } }).select('nome stock unidade');

  res.json({
    totalProdutos: await Product.countDocuments({ produtor }),
    totalEncomendas: encomendas?.total ?? 0,
    encomendasPendentes: encomendas?.pendentes ?? 0,
    vendasTotais: Number((encomendas?.vendas ?? 0).toFixed(2)),
    notaMedia: avaliacoes ? Number(avaliacoes.media.toFixed(1)) : 0,
    numAvaliacoes: avaliacoes?.quantas ?? 0,
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
