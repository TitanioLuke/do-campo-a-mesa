import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { coordenadasDe } from '../dados/concelhos';
import SelectLocalidade from '../componentes/SelectLocalidade';
import CampoPassword from '../componentes/CampoPassword';
import { useAvisos } from '../contexto/AvisosContext';

export default function Registo() {
  const [dados, setDados] = useState({
    nome: '', email: '', password: '', papel: 'comprador',
    localidade: '', descricao: '', telefone: '', morada: '',
  });
  const [aEnviar, setAEnviar] = useState(false);

  const { registar, temSessao, papel } = useAuth();
  const { sucesso, erro } = useAvisos();
  const navegar = useNavigate();

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  // Quem já tem sessão iniciada não precisa do formulário de registo
  if (temSessao) {
    return <Navigate to={{ produtor: '/produtor', admin: '/admin' }[papel] || '/'} replace />;
  }

  async function submeter(evento) {
    evento.preventDefault();
    setAEnviar(true);
    try {
      const corpo = { ...dados };
      if (corpo.papel === 'comprador') {
        delete corpo.localidade; delete corpo.descricao;
      } else {
        delete corpo.morada;
        // As coordenadas do mapa saem do concelho escolhido; ninguém as escreve
        Object.assign(corpo, coordenadasDe(corpo.localidade) ?? {});
      }
      const utilizador = await registar(corpo);
      sucesso(`Conta criada. Bem-vindo, ${utilizador.nome}.`);
      navegar(utilizador.papel === 'produtor' ? '/produtor' : '/', { replace: true });
    } catch (e) {
      erro(e.message);
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
                <CampoPassword
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  valor={dados.password}
                  aoMudar={(valor) => setDados({ ...dados, password: valor })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="telefone">Telefone <span className="text-black-50">(opcional)</span></label>
                <input id="telefone" className="form-control" value={dados.telefone} onChange={mudar('telefone')} />
              </div>

              {dados.papel === 'comprador' && (
                <div className="col-12">
                  <label className="form-label" htmlFor="morada">Morada <span className="text-black-50">(opcional)</span></label>
                  <textarea
                    id="morada"
                    className="form-control"
                    rows="2"
                    placeholder="Rua, número, código postal e localidade"
                    value={dados.morada}
                    onChange={mudar('morada')}
                  />
                  <small className="text-black-50">
                    Fica guardada no seu perfil e aparece já preenchida quando escolher entrega ao domicílio.
                    Pode sempre usar outra morada numa encomenda.
                  </small>
                </div>
              )}

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
