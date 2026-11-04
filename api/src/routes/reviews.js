const express = require('express');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const autenticar = require('../middleware/auth');

const router = express.Router();

/**
 * Recalcula a média de um produto depois de uma avaliação mudar.
 * As avaliações ao produtor não têm produto, por isso não entram nesta conta.
 */
async function atualizarMedia(produtoId) {
  if (!produtoId) return;

  const avaliacoes = await Review.find({ produto: produtoId, oculta: false });
  const soma = avaliacoes.reduce((total, a) => total + a.nota, 0);
  await Product.findByIdAndUpdate(produtoId, {
    notaMedia: avaliacoes.length ? Number((soma / avaliacoes.length).toFixed(1)) : 0,
    numAvaliacoes: avaliacoes.length,
  });
}

/** GET /api/reviews?produto=&produtor= — avaliações visíveis. */
router.get('/', async (req, res) => {
  const filtro = { oculta: false };
  if (req.query.produto) filtro.produto = req.query.produto;
  if (req.query.produtor) filtro.produtor = req.query.produtor;

  const avaliacoes = await Review.find(filtro).populate('produto', 'nome').sort({ createdAt: -1 });
  res.json(avaliacoes);
});

/**
 * POST /api/reviews — o comprador avalia um produto OU um produtor.
 * Body: { produto, nota, comentario }   -> avaliação a um produto
 *       { produtor, nota, comentario }  -> avaliação ao produtor
 *
 * Em qualquer dos casos só pode avaliar depois de ter uma encomenda ENTREGUE,
 * e só uma vez por produto / por produtor.
 */
router.post('/', autenticar('comprador'), async (req, res) => {
  const { produto, produtor, nota, comentario } = req.body;

  if (!produto && !produtor) {
    return res.status(400).json({ erro: 'Indique o produto ou o produtor a avaliar' });
  }
  if (!nota) return res.status(400).json({ erro: 'A nota é obrigatória' });
  if (nota < 1 || nota > 5) return res.status(400).json({ erro: 'A nota tem de ser entre 1 e 5' });

  // Os dois casos só diferem na condição de compra e na verificação de repetido
  const avaliacaoAProduto = Boolean(produto);

  const comprou = avaliacaoAProduto
    ? await Order.findOne({ comprador: req.user.id, estado: 'entregue', 'linhas.produto': produto })
    : await Order.findOne({ comprador: req.user.id, estado: 'entregue', produtor });

  if (!comprou) {
    return res.status(403).json({
      erro: avaliacaoAProduto
        ? 'Só pode avaliar produtos de encomendas já entregues'
        : 'Só pode avaliar produtores a quem já comprou',
    });
  }

  const repetida = avaliacaoAProduto
    ? await Review.findOne({ comprador: req.user.id, produto })
    : await Review.findOne({ comprador: req.user.id, produtor, produto: null });

  if (repetida) {
    return res.status(400).json({
      erro: avaliacaoAProduto ? 'Já avaliou este produto' : 'Já avaliou este produtor',
    });
  }

  // O produtor é sempre guardado: no caso do produto, vem do próprio produto
  const idProdutor = avaliacaoAProduto ? (await Product.findById(produto)).produtor : produtor;

  const avaliacao = await Review.create({
    produto: produto || null,
    produtor: idProdutor,
    comprador: req.user.id,
    nome: req.user.nome,
    nota: Number(nota),
    comentario,
  });

  await atualizarMedia(produto);
  res.status(201).location(`/api/reviews/${avaliacao._id}`).json(avaliacao);
});

/** POST /api/reviews/:id/denunciar — marca a avaliação para moderação do admin. */
router.post('/:id/denunciar', autenticar(), async (req, res) => {
  const avaliacao = await Review.findByIdAndUpdate(req.params.id, { denunciada: true }, { new: true });
  if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  res.json(avaliacao);
});

module.exports = router;
module.exports.atualizarMedia = atualizarMedia;
