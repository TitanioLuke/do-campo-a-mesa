const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const autenticar = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/auctions — lista de leilões.
 * Query: estado (ativo|terminado), produtor, aTerminar=true (termina na próxima hora, usa $lt)
 */
router.get('/', async (req, res) => {
  const { estado, produtor, aTerminar } = req.query;
  const filtro = {};
  if (estado) filtro.estado = estado;
  if (produtor) filtro.produtor = produtor;

  // Leilões que terminam na próxima hora ($lt sobre uma data)
  if (aTerminar === 'true') {
    filtro.estado = 'ativo';
    filtro.terminaEm = { $lt: new Date(Date.now() + 3600 * 1000) };
  }

  const leiloes = await Auction.find(filtro)
    .populate('produtor', 'nome localidade')
    .sort({ terminaEm: 1 });

  res.json(leiloes);
});

/** GET /api/auctions/:id — estado atual de um leilão. */
router.get('/:id', async (req, res) => {
  const leilao = await Auction.findById(req.params.id).populate('produtor', 'nome localidade');
  if (!leilao) return res.status(404).json({ erro: 'Leilão não encontrado' });
  res.json(leilao);
});

/** GET /api/auctions/:id/bids — histórico de licitações (as 20 mais recentes). */
router.get('/:id/bids', async (req, res) => {
  const licitacoes = await Bid.find({ leilao: req.params.id }).sort({ createdAt: -1 }).limit(20);
  res.json(licitacoes);
});

/**
 * POST /api/auctions — o produtor cria um leilão.
 * `licitacaoAtual.valor` começa no preço base: a 1.ª licitação válida é
 * precoBase + incremento.
 */
router.post('/', autenticar('produtor'), async (req, res) => {
  const { lote, descricao, imagem, precoBase, incremento, duracaoMinutos } = req.body;

  if (!lote || precoBase === undefined || !duracaoMinutos) {
    return res.status(400).json({ erro: 'Lote, preço base e duração são obrigatórios' });
  }
  if (Number(duracaoMinutos) < 1) {
    return res.status(400).json({ erro: 'A duração tem de ser de pelo menos 1 minuto' });
  }

  const leilao = await Auction.create({
    produtor: req.user.id,
    lote,
    descricao,
    imagem,
    precoBase: Number(precoBase),
    incremento: Number(incremento) || 5,
    licitacaoAtual: { valor: Number(precoBase), comprador: null, nome: '' },
    terminaEm: new Date(Date.now() + Number(duracaoMinutos) * 60 * 1000),
    estado: 'ativo',
  });

  res.status(201).location(`/api/auctions/${leilao._id}`).json(leilao);
});

/** DELETE /api/auctions/:id — o produtor (ou o admin) remove um leilão. */
router.delete('/:id', autenticar('produtor', 'admin'), async (req, res) => {
  const filtro = { _id: req.params.id };
  if (req.user.papel === 'produtor') filtro.produtor = req.user.id;

  const resultado = await Auction.deleteOne(filtro);
  if (!resultado.deletedCount) return res.status(404).json({ erro: 'Leilão não encontrado' });

  await Bid.deleteMany({ leilao: req.params.id });
  res.status(204).end();
});

module.exports = router;
