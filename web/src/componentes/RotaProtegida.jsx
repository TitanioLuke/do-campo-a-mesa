import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

/**
 * Protege rotas no cliente: sem sessão vai para /login, com o papel errado
 * mostra uma mensagem. (A segurança a sério está na API, com o JWT.)
 */
export default function RotaProtegida({ papeis, children }) {
  const { temSessao, papel, aCarregar } = useAuth();
  const localizacao = useLocation();

  if (aCarregar) return <p className="text-center py-5">A carregar…</p>;
  if (!temSessao) return <Navigate to="/login" state={{ de: localizacao.pathname }} replace />;

  if (papeis && !papeis.includes(papel)) {
    return (
      <div className="alert alert-warning">
        Esta área é exclusiva de {papeis.join(' / ')}. A sua conta é de <strong>{papel}</strong>.
      </div>
    );
  }
  return children;
}
