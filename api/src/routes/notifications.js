const express = require('express');
const Notification = require('../models/Notification');
const autenticar = require('../middleware/auth');

const router = express.Router();

// Quantas se mostram no sininho. Não é um arquivo: é o que ainda interessa ver.
const LIMITE = 30;

/**
 * GET /api/notifications — as notificações deste utilizador, da mais recente
 * para a mais antiga. É o que o sininho pede ao iniciar sessão, e é por isto
 * que uma venda feita enquanto o produtor estava fora não se perde.
 */
router.get('/', autenticar(), async (req, res) => {
  const notificacoes = await Notification.find({ utilizador: req.user.id })
    .sort({ createdAt: -1 })
    .limit(LIMITE);

  res.json(notificacoes);
});

/** PATCH /api/notifications/lidas — abrir o sininho é dar tudo por lido. */
router.patch('/lidas', autenticar(), async (req, res) => {
  await Notification.updateMany({ utilizador: req.user.id, lida: false }, { lida: true });
  res.status(204).end(); // 204 No Content
});

/** DELETE /api/notifications — limpar a lista. Só apaga as de quem pede. */
router.delete('/', autenticar(), async (req, res) => {
  await Notification.deleteMany({ utilizador: req.user.id });
  res.status(204).end();
});

module.exports = router;
