const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const autenticar = require('../middleware/auth');

const router = express.Router();

// Quanto tempo pode faltar para um leilão abrir: nem já, para dar tempo aos
// compradores de entrarem na sala, nem daqui a muito, para o leilão não cair
// no esquecimento.
const MINUTOS_ATE_COMECAR_MIN = 3;
const MINUTOS_ATE_COMECAR_MAX = 60;

// Quanto pode durar um leilão. A API fala sempre em minutos — é a unidade mais
// pequena que faz sentido aqui e evita ter de interpretar unidades no servidor.
// O formulário é que deixa escolher minutos, horas ou dias e faz a conversão.
const DURACAO_MINUTOS_MIN = 1;
const DURACAO_MINUTOS_MAX = 7 * 24 * 60; // uma semana

/**
 * GET /api/auctions — lista de leilões.
 * Query: estado (agendado|ativo|terminado), produtor,
 *        aTerminar=true (termina na próxima hora, usa $lt)
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
 *
 * O leilão nasce AGENDADO: abre daqui a `minutosAteComecar` (entre 3 e 60) e
 * dura `duracaoMinutos` a partir daí. É o servidor que o abre e o fecha na hora
 * certa, por isso as datas não vêm do relógio do cliente.
 *
 * `licitacaoAtual.valor` começa no preço base: a 1.ª licitação válida é
 * precoBase + incremento.
 */
router.post('/', autenticar('produtor'), async (req, res) => {
  const { lote, descricao, imagem, precoBase, incremento, duracaoMinutos, minutosAteComecar } = req.body;

  if (!lote || precoBase === undefined || !duracaoMinutos || !minutosAteComecar) {
    return res.status(400).json({
      erro: 'Lote, preço base, tempo até começar e duração são obrigatórios',
    });
  }

  const ateComecar = Number(minutosAteComecar);
  if (ateComecar < MINUTOS_ATE_COMECAR_MIN || ateComecar > MINUTOS_ATE_COMECAR_MAX) {
    return res.status(400).json({
      erro: `O leilão tem de começar daqui a ${MINUTOS_ATE_COMECAR_MIN} a ${MINUTOS_ATE_COMECAR_MAX} minutos`,
    });
  }
  const duracao = Number(duracaoMinutos);
  if (!Number.isInteger(duracao) || duracao < DURACAO_MINUTOS_MIN || duracao > DURACAO_MINUTOS_MAX) {
    return res.status(400).json({
      erro: `A duração tem de ser um número inteiro de minutos, entre ${DURACAO_MINUTOS_MIN} e ${DURACAO_MINUTOS_MAX} (uma semana)`,
    });
  }

  const comecaEm = new Date(Date.now() + ateComecar * 60 * 1000);

  const leilao = await Auction.create({
    produtor: req.user.id,
    lote,
    descricao,
    imagem,
    precoBase: Number(precoBase),
    incremento: Number(incremento) || 5,
    licitacaoAtual: { valor: Number(precoBase), comprador: null, nome: '' },
    comecaEm,
    terminaEm: new Date(comecaEm.getTime() + duracao * 60 * 1000),
    estado: 'agendado',
  });

  // Quem estiver na aplicação vê o leilão novo aparecer na lista
  req.app.get('io').to('leiloes').emit('leiloes-mudaram');

  res.status(201).location(`/api/auctions/${leilao._id}`).json(leilao);
});

/** DELETE /api/auctions/:id — o produtor (ou o admin) remove um leilão. */
router.delete('/:id', autenticar('produtor', 'admin'), async (req, res) => {
  const filtro = { _id: req.params.id };
  if (req.user.papel === 'produtor') filtro.produtor = req.user.id;

  const resultado = await Auction.deleteOne(filtro);
  if (!resultado.deletedCount) return res.status(404).json({ erro: 'Leilão não encontrado' });

  await Bid.deleteMany({ leilao: req.params.id });
  req.app.get('io').to('leiloes').emit('leiloes-mudaram');
  res.status(204).end();
});

module.exports = router;
