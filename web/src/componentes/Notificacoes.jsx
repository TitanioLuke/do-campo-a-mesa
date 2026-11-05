import { useSocket } from '../contexto/SocketContext';

/** Avisos em tempo real que chegam pelo WebSocket (canto inferior direito). */
export default function Notificacoes() {
  const { notificacoes, fechar } = useSocket();
  if (notificacoes.length === 0) return null;

  return (
    <div className="notificacoes">
      {notificacoes.map((n) => (
        <div key={n.id} className="notificacao d-flex justify-content-between align-items-start gap-2">
          <span>{n.texto}</span>
          <button className="btn-close btn-sm" aria-label="Fechar" onClick={() => fechar(n.id)} />
        </div>
      ))}
    </div>
  );
}
