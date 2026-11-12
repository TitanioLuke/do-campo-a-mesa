import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexto/AuthContext';

const SEPARADORES = [
  ['/produtor', 'Resumo'],
  ['/produtor/produtos', 'Produtos'],
  ['/produtor/encomendas', 'Encomendas'],
  ['/produtor/leiloes', 'Leilões'],
  ['/produtor/perfil', 'Página pública'],
];

/** Cabeçalho comum às páginas do produtor. */
export default function NavProdutor({ titulo }) {
  const { utilizador } = useAuth();

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <h1 className="h4 mb-0">{titulo}</h1>
        <span className="text-black-50 small">{utilizador?.nome} · {utilizador?.localidade}</span>
      </div>

      {utilizador?.aprovado === 'pendente' && (
        <div className="alert alert-warning py-2">
          O seu registo ainda está <strong>pendente</strong> de validação pelo administrador.
          Até ser aprovado não pode criar produtos nem leilões. Pode ir preparando a sua
          página pública — é ela que o administrador vê para decidir.
        </div>
      )}
      {utilizador?.aprovado === 'rejeitado' && (
        <div className="alert alert-danger py-2">
          O seu registo foi <strong>rejeitado</strong> pelo administrador, por isso não pode
          criar nem alterar produtos ou leilões.
        </div>
      )}

      <ul className="nav nav-pills gap-1 mb-3">
        {SEPARADORES.map(([caminho, nome]) => (
          <li className="nav-item" key={caminho}>
            <NavLink end={caminho === '/produtor'} to={caminho} className={({ isActive }) => 'nav-link' + (isActive ? ' active bg-success' : ' text-dark')}>
              {nome}
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}
