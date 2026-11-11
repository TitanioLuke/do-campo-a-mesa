const jwt = require('jsonwebtoken');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

// De quanto em quanto tempo o servidor verifica se há leilões para abrir ou fechar
const INTERVALO_RELOGIO = 3000;

// Sala onde estão todos os clientes ligados, usada para manter as LISTAS de
// leilões atualizadas em qualquer página, não só dentro de uma sala de leilão.
const SALAO = 'leiloes';

/**
 * Tempo real com Socket.io.
 *
 * Salas usadas:
 *   leiloes        toda a gente, para as listas de leilões se manterem vivas
 *   leilao:<id>    uma sala por leilão (licitações e presença)
 *   user:<id>      sala pessoal de cada utilizador com sessão (notificações)
 *
 * O servidor é a fonte da verdade: abre e fecha os leilões na hora certa e
 * valida cada licitação numa única operação atómica no MongoDB, só depois
 * fazendo broadcast.
 */
module.exports = function configurarSockets(io) {
  /**
   * Autenticação OPCIONAL.
   * Um visitante sem sessão também se liga: pode acompanhar os leilões em
   * direto, mas fica sem `socket.user` e por isso não consegue licitar.
   */
  io.use((socket, next) => {
    const { token } = socket.handshake.auth || {};
    socket.user = null;

    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        /* token inválido: segue como visitante */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join(SALAO);

    // Sala pessoal: recebe as notificações de encomendas deste utilizador
    if (socket.user) socket.join(`user:${socket.user.id}`);

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
     *
     * O filtro exige `estado: 'ativo'`, o que também impede licitações num
     * leilão que ainda não abriu.
     */
    socket.on('licitar', async ({ leilaoId, valor }) => {
      if (!socket.user) return socket.emit('recusada', 'Inicie sessão para licitar');
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
        return socket.emit('recusada', 'Licitação recusada: valor demasiado baixo ou leilão fechado');
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

      // E quem estiver noutra página vê a lista mudar de valor na hora
      io.to(SALAO).emit('leilao-atualizado', {
        _id: String(leilao._id),
        licitacaoAtual: leilao.licitacaoAtual,
        estado: leilao.estado,
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
   * Relógio do servidor.
   * De 3 em 3 segundos abre os leilões cuja hora de início chegou e fecha os
   * que passaram da hora de fim. É aqui, e só aqui, que o estado muda.
   */
  setInterval(async () => {
    const agora = new Date();
    let mudouAlguma = false;

    // --- Abrir os agendados cuja hora chegou ---
    const aAbrir = await Auction.find({ estado: 'agendado', comecaEm: { $lte: agora } });
    for (const leilao of aAbrir) {
      leilao.estado = 'ativo';
      await leilao.save();
      mudouAlguma = true;

      io.to(`leilao:${leilao._id}`).emit('leilao-comecou', leilao);
      io.to(`user:${leilao.produtor}`).emit('leilao-aberto', { id: leilao._id, lote: leilao.lote });
    }

    // --- Fechar os ativos que passaram da hora ($lt sobre uma data) ---
    const terminados = await Auction.find({ estado: 'ativo', terminaEm: { $lt: agora } });
    for (const leilao of terminados) {
      leilao.estado = 'terminado';
      await leilao.save();
      mudouAlguma = true;

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

    // Abrir ou fechar muda a que listas o leilão pertence, por isso as páginas
    // com listas voltam a pedi-las em vez de corrigirem um valor no sítio.
    if (mudouAlguma) io.to(SALAO).emit('leiloes-mudaram');
  }, INTERVALO_RELOGIO);
};
