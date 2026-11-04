const jwt = require('jsonwebtoken');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

/**
 * Tempo real com Socket.io.
 *
 * Salas usadas:
 *   user:<id>      sala pessoal de cada utilizador (notificações de encomendas)
 *   leilao:<id>    uma sala por leilão (licitações e presença)
 *
 * O servidor é a fonte da verdade: valida cada licitação numa única operação
 * atómica no MongoDB e só depois faz broadcast à sala.
 */
module.exports = function configurarSockets(io) {
  // --- Autenticação: o mesmo JWT da API, enviado no handshake ---
  io.use((socket, next) => {
    const { token } = socket.handshake.auth || {};
    if (!token) return next(new Error('Não autorizado'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Não autorizado'));
    }
  });

  io.on('connection', (socket) => {
    // Sala pessoal: recebe as notificações de encomendas deste utilizador
    socket.join(`user:${socket.user.id}`);

    /** Entrar na sala de um leilão. */
    socket.on('entrar', async (leilaoId) => {
      const sala = `leilao:${leilaoId}`;
      socket.join(sala);

      const leilao = await Auction.findById(leilaoId);
      if (!leilao) return socket.emit('recusada', 'Leilão não encontrado');

      socket.emit('estado', leilao);
      socket.emit('historico', await Bid.find({ leilao: leilaoId }).sort({ createdAt: -1 }).limit(20));
      io.to(sala).emit('presenca', io.sockets.adapter.rooms.get(sala)?.size ?? 0);
    });

    /** Sair da sala de um leilão (ao mudar de página). */
    socket.on('sair', (leilaoId) => {
      const sala = `leilao:${leilaoId}`;
      socket.leave(sala);
      io.to(sala).emit('presenca', io.sockets.adapter.rooms.get(sala)?.size ?? 0);
    });

    /**
     * Licitar.
     * A validação é feita no filtro do findOneAndUpdate, por isso o MongoDB
     * aplica-a de forma ATÓMICA: se duas licitações chegarem ao mesmo tempo,
     * só a primeira encontra o documento no estado esperado; a segunda já não
     * cumpre a condição e é recusada.
     */
    socket.on('licitar', async ({ leilaoId, valor }) => {
      if (socket.user.papel !== 'comprador') {
        return socket.emit('recusada', 'Só os compradores podem licitar');
      }
      const montante = Number(valor);
      if (!Number.isFinite(montante)) return socket.emit('recusada', 'Valor inválido');

      const leilao = await Auction.findOneAndUpdate(
        {
          _id: leilaoId,
          estado: 'ativo',
          terminaEm: { $gt: new Date() },
          // valor >= licitacaoAtual.valor + incremento, avaliado no servidor
          $expr: { $gte: [montante, { $add: ['$licitacaoAtual.valor', '$incremento'] }] },
        },
        { licitacaoAtual: { valor: montante, comprador: socket.user.id, nome: socket.user.nome } },
        { new: true }
      );

      if (!leilao) {
        return socket.emit('recusada', 'Licitação recusada: valor demasiado baixo ou leilão terminado');
      }

      // Guardar no histórico e avisar toda a sala
      const licitacao = await Bid.create({
        leilao: leilaoId,
        comprador: socket.user.id,
        nome: socket.user.nome,
        valor: montante,
      });

      io.to(`leilao:${leilaoId}`).emit('nova-licitacao', {
        licitacaoAtual: leilao.licitacaoAtual,
        licitacao,
      });
    });

    /** Atualizar a presença nas salas que o socket estava a deixar. */
    socket.on('disconnecting', () => {
      for (const sala of socket.rooms) {
        if (!sala.startsWith('leilao:')) continue;
        const tamanho = (io.sockets.adapter.rooms.get(sala)?.size ?? 1) - 1;
        io.to(sala).emit('presenca', tamanho);
      }
    });
  });

  /**
   * Fecho automático dos leilões.
   * De 5 em 5 segundos procura leilões ativos cuja data de fim já passou
   * ($lt), marca-os como terminados e avisa a sala.
   */
  setInterval(async () => {
    const terminados = await Auction.find({ estado: 'ativo', terminaEm: { $lt: new Date() } });
    for (const leilao of terminados) {
      leilao.estado = 'terminado';
      await leilao.save();

      io.to(`leilao:${leilao._id}`).emit('leilao-terminado', leilao);
      // Avisa o vencedor e o produtor nas salas pessoais
      if (leilao.licitacaoAtual.comprador) {
        io.to(`user:${leilao.licitacaoAtual.comprador}`).emit('leilao-ganho', {
          id: leilao._id,
          lote: leilao.lote,
          valor: leilao.licitacaoAtual.valor,
        });
      }
      io.to(`user:${leilao.produtor}`).emit('leilao-fechado', {
        id: leilao._id,
        lote: leilao.lote,
        valor: leilao.licitacaoAtual.valor,
        comprador: leilao.licitacaoAtual.nome,
      });
    }
  }, 5000);
};
