import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, euros } from '../servicos/api';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';

export default function Carrinho() {
  const { linhas, alterarQuantidade, remover, limpar, total } = useCarrinho();
  const { temSessao, papel, utilizador } = useAuth();
  const navegar = useNavigate();

  const [entrega, setEntrega] = useState({ tipo: 'levantamento', morada: '' });
  // Quem guardou a morada no registo escolhe entre essa e uma morada nova.
  const [origemMorada, setOrigemMorada] = useState('registo');
  const moradaDoRegisto = utilizador?.morada?.trim() || '';
  const moradaEscolhida = origemMorada === 'registo' && moradaDoRegisto ? moradaDoRegisto : entrega.morada;
  const { sucesso, erro } = useAvisos();
  const [aEnviar, setAEnviar] = useState(false);

  async function finalizar() {
    setAEnviar(true);
    try {
      const encomendas = await api.post('/orders', {
        linhas: linhas.map((l) => ({ produto: l.produto._id, quantidade: l.quantidade })),
        // A encomenda guarda uma CÓPIA da morada, como já faz com o nome e o
        // preço dos produtos: mudar o perfil mais tarde não reescreve o passado.
        entrega: {
          tipo: entrega.tipo,
          morada: entrega.tipo === 'entrega' ? moradaEscolhida : '',
        },
      });
      limpar();
      sucesso(
        encomendas.length > 1
          ? `${encomendas.length} encomendas criadas, uma por produtor.`
          : 'Encomenda criada. O produtor vai confirmá-la.'
      );
      navegar('/encomendas');
    } catch (e) {
      erro(e.message);
    } finally {
      setAEnviar(false);
    }
  }

  if (linhas.length === 0) {
    return (
      <div className="text-center py-5">
        <h1 className="h4">O carrinho está vazio</h1>
        <p className="text-black-50">Explore o catálogo e junte produtos ao carrinho.</p>
        <Link className="btn btn-verde" to="/">Ver catálogo</Link>
      </div>
    );
  }

  // Agrupar por produtor: será criada uma encomenda por cada um
  const produtores = [...new Set(linhas.map((l) => l.produto.produtor?.nome || 'Produtor'))];

  return (
    <>
      <h1 className="h4 mb-3">Carrinho</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="painel">
            <table className="tabela-simples">
              <thead>
                <tr>
                  <th>Produto</th>
                  {/* o preço unitário sai no telemóvel: o subtotal é o que interessa */}
                  <th className="d-none d-md-table-cell">Preço</th>
                  <th>Qtd.</th><th>Subtotal</th><th />
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ produto, quantidade }) => (
                  <tr key={produto._id}>
                    <td>
                      <Link to={`/produtos/${produto._id}`} className="text-dark fw-semibold">{produto.nome}</Link>
                      <div className="small text-black-50">{produto.produtor?.nome}</div>
                    </td>
                    <td className="d-none d-md-table-cell">{euros(produto.preco)}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 70 }}
                        min="1"
                        max={produto.stock}
                        value={quantidade}
                        onChange={(e) => alterarQuantidade(produto._id, Number(e.target.value))}
                      />
                    </td>
                    <td className="fw-bold">{euros(produto.preco * quantidade)}</td>
                    <td>
                      <button className="btn btn-sm btn-link text-danger p-0" onClick={() => remover(produto._id)}>
                        remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="btn btn-sm btn-outline-secondary mt-3" onClick={limpar}>Esvaziar carrinho</button>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="painel">
            <h2 className="h6">Resumo</h2>
            <p className="d-flex justify-content-between mb-1">
              <span>Total</span><strong className="text-success fs-5">{euros(total)}</strong>
            </p>
            <p className="small text-black-50">
              {produtores.length > 1
                ? `Serão criadas ${produtores.length} encomendas, uma por produtor (${produtores.join(', ')}).`
                : `Encomenda a ${produtores[0]}.`}
            </p>

            <hr />

            <label className="form-label small mb-1" htmlFor="tipo">Entrega</label>
            <select
              id="tipo"
              className="form-select mb-2"
              value={entrega.tipo}
              onChange={(e) => setEntrega({ ...entrega, tipo: e.target.value })}
            >
              <option value="levantamento">Levantamento no produtor</option>
              <option value="entrega">Entrega na morada</option>
            </select>

            {entrega.tipo === 'entrega' && (
              <div className="mb-2">
                {moradaDoRegisto && (
                  <>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="origem-morada"
                        id="morada-registo"
                        checked={origemMorada === 'registo'}
                        onChange={() => setOrigemMorada('registo')}
                      />
                      <label className="form-check-label small" htmlFor="morada-registo">
                        A morada do meu registo
                      </label>
                    </div>

                    {origemMorada === 'registo' && (
                      <div className="border rounded bg-light p-2 small my-1">
                        {moradaDoRegisto}
                        <Link className="d-block" to="/perfil">Alterar no perfil</Link>
                      </div>
                    )}

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="origem-morada"
                        id="morada-nova"
                        checked={origemMorada === 'nova'}
                        onChange={() => setOrigemMorada('nova')}
                      />
                      <label className="form-check-label small" htmlFor="morada-nova">
                        Entregar noutra morada
                      </label>
                    </div>
                  </>
                )}

                {(!moradaDoRegisto || origemMorada === 'nova') && (
                  <>
                    <textarea
                      className="form-control mt-1"
                      rows="2"
                      placeholder="Rua, número, código postal e localidade"
                      value={entrega.morada}
                      onChange={(e) => setEntrega({ ...entrega, morada: e.target.value })}
                    />
                    {!moradaDoRegisto && temSessao && papel === 'comprador' && (
                      <small className="text-black-50">
                        Guarde a morada no <Link to="/perfil">seu perfil</Link> para não a escrever de cada vez.
                      </small>
                    )}
                  </>
                )}
              </div>
            )}

            {!temSessao ? (
              <Link className="btn btn-verde w-100" to="/login" state={{ de: '/carrinho' }}>
                Entrar para finalizar
              </Link>
            ) : papel !== 'comprador' ? (
              <div className="alert alert-secondary py-2 mb-0 small">
                Só as contas de comprador podem fazer encomendas.
              </div>
            ) : (
              <button
                className="btn btn-verde w-100"
                disabled={aEnviar || (entrega.tipo === 'entrega' && !moradaEscolhida.trim())}
                onClick={finalizar}
              >
                {aEnviar ? 'A enviar…' : 'Finalizar encomenda'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
