import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataPt } from '../servicos/api';
import { useSocket } from '../contexto/SocketContext';

/** Desenho do sino, no mesmo traço dos outros ícones da aplicação. */
function Sino() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10.5 21a2 2 0 0 0 3 0" />
    </svg>
  );
}

/**
 * Sininho das notificações, ao lado do nome no cabeçalho.
 *
 * As notificações chegam pelo WebSocket (ver SocketContext) e ficam guardadas
 * entre visitas. Abrir o sininho é dar por lidas; cada linha leva à página que
 * a resolve — a encomenda, a sala do leilão, as avaliações.
 */
export default function Sininho() {
  const { notificacoes, porLer, marcarLidas, limparNotificacoes } = useSocket();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  // Fecha ao clicar fora ou com Escape, como os menus do sistema
  useEffect(() => {
    if (!aberto) return;

    const aoClicar = (evento) => {
      if (caixa.current && !caixa.current.contains(evento.target)) setAberto(false);
    };
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  function alternar() {
    if (!aberto) marcarLidas();
    setAberto((a) => !a);
  }

  return (
    <div className="sininho" ref={caixa}>
      <button
        type="button"
        className="botao-sino"
        onClick={alternar}
        aria-expanded={aberto}
        aria-label={porLer > 0 ? `Notificações (${porLer} por ler)` : 'Notificações'}
      >
        <Sino />
        {/* No telemóvel o sino fica numa lista de itens com nome; sozinho,
            parecia um botão perdido. A partir de md fica só o ícone. */}
        <span className="rotulo">Notificações</span>
        {porLer > 0 && <span className="contador-carrinho">{porLer}</span>}
      </button>

      {aberto && (
        <div className="caixa-sininho">
          <header>
            <strong>Notificações</strong>
            {notificacoes.length > 0 && (
              <button type="button" className="btn btn-sm btn-link p-0" onClick={limparNotificacoes}>
                limpar
              </button>
            )}
          </header>

          {notificacoes.length === 0 ? (
            <p className="vazio">Ainda não tem notificações.</p>
          ) : (
            <ul>
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <Link to={n.para} onClick={() => setAberto(false)}>
                    <span>{n.texto}</span>
                    <small>{dataPt(n.data)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
