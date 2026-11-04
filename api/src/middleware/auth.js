const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação e autorização.
 *
 *   auth()              -> exige um token válido (qualquer papel)
 *   auth('produtor')    -> exige token válido E papel 'produtor'
 *   auth('produtor','admin') -> aceita qualquer um dos papéis
 *
 * 401 = não autenticado (token em falta ou inválido)
 * 403 = autenticado mas sem permissão para este recurso
 */
function auth(...papeis) {
  return (req, res, next) => {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;

    if (!token) return res.status(401).json({ erro: 'Token em falta' });

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }

    if (papeis.length && !papeis.includes(req.user.papel)) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }
    next();
  };
}

/**
 * Variante opcional: se houver token preenche req.user, caso contrário segue.
 * Usada em rotas públicas que mostram algo extra a quem tem sessão iniciada.
 */
auth.opcional = (req, res, next) => {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      /* token inválido: segue como visitante */
    }
  }
  next();
};

module.exports = auth;
