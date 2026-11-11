import { useCallback, useEffect, useState } from 'react';
import { api } from '../servicos/api';
import { useSocket } from '../contexto/SocketContext';

/**
 * Lista de leilões que se mantém viva sozinha.
 *
 * Qualquer página que mostre leilões usa este hook e fica em tempo real sem
 * saber nada de WebSockets. São dois eventos, vindos da sala `leiloes`:
 *
 *   leilao-atualizado  alguém licitou -> corrige só esse leilão na lista
 *   leiloes-mudaram    um leilão abriu, fechou, nasceu ou foi apagado ->
 *                      volta a pedir a lista, porque mudou quem lá pertence
 *
 * @param {string} parametros query string da API, por exemplo '?estado=ativo'
 */
export function useListaLeiloes(parametros = '') {
  const { socket } = useSocket();
  const [leiloes, setLeiloes] = useState([]);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(() => {
    api.get(`/auctions${parametros}`)
      .then(setLeiloes)
      .catch(() => {})
      .finally(() => setACarregar(false));
  }, [parametros]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    if (!socket) return;

    const aoLicitar = ({ _id, licitacaoAtual, estado }) =>
      setLeiloes((atuais) =>
        atuais.map((l) => (l._id === _id ? { ...l, licitacaoAtual, estado } : l))
      );

    socket.on('leilao-atualizado', aoLicitar);
    socket.on('leiloes-mudaram', carregar);

    return () => {
      socket.off('leilao-atualizado', aoLicitar);
      socket.off('leiloes-mudaram', carregar);
    };
  }, [socket, carregar]);

  return { leiloes, aCarregar, recarregar: carregar };
}
