import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataPt, euros } from '../servicos/api';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';

/**
 * Perfil do comprador: os seus dados e um resumo das compras.
 * O email e o papel não se alteram aqui — o email identifica a conta e o papel
 * é decidido no registo —, por isso aparecem só para consulta.
 */
export default function PerfilComprador() {
  const { utilizador, atualizar } = useAuth();
  const { sucesso, erro } = useAvisos();

  const [dados, setDados] = useState({
    nome: utilizador.nome,
    telefone: utilizador.telefone || '',
    morada: utilizador.morada || '',
  });
  const [encomendas, setEncomendas] = useState([]);
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  // O botão só fica ativo se houver mesmo alguma coisa alterada
  const alterado =
    dados.nome !== utilizador.nome ||
    dados.telefone !== (utilizador.telefone || '') ||
    dados.morada !== (utilizador.morada || '');

  useEffect(() => {
    api.get('/orders').then(setEncomendas).catch(() => {});
  }, []);

  const entregues = encomendas.filter((e) => e.estado === 'entregue');
  const emCurso = encomendas.filter((e) => e.estado !== 'entregue');
  const totalGasto = entregues.reduce((soma, e) => soma + e.total, 0);
  const produtores = new Set(encomendas.map((e) => e.produtor?._id)).size;

  const indicadores = [
    ['Encomendas', encomendas.length],
    ['Em curso', emCurso.length],
    ['Produtores', produtores],
    ['Total comprado', euros(totalGasto)],
  ];

  async function submeter(evento) {
    evento.preventDefault();
    setAGuardar(true);
    try {
      atualizar(await api.put('/auth/me', dados));
      sucesso('Perfil atualizado.');
    } catch (e) {
      erro(e.message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <>
      <h1 className="h4 mb-3">O meu perfil</h1>

      <div className="grelha-indicadores mb-4">
        {indicadores.map(([rotulo, valor]) => (
          <div className="indicador" key={rotulo}>
            <div className="valor">{valor}</div>
            <div className="rotulo">{rotulo}</div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="painel h-100">
            <h2 className="h6">Os meus dados</h2>

            <form onSubmit={submeter}>
              <div className="mb-3">
                <label className="form-label small mb-1" htmlFor="nome">Nome</label>
                <input id="nome" className="form-control" required value={dados.nome} onChange={mudar('nome')} />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1" htmlFor="email">Email</label>
                <input id="email" className="form-control" value={utilizador.email} disabled />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1" htmlFor="telefone">Telefone</label>
                <input id="telefone" className="form-control" value={dados.telefone} onChange={mudar('telefone')} />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1" htmlFor="morada">Morada</label>
                <textarea
                  id="morada"
                  className="form-control"
                  rows="2"
                  placeholder="Rua, número, código postal e localidade"
                  value={dados.morada}
                  onChange={mudar('morada')}
                />
              </div>

              <p className="small text-black-50">
                Conta de <strong>{utilizador.papel}</strong>, criada a {dataPt(utilizador.createdAt)}.
              </p>

              <button className="btn btn-verde" disabled={aGuardar || !alterado}>
                {aGuardar ? 'A guardar…' : 'Guardar alterações'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="painel h-100">
            <h2 className="h6">Encomendas recentes</h2>

            {encomendas.length === 0 ? (
              <>
                <p className="text-black-50 small">Ainda não fez nenhuma encomenda.</p>
                <Link className="btn btn-sm btn-verde" to="/">Ver catálogo</Link>
              </>
            ) : (
              <>
                <table className="tabela-simples">
                  <tbody>
                    {encomendas.slice(0, 5).map((e) => (
                      <tr key={e._id}>
                        <td>
                          {e.produtor?.nome}
                          <div className="small text-black-50">{dataPt(e.createdAt)}</div>
                        </td>
                        <td className="text-end">
                          {euros(e.total)}
                          <div className="small text-black-50">{e.estado}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link className="btn btn-sm btn-outline-success mt-3" to="/encomendas">
                  Ver todas as encomendas
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
