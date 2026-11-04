const express = require('express');
const upload = require('../middleware/upload');
const autenticar = require('../middleware/auth');

const router = express.Router();

/**
 * Recebe o ficheiro e converte os erros do multer (formato errado, ficheiro
 * demasiado grande) em 400, em vez de deixá-los chegar ao erro 500.
 */
function receberImagem(req, res, next) {
  upload.single('imagem')(req, res, (erro) => {
    if (erro) return res.status(400).json({ erro: erro.message });
    next();
  });
}

/**
 * POST /api/uploads — recebe uma imagem (campo `imagem`) e devolve o URL
 * público para guardar no produto ou no leilão.
 */
router.post('/', autenticar('produtor', 'admin'), receberImagem, (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

module.exports = router;
