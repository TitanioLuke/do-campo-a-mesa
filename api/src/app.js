const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const origensPermitidas = require('./origens');

const app = express();

/**
 * Cabeçalhos HTTP de segurança (X-Content-Type-Options, Referrer-Policy,
 * HSTS em HTTPS, etc.). Duas exceções, ambas por razões concretas:
 *
 *  - `contentSecurityPolicy: false` porque o Swagger UI usa estilos e scripts
 *    inline que uma CSP restritiva bloquearia. O resto da API devolve JSON,
 *    onde a CSP não tem efeito prático.
 *  - `crossOriginResourcePolicy: 'cross-origin'` porque a SPA corre noutra
 *    origem e precisa de carregar as imagens servidas em /uploads. Com o valor
 *    por omissão (`same-origin`) o browser bloqueava-as.
 */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({ origin: origensPermitidas() }));
app.use(express.json());

// Imagens carregadas pelos produtores (em produção seria Blob Storage / S3)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Rotas da API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/producers', require('./routes/producers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/uploads', require('./routes/uploads'));

// --- Documentação OpenAPI em /api-docs ---
const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.get('/api/health', (req, res) => res.json({ estado: 'ok', hora: new Date() }));

// --- 404 para rotas desconhecidas ---
app.use((req, res) => res.status(404).json({ erro: 'Recurso não encontrado' }));

// --- Tratamento central de erros ---
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ erro: err.message });
  if (err.name === 'CastError') return res.status(400).json({ erro: 'Identificador inválido' });
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;
