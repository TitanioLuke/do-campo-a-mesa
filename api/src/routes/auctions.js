const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const autenticar = require('../middleware/auth');
const produtorAprovado = require('../middleware/produtorAprovado');

const router = express.Router();

// A que horas é que um leilão pode abrir. É uma regra de negócio: as aberturas
// são em horário de trabalho, senão não há ninguém na sala para licitar.
const HORA_ABERTURA_MIN = 8;
const HORA_ABERTURA_MAX = 18;

// E com que antecedência. Nem já — os compradores precisam de tempo para entrar
// na sala — nem daqui a muito, para o leilão não cair no esquecimento.
const ANTECEDENCIA_MINIMA_MS = 60 * 1000;
const ANTECEDENCIA_MAXIMA_MS = 24 * 60 * 60 * 1000;

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
 * O leilão nasce AGENDADO: abre em `comecaEm` (uma hora do próprio dia, entre
 * as 8h e as 18h) e dura `duracaoMinutos` a partir daí. É o servidor que o abre
 * e o fecha na hora certa, por isso o relógio de quem licita não conta.
 *
 * `licitacaoAtual.valor` começa no preço base: a 1.ª licitação válida é
 * precoBase + incremento.
 */
router.post('/', autenticar('produtor'), produtorAprovado, async (req, res) => {
  const { lote, descricao, imagem, precoBase, incremento, duracaoMinutos } = req.body;

  if (!lote || precoBase === undefined || !duracaoMinutos || !req.body.comecaEm) {
    return res.status(400).json({
      erro: 'Lote, preço base, hora de abertura e duração são obrigatórios',
    });
  }

  const comecaEm = new Date(req.body.comecaEm);
  if (Number.isNaN(comecaEm.getTime())) {
    return res.status(400).json({ erro: 'Hora de abertura inválida' });
  }

  const daquiA = comecaEm.getTime() - Date.now();
  if (daquiA < ANTECEDENCIA_MINIMA_MS) {
    return res.status(400).json({ erro: 'O leilão tem de abrir daqui a pelo menos um minuto' });
  }
  if (daquiA > ANTECEDENCIA_MAXIMA_MS) {
    return res.status(400).json({ erro: 'O leilão tem de abrir nas próximas 24 horas' });
  }

  // A hora do dia é lida no relógio do servidor, não no do cliente (por isso o
  // serviço publicado corre com TZ=Europe/Lisbon).
  const horaDoDia = comecaEm.getHours() + comecaEm.getMinutes() / 60;
  if (horaDoDia < HORA_ABERTURA_MIN || horaDoDia > HORA_ABERTURA_MAX) {
    return res.status(400).json({
      erro: `Os leilões só abrem entre as ${String(HORA_ABERTURA_MIN).padStart(2, '0')}:00`
        + ` e as ${HORA_ABERTURA_MAX}:00`,
    });
  }

  const duracao = Number(duracaoMinutos);
  if (!Number.isInteger(duracao) || duracao < DURACAO_MINUTOS_MIN || duracao > DURACAO_MINUTOS_MAX) {
    return res.status(400).json({
      erro: `A duração tem de ser um número inteiro de minutos, entre ${DURACAO_MINUTOS_MIN} e ${DURACAO_MINUTOS_MAX} (uma semana)`,
    });
  }

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
router.delete('/:id', autenticar('produtor', 'admin'), produtorAprovado, async (req, res) => {
  const filtro = { _id: req.params.id };
  if (req.user.papel === 'produtor') filtro.produtor = req.user.id;

  const resultado = await Auction.deleteOne(filtro);
  if (!resultado.deletedCount) return res.status(404).json({ erro: 'Leilão não encontrado' });

  await Bid.deleteMany({ leilao: req.params.id });
  req.app.get('io').to('leiloes').emit('leiloes-mudaram');
  res.status(204).end();
});

module.exports = router;
