import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../servicos/api';
import { useAuth } from './AuthContext';

/**
 * Uma única ligação WebSocket por utilizador, partilhada por toda a aplicação.
 * Aqui tratam-se as notificações que chegam à sala pessoal (`user:<id>`);
 * as salas de leilão são tratadas no hook useLeilao.
 */
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { temSessao, utilizador } = useAuth();
  const socketRef = useRef(null);
  const [ligado, setLigado] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);

  function notificar(texto) {
    const id = Date.now() + Math.random();
    setNotificacoes((atuais) => [...atuais, { id, texto }]);
    setTimeout(() => setNotificacoes((atuais) => atuais.filter((n) => n.id !== id)), 6000);
  }

  useEffect(() => {
    if (!temSessao) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setLigado(false);
      return;
    }

    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;

    socket.on('connect', () => setLigado(true));
    socket.on('disconnect', () => setLigado(false));

    // --- Notificações da sala pessoal ---
    socket.on('encomenda-atualizada', ({ estado, produtor }) =>
      notificar(`A sua encomenda em ${produtor} passou a "${estado}".`)
    );
    socket.on('nova-encomenda', ({ total }) =>
      notificar(`Nova encomenda recebida no valor de ${total} €.`)
    );
    socket.on('leilao-ganho', ({ lote, valor }) => notificar(`Ganhou o leilão "${lote}" por ${valor} €!`));
    socket.on('leilao-fechado', ({ lote, valor, comprador }) =>
      notificar(comprador ? `Leilão "${lote}" fechado: ${valor} € (${comprador}).` : `Leilão "${lote}" terminou sem licitações.`)
    );
    socket.on('registo-validado', ({ aprovado }) =>
      notificar(`O administrador marcou o seu registo como "${aprovado}".`)
    );

    return () => socket.disconnect(); // fecha a ligação ao sair / terminar sessão
  }, [temSessao, utilizador?._id]);

  const valor = {
    socket: socketRef.current,
    ligado,
    notificacoes,
    notificar,
    fechar: (id) => setNotificacoes((atuais) => atuais.filter((n) => n.id !== id)),
  };

  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
