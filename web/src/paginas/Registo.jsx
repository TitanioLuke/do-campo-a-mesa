import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { coordenadasDe } from '../dados/concelhos';
import SelectLocalidade from '../componentes/SelectLocalidade';
import CampoPassword from '../componentes/CampoPassword';
import { useAvisos } from '../contexto/AvisosContext';
import { emailValido, vazio } from '../servicos/validacao';

export default function Registo() {
  const [dados, setDados] = useState({
    nome: '', email: '', password: '', papel: 'comprador',
    localidade: '', descricao: '', telefone: '', morada: '',
  });
  const [aEnviar, setAEnviar] = useState(false);
  const [tentou, setTentou] = useState(false);

  const { registar, temSessao, papel } = useAuth();
  const { sucesso, erro } = useAvisos();
  const navegar = useNavigate();

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  // Quem já tem sessão iniciada não precisa do formulário de registo
  if (temSessao) {
    return <Navigate to={{ produtor: '/produtor', admin: '/admin' }[papel] || '/'} replace />;
  }

  const eProdutor = dados.papel === 'produtor';

  // Validação própria, por baixo de cada campo (ver servicos/validacao.js)
  const problemas = {
    nome: vazio(dados.nome)
      ? (eProdutor ? 'Escreva o nome do produtor ou da quinta.' : 'Escreva o seu nome.')
      : '',
    email: vazio(dados.email) ? 'Escreva o seu email.'
      : emailValido(dados.email) ? '' : 'Esse email não parece válido.',
    password: vazio(dados.password) ? 'Escolha uma password.'
      : dados.password.length < 6 ? 'A password tem de ter pelo menos 6 caracteres.'
      : '',
    // Só o produtor escolhe concelho: é por ele que aparece nos filtros e no mapa
    localidade: eProdutor && vazio(dados.localidade) ? 'Escolha o concelho.' : '',
  };
  const formularioValido = !Object.values(problemas).some(Boolean);
  const classe = (problema) => `form-control${tentou && problema ? ' is-invalid' : ''}`;

  async function submeter(evento) {
    evento.preventDefault();
    setTentou(true);
    if (!formularioValido) return erro('Há campos por corrigir no formulário.');

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

          <form onSubmit={submeter} noValidate>
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
                <label className="form-label" htmlFor="nome">{eProdutor ? 'Nome do produtor / quinta' : 'Nome'}</label>
                <input id="nome" className={classe(problemas.nome)} required value={dados.nome} onChange={mudar('nome')} />
                {tentou && problemas.nome && <small className="text-danger">{problemas.nome}</small>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className={classe(problemas.email)} required value={dados.email} onChange={mudar('email')} />
                {tentou && problemas.email && <small className="text-danger">{problemas.email}</small>}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="password">Password (mín. 6 caracteres)</label>
                <CampoPassword
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className={classe(problemas.password)}
                  valor={dados.password}
                  aoMudar={(valor) => setDados({ ...dados, password: valor })}
                />
                {tentou && problemas.password && <small className="text-danger">{problemas.password}</small>}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="telefone">Telefone <span className="text-black-50">(opcional)</span></label>
                <input id="telefone" className="form-control" value={dados.telefone} onChange={mudar('telefone')} />
              </div>

              {!eProdutor && (
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
                </div>
              )}

              {eProdutor && (
                <>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="localidade">Concelho</label>
                    <SelectLocalidade
                      id="localidade"
                      valor={dados.localidade}
                      aoMudar={(valor) => setDados({ ...dados, localidade: valor })}
                      obrigatorio
                      invalido={tentou && !!problemas.localidade}
                    />
                    {tentou && problemas.localidade && <small className="text-danger">{problemas.localidade}</small>}
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
