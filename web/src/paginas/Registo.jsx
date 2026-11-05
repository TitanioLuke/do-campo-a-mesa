import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { coordenadasDe } from '../dados/concelhos';
import SelectLocalidade from '../componentes/SelectLocalidade';

export default function Registo() {
  const [dados, setDados] = useState({
    nome: '', email: '', password: '', papel: 'comprador',
    localidade: '', descricao: '', telefone: '',
  });
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  const { registar } = useAuth();
  const navegar = useNavigate();

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(evento) {
    evento.preventDefault();
    setErro('');
    setAEnviar(true);
    try {
      const corpo = { ...dados };
      if (corpo.papel === 'comprador') {
        delete corpo.localidade; delete corpo.descricao; delete corpo.telefone;
      } else {
        // As coordenadas do mapa saem do concelho escolhido; ninguém as escreve
        Object.assign(corpo, coordenadasDe(corpo.localidade) ?? {});
      }
      const utilizador = await registar(corpo);
      navegar(utilizador.papel === 'produtor' ? '/produtor' : '/');
    } catch (e) {
      setErro(e.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-10 col-lg-7">
        <div className="painel">
          <h1 className="h4 mb-3">Criar conta</h1>

          <form onSubmit={submeter}>
            <div className="mb-3">
              <label className="form-label">Quero registar-me como</label>
              <div className="btn-group w-100" role="group">
                {['comprador', 'produtor'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn ${dados.papel === p ? 'btn-verde' : 'btn-outline-secondary'}`}
                    onClick={() => setDados({ ...dados, papel: p })}
                  >
                    {p === 'comprador' ? 'Comprador' : 'Produtor'}
                  </button>
                ))}
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="nome">{dados.papel === 'produtor' ? 'Nome do produtor / quinta' : 'Nome'}</label>
                <input id="nome" className="form-control" required value={dados.nome} onChange={mudar('nome')} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-control" required value={dados.email} onChange={mudar('email')} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="password">Password (mín. 6 caracteres)</label>
                <input id="password" type="password" className="form-control" required minLength={6} value={dados.password} onChange={mudar('password')} />
              </div>

              {dados.papel === 'produtor' && (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="localidade">Concelho</label>
                    <SelectLocalidade
                      id="localidade"
                      valor={dados.localidade}
                      aoMudar={(valor) => setDados({ ...dados, localidade: valor })}
                      obrigatorio
                    />
                    <small className="text-black-50">É o que os compradores veem e por onde o encontram nos filtros.</small>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="telefone">Telefone</label>
                    <input id="telefone" className="form-control" value={dados.telefone} onChange={mudar('telefone')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="descricao">Apresentação</label>
                    <textarea id="descricao" className="form-control" rows="3" value={dados.descricao} onChange={mudar('descricao')} />
                  </div>
                  <div className="col-12">
                    <div className="alert alert-warning py-2 mb-0 small">
                      O registo de produtor fica <strong>pendente</strong> até o administrador o validar.
                      Até lá pode preparar os produtos, mas não aparecem no catálogo.
                    </div>
                  </div>
                </>
              )}
            </div>

            {erro && <div className="alert alert-danger py-2 mt-3">{erro}</div>}

            <button className="btn btn-verde w-100 mt-3" disabled={aEnviar}>
              {aEnviar ? 'A criar conta…' : 'Criar conta'}
            </button>
          </form>

          <p className="small text-center mt-3 mb-0">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
