import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '../servicos/api';
import { useAuth } from './AuthContext';
import { useAvisos } from './AvisosContext';

/**
 * Uma única ligação WebSocket, partilhada por toda a aplicação.
 *
 * A ligação existe mesmo sem sessão iniciada: um visitante também acompanha os
 * leilões em direto, só não pode licitar (o servidor recusa). Quando a sessão
 * muda, a ligação é refeita, porque a identidade é fixada no handshake.
 *
 * Aqui tratam-se as notificações que chegam à sala pessoal (`user:<id>`);
 * as salas de leilão são tratadas no hook useLeilao.
 *
 * As notificações **vivem no servidor**, não aqui. Esta é a diferença que
 * importa: o WebSocket é só a entrega imediata a quem está ligado. Quem não
 * estiver recebe-as na mesma, ao iniciar sessão, porque são lidas de
 * `GET /api/notifications`. Antes ficavam no `localStorage` e perdiam-se —
 * quem não tivesse a aplicação aberta nunca soube da venda.
 */
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { temSessao, utilizador, atualizar } = useAuth();
  const { notificar } = useAvisos();
  const socketRef = useRef(null);
  const [ligado, setLigado] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);

  const idUtilizador = utilizador?._id;

  // Ao iniciar sessão, traz o que ficou para trás
  useEffect(() => {
    if (!idUtilizador) {
      setNotificacoes([]);
      return;
    }
    api.get('/notifications').then(setNotificacoes).catch(() => setNotificacoes([]));
  }, [idUtilizador]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') || undefined } });
    socketRef.current = socket;

    socket.on('connect', () => setLigado(true));
    socket.on('disconnect', () => setLigado(false));

    // Uma notificação, um evento. O texto vem escrito do servidor, que é quem
    // a gravou — o cliente só a mostra e junta ao topo da lista.
    socket.on('notificacao', (nova) => {
      notificar(nova.texto, nova.tipo);
      setNotificacoes((atuais) => [nova, ...atuais]);
    });

    // O registo validado tem um efeito além do aviso: o estado da aprovação
    // vem no utilizador da sessão e decide se os formulários aparecem. Sem
    // esta linha, um produtor acabado de aprovar tinha de sair e voltar a
    // entrar para poder criar seja o que for.
    socket.on('registo-validado', ({ aprovado }) => {
      atualizar((atual) => (atual ? { ...atual, aprovado } : atual));
    });

    return () => socket.disconnect(); // fecha a ligação ao sair / terminar sessão
  }, [temSessao, idUtilizador, notificar, atualizar]);

  /** Abrir o sininho é dar tudo por lido, aqui e no servidor. */
  const marcarLidas = useCallback(() => {
    setNotificacoes((atuais) => atuais.map((n) => (n.lida ? n : { ...n, lida: true })));
    api.patch('/notifications/lidas').catch(() => {});
  }, []);

  const limparNotificacoes = useCallback(() => {
    setNotificacoes([]);
    api.del('/notifications').catch(() => {});
  }, []);

  const valor = {
    socket: socketRef.current,
    ligado,
    notificacoes,
    porLer: notificacoes.filter((n) => !n.lida).length,
    marcarLidas,
    limparNotificacoes,
  };

  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
