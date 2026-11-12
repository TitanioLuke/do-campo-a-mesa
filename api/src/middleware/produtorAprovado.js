const User = require('../models/User');

/**
 * Só um produtor APROVADO pelo administrador pode criar ou alterar coisas na
 * plataforma: produtos, leilões e fotografias.
 *
 * Até lá o registo existe e o produtor entra na aplicação — vê o painel, a
 * página pública e o que já tem —, mas não produz nada que os compradores
 * possam vir a ver. Sem isto, bastava registar-se para pôr produtos no
 * catálogo assim que o administrador aprovasse, sem ele saber o que estava a
 * aprovar.
 *
 * O estado é lido da base de dados e não do token: o token é assinado no
 * início da sessão e não muda quando o administrador aprova ou rejeita, por
 * isso um produtor acabado de aprovar teria de sair e voltar a entrar.
 *
 * O administrador passa sem verificação — é ele que aprova.
 */
module.exports = async function produtorAprovado(req, res, next) {
  if (req.user.papel !== 'produtor') return next();

  const produtor = await User.findById(req.user.id).select('aprovado');
  if (!produtor) return res.status(401).json({ erro: 'Conta não encontrada' });

  if (produtor.aprovado !== 'aprovado') {
    return res.status(403).json({
      erro:
        produtor.aprovado === 'rejeitado'
          ? 'O seu registo foi rejeitado pelo administrador.'
          : 'O seu registo ainda está à espera da validação do administrador.',
    });
  }

  next();
};
