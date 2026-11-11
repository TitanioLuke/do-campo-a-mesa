import { useEffect, useState } from 'react';
import { useSocket } from '../contexto/SocketContext';

/**
 * Hook reutilizável da sala de leilão.
 * Entra na sala `leilao:<id>`, mantém o estado atualizado a cada evento do
 * servidor e devolve a função para licitar.
 */
export function useLeilao(id) {
  const { socket } = useSocket();

  const [leilao, setLeilao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [participantes, setParticipantes] = useState(0);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('entrar', id);

    const aoEstado = (dados) => setLeilao(dados);
    const aoHistorico = (lista) => setHistorico(lista);
    const aoNovaLicitacao = ({ licitacaoAtual, licitacao }) => {
      setLeilao((atual) => (atual ? { ...atual, licitacaoAtual } : atual));
      setHistorico((atual) => [licitacao, ...atual].slice(0, 20));
      setErro('');
    };
    const aoPresenca = (n) => setParticipantes(n);
    const aoRecusada = (mensagem) => setErro(mensagem);
    const aoTerminado = (dados) => setLeilao(dados);
    const aoComecar = (dados) => setLeilao(dados); // o servidor abriu o leilão

    socket.on('estado', aoEstado);
    socket.on('historico', aoHistorico);
    socket.on('nova-licitacao', aoNovaLicitacao);
    socket.on('presenca', aoPresenca);
    socket.on('recusada', aoRecusada);
    socket.on('leilao-terminado', aoTerminado);
    socket.on('leilao-comecou', aoComecar);

    // Ao sair da página: deixar a sala e remover os ouvintes
    return () => {
      socket.emit('sair', id);
      socket.off('estado', aoEstado);
      socket.off('historico', aoHistorico);
      socket.off('nova-licitacao', aoNovaLicitacao);
      socket.off('presenca', aoPresenca);
      socket.off('recusada', aoRecusada);
      socket.off('leilao-terminado', aoTerminado);
      socket.off('leilao-comecou', aoComecar);
    };
  }, [socket, id]);

  const licitar = (valor) => {
    setErro('');
    socket?.emit('licitar', { leilaoId: id, valor });
  };

  // Valor mínimo da próxima licitação, calculado a partir do estado do servidor
  const minimo = leilao ? leilao.licitacaoAtual.valor + leilao.incremento : 0;

  return { leilao, historico, participantes, erro, licitar, minimo };
}
