import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useSocket } from '../contexto/SocketContext';

/**
 * Navegação principal. O menu é fechado por omissão (telemóvel) e abre-se
 * com o botão; a partir de md fica sempre visível (classes do Bootstrap).
 */
export default function Cabecalho() {
  const { utilizador, papel, sair } = useAuth();
  const { numArtigos } = useCarrinho();
  const { ligado } = useSocket();
  const [aberto, setAberto] = useState(false);
  const navegar = useNavigate();

  const fechar = () => setAberto(false);
  const classe = ({ isActive }) => 'nav-link' + (isActive ? ' ativo' : '');

  function terminarSessao() {
    sair();
    fechar();
    navegar('/');
  }

  return (
    <header className="cabecalho">
      <nav className="navbar navbar-expand-md container-fluid" style={{ maxWidth: 1200 }}>
        <Link className="marca navbar-brand" to="/" onClick={fechar}>
          Do Campo à Mesa
        </Link>

        <button
          className="navbar-toggler border-light"
          type="button"
          aria-label="Abrir menu"
          onClick={() => setAberto((a) => !a)}
        >
          <span className="navbar-toggler-icon" style={{ filter: 'invert(1)' }} />
        </button>

        <div className={`collapse navbar-collapse${aberto ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink to="/" end className={classe} onClick={fechar}>Catálogo</NavLink></li>
            <li className="nav-item"><NavLink to="/produtores" className={classe} onClick={fechar}>Produtores</NavLink></li>
            <li className="nav-item"><NavLink to="/leiloes" className={classe} onClick={fechar}>Leilões</NavLink></li>

            {papel === 'comprador' && (
              <li className="nav-item"><NavLink to="/encomendas" className={classe} onClick={fechar}>As minhas encomendas</NavLink></li>
            )}
            {papel === 'produtor' && (
              <li className="nav-item"><NavLink to="/produtor" className={classe} onClick={fechar}>Painel do produtor</NavLink></li>
            )}
            {papel === 'admin' && (
              <li className="nav-item"><NavLink to="/admin" className={classe} onClick={fechar}>Administração</NavLink></li>
            )}
          </ul>

          <ul className="navbar-nav align-items-md-center">
            {papel !== 'produtor' && papel !== 'admin' && (
              <li className="nav-item">
                <NavLink to="/carrinho" className={classe} onClick={fechar}>
                  Carrinho
                  {numArtigos > 0 && <span className="contador-carrinho">{numArtigos}</span>}
                </NavLink>
              </li>
            )}

            {utilizador ? (
              <>
                <li className="nav-item">
                  <span className="nav-link" title={ligado ? 'Ligado em tempo real' : 'Sem ligação em tempo real'}>
                    <span className={`ponto${ligado ? ' ponto-ligado' : ''}`} />
                    {utilizador.nome}
                  </span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-sm btn-outline-light ms-md-2 my-2 my-md-0" onClick={terminarSessao}>
                    Sair
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><NavLink to="/login" className={classe} onClick={fechar}>Entrar</NavLink></li>
                <li className="nav-item">
                  <Link className="btn btn-sm btn-light ms-md-2 my-2 my-md-0" to="/registo" onClick={fechar}>
                    Registar
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
}
