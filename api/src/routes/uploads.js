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
 * POST /api/uploads — recebe uma imagem (campo `imagem`) e devolve o CAMINHO
 * para guardar no produto ou no leilão.
 *
 * Devolve `/uploads/ficheiro.png` e não o endereço completo de propósito: o
 * endereço completo seria o desta máquina ("localhost" durante o
 * desenvolvimento), e uma imagem guardada assim deixava de aparecer quando a
 * aplicação fosse aberta a partir do telemóvel ou publicada noutro domínio.
 * Guardando o caminho, é quem mostra a imagem que lhe junta o servidor.
 */
router.post('/', autenticar('produtor', 'admin'), receberImagem, (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });

  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
