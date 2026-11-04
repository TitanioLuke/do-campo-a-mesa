const path = require('path');
const multer = require('multer');

/**
 * Upload de imagens de produtos/leilões.
 * Em desenvolvimento os ficheiros ficam na pasta `uploads/` e são servidos
 * pelo Express. Em produção (Passo 8) o destino seria Blob Storage / S3 —
 * só muda este ficheiro, o resto da aplicação continua a receber um URL.
 */
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extensao}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => {
    const permitido = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(permitido.includes(file.mimetype) ? null : new Error('Formato de imagem inválido'), permitido.includes(file.mimetype));
  },
});

module.exports = upload;
