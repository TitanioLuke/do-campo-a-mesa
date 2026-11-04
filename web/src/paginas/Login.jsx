import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

const CONTAS = [
  ['Comprador', 'ana@dcm.pt'],
  ['Produtor', 'quinta@dcm.pt'],
  ['Administrador', 'admin@dcm.pt'],
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  const { entrar } = useAuth();
  const navegar = useNavigate();
  const localizacao = useLocation();

  async function submeter(evento) {
    evento.preventDefault();
    setErro('');
    setAEnviar(true);
    try {
      const utilizador = await entrar(email, password);
      const destinos = { produtor: '/produtor', admin: '/admin' };
      navegar(localizacao.state?.de || destinos[utilizador.papel] || '/');
    } catch (e) {
      setErro(e.message);
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
              <input id="email" type="email" className="form-control" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-control" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {erro && <div className="alert alert-danger py-2">{erro}</div>}

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
