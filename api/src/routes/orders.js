const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const autenticar = require('../middleware/auth');
const notificar = require('../notificar');
const { euros } = require('../notificar');

const router = express.Router();

/**
 * Devolve ao stock o que já tinha sido retirado.
 *
 * Serve para quando a encomenda não se chega a fazer: o stock é retirado
 * produto a produto e, sem isto, um carrinho com vários produtos podia ficar a
 * meio — unidades retiradas a uns produtos e encomenda nenhuma criada.
 */
async function devolverStock(retiradas) {
  for (const { produto, quantidade } of retiradas) {
    await Product.findByIdAndUpdate(produto, { $inc: { stock: quantidade } });
  }
}

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

  // 3. Retirar o stock de forma atómica (só grava se ainda houver stock
  //    suficiente). O passo 2 já tinha verificado o stock, mas entre a leitura
  //    e esta escrita pode ter entrado a encomenda de outro comprador — é esta
  //    condição, dentro do filtro, que decide. Se uma linha falhar, as que já
  //    foram retiradas são devolvidas e não fica nada a meio.
  const retiradas = [];
  for (const linha of linhas) {
    const quantidade = Number(linha.quantidade);
    const atualizado = await Product.findOneAndUpdate(
      { _id: linha.produto, stock: { $gte: quantidade } },
      { $inc: { stock: -quantidade } }
    );

    if (!atualizado) {
      await devolverStock(retiradas);
      const nome = produtos.find((p) => String(p._id) === String(linha.produto)).nome;
      return res.status(400).json({ erro: `"${nome}" esgotou-se entretanto. Volte a tentar.` });
    }
    retiradas.push({ produto: linha.produto, quantidade });
  }

  // 4. Criar uma encomenda por produtor e avisar cada produtor em tempo real.
  //    Se alguma falhar, o stock é devolvido pela mesma razão do passo 3.
  const io = req.app.get('io');
  const encomendas = [];
  try {
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
  } catch (erro) {
    // Desfazer tudo: as encomendas que já tinham sido criadas e o stock.
    await Order.deleteMany({ _id: { $in: encomendas.map((e) => e._id) } });
    await devolverStock(retiradas);
    throw erro;
  }

  // 5. Notificar os produtores, FORA do bloco que desfaz a encomenda: uma
  //    falha a gravar a notificação não pode cancelar uma venda que já está
  //    feita. No pior caso perde-se o aviso, não o negócio.
  for (const encomenda of encomendas) {
    try {
      await notificar(io, encomenda.produtor, {
        texto: `Nova encomenda de ${encomenda.linhas.length} artigo(s), no valor de ${euros(encomenda.total)}.`,
        para: '/produtor/encomendas',
        tipo: 'sucesso',
      });
    } catch {
      /* a encomenda está feita; o aviso é o que se perde */
    }
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

  const io = req.app.get('io');
  io.to(`user:${encomenda.comprador}`).emit('encomenda-atualizada', {
    id: encomenda._id,
    estado: encomenda.estado,
    produtor: encomenda.produtor.nome,
  });
  await notificar(io, encomenda.comprador, {
    texto: `A sua encomenda em ${encomenda.produtor.nome} passou a "${encomenda.estado}".`,
    para: '/encomendas',
  });

  res.json(encomenda);
});

module.exports = router;
