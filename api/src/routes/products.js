const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const autenticar = require('../middleware/auth');
const produtorAprovado = require('../middleware/produtorAprovado');
const { normalizar, escaparRegex } = require('../texto');

const router = express.Router();

/**
 * GET /api/products — catálogo público com pesquisa e filtros.
 * Query: q, categoria, precoMin, precoMax, bio, epoca, produtor, localidade
 * Usa $regex (pesquisa por texto) e $gte/$lte (intervalo de preços).
 */
router.get('/', async (req, res) => {
  const { q, categoria, precoMin, precoMax, bio, epoca, produtor, localidade, ordenar } = req.query;
  const filtro = {};

  // Pesquisa sobre o campo `procura`, que já está em minúsculas e sem acentos.
  // O termo é normalizado da mesma maneira e escapado, porque o que o
  // utilizador escreve é texto e não um padrão de expressão regular.
  if (q) {
    filtro.procura = { $regex: escaparRegex(normalizar(q)) };
  }
  if (categoria && categoria !== 'Todas') filtro.categoria = categoria;
  if (epoca && epoca !== 'Todas') filtro.epoca = epoca;
  if (bio === 'true') filtro.biologico = true;

  // Intervalo de preços com $gte / $lte
  if (precoMin || precoMax) {
    filtro.preco = {};
    if (precoMin) filtro.preco.$gte = Number(precoMin);
    if (precoMax) filtro.preco.$lte = Number(precoMax);
  }

  if (produtor) {
    filtro.produtor = produtor;
  } else {
    // Só aparecem no catálogo produtos de produtores aprovados pelo administrador
    const filtroProdutor = { papel: 'produtor', aprovado: 'aprovado' };
    // Correspondência exata: os nomes vêm da mesma lista de concelhos no cliente.
    // Com $regex, "Porto" apanharia "Porto de Mós" e "Braga" apanharia "Bragança".
    if (localidade) filtroProdutor.localidade = localidade;
    const aprovados = await User.find(filtroProdutor).select('_id');
    filtro.produtor = { $in: aprovados.map((p) => p._id) };
  }

  const ordens = { recentes: { createdAt: -1 }, precoAsc: { preco: 1 }, precoDesc: { preco: -1 } };

  const produtos = await Product.find(filtro)
    .populate('produtor', 'nome localidade')
    .sort(ordens[ordenar] || { createdAt: -1 });

  res.json(produtos); // 200 OK
});

/** GET /api/products/:id — detalhe de um produto. */
router.get('/:id', async (req, res) => {
  const produto = await Product.findById(req.params.id).populate(
    'produtor',
    'nome localidade descricao latitude longitude'
  );
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

/** GET /api/products/:id/reviews — avaliações visíveis de um produto. */
router.get('/:id/reviews', async (req, res) => {
  const avaliacoes = await Review.find({ produto: req.params.id, oculta: false }).sort({ createdAt: -1 });
  res.json(avaliacoes);
});

/** POST /api/products — o produtor cria um produto. 201 + cabeçalho Location. */
router.post('/', autenticar('produtor'), produtorAprovado, async (req, res) => {
  const { nome, categoria, preco } = req.body;
  if (!nome || !categoria || preco === undefined) {
    return res.status(400).json({ erro: 'Nome, categoria e preço são obrigatórios' });
  }

  const produto = await Product.create({ ...req.body, produtor: req.user.id });
  res.status(201).location(`/api/products/${produto._id}`).json(produto); // 201 Created
});

/**
 * PUT /api/products/:id — só o dono do produto pode alterar.
 *
 * Lê, altera e grava, em vez de um `findOneAndUpdate` direto: o `save()`
 * dispara o hook do schema que recalcula o campo `procura`, que depende do
 * nome e da descrição. Com uma atualização direta esse campo ficaria preso ao
 * valor antigo e a pesquisa deixava de encontrar o produto pelo nome novo.
 */
router.put('/:id', autenticar('produtor'), produtorAprovado, async (req, res) => {
  const { produtor, notaMedia, numAvaliacoes, procura, ...alteracoes } = req.body;

  // o filtro garante que é o dono
  const produto = await Product.findOne({ _id: req.params.id, produtor: req.user.id });
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

  Object.assign(produto, alteracoes);
  await produto.save();
  res.json(produto);
});

/** DELETE /api/products/:id — 204 No Content. */
router.delete('/:id', autenticar('produtor', 'admin'), produtorAprovado, async (req, res) => {
  const filtro = { _id: req.params.id };
  if (req.user.papel === 'produtor') filtro.produtor = req.user.id;

  const resultado = await Product.deleteOne(filtro);
  if (!resultado.deletedCount) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.status(204).end(); // 204 No Content
});

module.exports = router;
