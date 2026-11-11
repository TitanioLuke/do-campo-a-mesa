import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../servicos/api';
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
 */
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { temSessao, utilizador } = useAuth();
  const { notificar } = useAvisos(); // os eventos do servidor aparecem como avisos
  const socketRef = useRef(null);
  const [ligado, setLigado] = useState(false);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem('token') || undefined } });
    socketRef.current = socket;

    socket.on('connect', () => setLigado(true));
    socket.on('disconnect', () => setLigado(false));

    // --- Notificações da sala pessoal ---
    socket.on('encomenda-atualizada', ({ estado, produtor }) =>
      notificar(`A sua encomenda em ${produtor} passou a "${estado}".`, 'info')
    );
    socket.on('nova-encomenda', ({ total }) =>
      notificar(`Nova encomenda recebida no valor de ${total} €.`, 'sucesso')
    );
    socket.on('leilao-ganho', ({ lote, valor }) =>
      notificar(`Ganhou o leilão "${lote}" por ${valor} €!`, 'sucesso')
    );
    socket.on('leilao-fechado', ({ lote, valor, comprador }) =>
      notificar(
        comprador ? `Leilão "${lote}" fechado: ${valor} € (${comprador}).` : `Leilão "${lote}" terminou sem licitações.`,
        'info'
      )
    );
    socket.on('registo-validado', ({ aprovado }) =>
      notificar(`O administrador marcou o seu registo como "${aprovado}".`, aprovado === 'aprovado' ? 'sucesso' : 'erro')
    );

    return () => socket.disconnect(); // fecha a ligação ao sair / terminar sessão
  }, [temSessao, utilizador?._id, notificar]);

  const valor = { socket: socketRef.current, ligado };

  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
