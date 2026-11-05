import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';
import CampoPassword from '../componentes/CampoPassword';

const CONTAS = [
  ['Comprador', 'ana@dcm.pt'],
  ['Produtor', 'quinta@dcm.pt'],
  ['Administrador', 'admin@dcm.pt'],
];

/** Para onde cada papel vai depois de entrar. */
const DESTINOS = { produtor: '/produtor', admin: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  const { entrar, temSessao, papel } = useAuth();
  const { sucesso, erro } = useAvisos();
  const navegar = useNavigate();
  const localizacao = useLocation();

  // Quem já tem sessão não tem nada a fazer aqui — por exemplo, ao carregar
  // na seta de voltar atrás depois de entrar.
  if (temSessao) return <Navigate to={DESTINOS[papel] || '/'} replace />;

  async function submeter(evento) {
    evento.preventDefault();
    setAEnviar(true);
    try {
      const utilizador = await entrar(email, password);
      sucesso(`Bem-vindo, ${utilizador.nome}.`);

      // `replace` troca o /login no histórico em vez de empilhar: a seta de
      // voltar atrás leva à página anterior, não a um ecrã de entrada inútil.
      navegar(localizacao.state?.de || DESTINOS[utilizador.papel] || '/', { replace: true });
    } catch (e) {
      erro(e.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="painel">
          <h1 className="h4 mb-3">Entrar</h1>

          <form onSubmit={submeter}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-control"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <CampoPassword
                id="password"
                autoComplete="current-password"
                required
                valor={password}
                aoMudar={setPassword}
              />
            </div>

            <button className="btn btn-verde w-100" disabled={aEnviar}>
              {aEnviar ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <p className="small text-center mt-3 mb-0">
            Ainda não tem conta? <Link to="/registo">Registe-se</Link>
          </p>
        </div>

        <div className="painel mt-3">
          <h2 className="h6">Contas de demonstração</h2>
          <p className="small text-black-50">Password de todas: <code>123456</code></p>
          <div className="d-grid gap-2">
            {CONTAS.map(([nome, conta]) => (
              <button
                key={conta}
                className="btn btn-sm btn-outline-secondary"
                onClick={() => { setEmail(conta); setPassword('123456'); }}
              >
                {nome} — {conta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
