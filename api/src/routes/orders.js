const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const autenticar = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/orders — o comprador fecha o carrinho.
 * O carrinho pode ter produtos de vários produtores: é criada UMA encomenda
 * por produtor, porque é o produtor que vai mudar o estado da sua encomenda.
 * Body: { linhas: [{ produto, quantidade }], entrega: { tipo, morada } }
 */
router.post('/', autenticar('comprador'), async (req, res) => {
  const { linhas, entrega } = req.body;
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return res.status(400).json({ erro: 'O carrinho está vazio' });
  }

  // 1. Ler os produtos da base de dados (nunca confiar nos preços enviados pelo cliente)
  const produtos = await Product.find({ _id: { $in: linhas.map((l) => l.produto) } });
  if (produtos.length !== linhas.length) {
    return res.status(400).json({ erro: 'Há produtos inválidos no carrinho' });
  }

  // 2. Agrupar as linhas por produtor
  const porProdutor = new Map();
  for (const linha of linhas) {
    const produto = produtos.find((p) => String(p._id) === String(linha.produto));
    const quantidade = Number(linha.quantidade);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return res.status(400).json({ erro: `Quantidade inválida para "${produto.nome}"` });
    }
    if (produto.stock < quantidade) {
      return res.status(400).json({ erro: `Stock insuficiente para "${produto.nome}"` });
    }

    const chave = String(produto.produtor);
    if (!porProdutor.has(chave)) porProdutor.set(chave, []);
    porProdutor.get(chave).push({
      produto: produto._id,
      nome: produto.nome,        // cópia no momento da compra
      precoUnit: produto.preco,  // cópia no momento da compra
      quantidade,
    });
  }

  // 3. Retirar o stock de forma atómica (só grava se ainda houver stock suficiente)
  for (const linha of linhas) {
    const atualizado = await Product.findOneAndUpdate(
      { _id: linha.produto, stock: { $gte: Number(linha.quantidade) } },
      { $inc: { stock: -Number(linha.quantidade) } }
    );
    if (!atualizado) return res.status(400).json({ erro: 'Stock insuficiente' });
  }

  // 4. Criar uma encomenda por produtor e avisar cada produtor em tempo real
  const io = req.app.get('io');
  const encomendas = [];
  for (const [produtor, linhasDoProdutor] of porProdutor) {
    const total = linhasDoProdutor.reduce((soma, l) => soma + l.precoUnit * l.quantidade, 0);
    const encomenda = await Order.create({
      comprador: req.user.id,
      produtor,
      linhas: linhasDoProdutor,
      total: Number(total.toFixed(2)),
      entrega: entrega || { tipo: 'levantamento' },
    });
    encomendas.push(encomenda);
    io.to(`user:${produtor}`).emit('nova-encomenda', { id: encomenda._id, total: encomenda.total });
  }

  res.status(201).location(`/api/orders/${encomendas[0]._id}`).json(encomendas);
});

/**
 * GET /api/orders — comprador vê as suas encomendas, produtor vê as que recebeu.
 * Query opcional: estado
 */
router.get('/', autenticar('comprador', 'produtor'), async (req, res) => {
  const filtro = req.user.papel === 'produtor' ? { produtor: req.user.id } : { comprador: req.user.id };
  if (req.query.estado) filtro.estado = req.query.estado;

  const encomendas = await Order.find(filtro)
    .populate('produtor', 'nome localidade')
    .populate('comprador', 'nome email')
    .sort({ createdAt: -1 });

  res.json(encomendas);
});

/** GET /api/orders/:id — só o comprador ou o produtor da encomenda lhe podem aceder. */
router.get('/:id', autenticar('comprador', 'produtor', 'admin'), async (req, res) => {
  const encomenda = await Order.findById(req.params.id)
    .populate('produtor', 'nome localidade')
    .populate('comprador', 'nome email');
  if (!encomenda) return res.status(404).json({ erro: 'Encomenda não encontrada' });

  const envolvido =
    String(encomenda.comprador._id) === req.user.id || String(encomenda.produtor._id) === req.user.id;
  if (!envolvido && req.user.papel !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });

  res.json(encomenda);
});

/**
 * PATCH /api/orders/:id/estado — o produtor avança o estado da encomenda
 * e o comprador recebe a notificação em tempo real na sua sala pessoal.
 */
router.patch('/:id/estado', autenticar('produtor'), async (req, res) => {
  const { estado } = req.body;
  const estados = ['pendente', 'confirmada', 'pronta', 'entregue'];
  if (!estados.includes(estado)) return res.status(400).json({ erro: 'Estado inválido' });

  const encomenda = await Order.findOneAndUpdate(
    { _id: req.params.id, produtor: req.user.id }, // o filtro garante que é o produtor da encomenda
    { estado },
    { new: true, runValidators: true }
  ).populate('produtor', 'nome');
  if (!encomenda) return res.status(404).json({ erro: 'Encomenda não encontrada' });

  req.app.get('io').to(`user:${encomenda.comprador}`).emit('encomenda-atualizada', {
    id: encomenda._id,
    estado: encomenda.estado,
    produtor: encomenda.produtor.nome,
  });

  res.json(encomenda);
});

module.exports = router;
