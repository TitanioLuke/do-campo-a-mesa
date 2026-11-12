import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, euros } from '../servicos/api';
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
 * Cada notificação aparece de duas maneiras: um aviso que passa ao fim de
 * segundos (o toast) e uma linha no sininho do cabeçalho, que fica. O aviso é
 * para quem está a olhar; o sininho é para quem não estava.
 */
const SocketContext = createContext(null);

// Quantas notificações se guardam por utilizador. Não é um histórico, é o que
// ainda interessa ver — daí o limite e o botão de limpar.
const MAXIMO_NOTIFICACOES = 20;
const chaveDe = (id) => `notificacoes:${id}`;

/** Lê as notificações que este utilizador já tinha neste browser. */
function lerGuardadas(id) {
  if (!id) return [];
  try {
    return JSON.parse(localStorage.getItem(chaveDe(id))) || [];
  } catch {
    return [];
  }
}

export function SocketProvider({ children }) {
  const { temSessao, utilizador, atualizar } = useAuth();
  const { notificar } = useAvisos();
  const socketRef = useRef(null);
  const [ligado, setLigado] = useState(false);

  const idUtilizador = utilizador?._id;
  const [notificacoes, setNotificacoes] = useState(() => lerGuardadas(idUtilizador));

  // Trocar de conta troca a lista, e cada mudança fica guardada no browser —
  // sem isto, recarregar a página esvaziava o sininho.
  useEffect(() => {
    setNotificacoes(lerGuardadas(idUtilizador));
  }, [idUtilizador]);

  useEffect(() => {
    if (idUtilizador) localStorage.setItem(chaveDe(idUtilizador), JSON.stringify(notificacoes));
  }, [notificacoes, idUtilizador]);

  /** Junta uma notificação ao topo. `para` é a página que a resolve. */
  const acrescentar = useCallback((texto, para) => {
    setNotificacoes((atuais) =>
      [
        { id: Date.now() + Math.random(), texto, para, data: new Date().toISOString(), lida: false },
        ...atuais,
      ].slice(0, MAXIMO_NOTIFICACOES)
    );
  }, []);

  const marcarLidas = useCallback(
    () => setNotificacoes((atuais) => atuais.map((n) => (n.lida ? n : { ...n, lida: true }))),
    []
  );

  const limparNotificacoes = useCallback(() => setNotificacoes([]), []);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') || undefined } });
    socketRef.current = socket;

    socket.on('connect', () => setLigado(true));
    socket.on('disconnect', () => setLigado(false));

    // Mostra o aviso e guarda a linha no sininho, de uma vez
    const avisar = (texto, tipo, para) => {
      notificar(texto, tipo);
      acrescentar(texto, para);
    };

    // --- O que o COMPRADOR recebe ---
    socket.on('encomenda-atualizada', ({ estado, produtor }) =>
      avisar(`A sua encomenda em ${produtor} passou a "${estado}".`, 'info', '/encomendas')
    );
    socket.on('leilao-ganho', ({ id, lote, valor }) =>
      avisar(`Ganhou o leilão "${lote}" por ${euros(valor)}!`, 'sucesso', `/leiloes/${id}`)
    );

    // --- O que o PRODUTOR recebe ---
    socket.on('nova-encomenda', ({ total }) =>
      avisar(`Nova encomenda recebida no valor de ${euros(total)}.`, 'sucesso', '/produtor/encomendas')
    );
    socket.on('nova-avaliacao', ({ nome, nota, alvo }) =>
      avisar(
        alvo
          ? `${nome} avaliou "${alvo}" com ${nota} estrelas.`
          : `${nome} avaliou-o com ${nota} estrelas.`,
        'info',
        `/produtores/${idUtilizador}`
      )
    );
    socket.on('leilao-fechado', ({ id, lote, valor, comprador }) =>
      avisar(
        comprador
          ? `Leilão "${lote}" fechado: ${euros(valor)} (${comprador}).`
          : `Leilão "${lote}" terminou sem licitações.`,
        'info',
        `/leiloes/${id}`
      )
    );
    socket.on('registo-validado', ({ aprovado }) => {
      avisar(
        `O administrador marcou o seu registo como "${aprovado}".`,
        aprovado === 'aprovado' ? 'sucesso' : 'erro',
        '/produtor'
      );
      // O estado do registo vem no utilizador da sessão e decide se os
      // formulários aparecem. Sem esta linha, um produtor acabado de aprovar
      // tinha de sair e voltar a entrar para poder criar seja o que for.
      atualizar((atual) => (atual ? { ...atual, aprovado } : atual));
    });

    return () => socket.disconnect(); // fecha a ligação ao sair / terminar sessão
  }, [temSessao, idUtilizador, notificar, acrescentar, atualizar]);

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
