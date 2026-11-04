import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, euros } from '../servicos/api';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useAuth } from '../contexto/AuthContext';

export default function Carrinho() {
  const { linhas, alterarQuantidade, remover, limpar, total } = useCarrinho();
  const { temSessao, papel } = useAuth();
  const navegar = useNavigate();

  const [entrega, setEntrega] = useState({ tipo: 'levantamento', morada: '' });
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  async function finalizar() {
    setErro('');
    setAEnviar(true);
    try {
      await api.post('/orders', {
        linhas: linhas.map((l) => ({ produto: l.produto._id, quantidade: l.quantidade })),
        entrega,
      });
      limpar();
      navegar('/encomendas');
    } catch (e) {
      setErro(e.message);
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
                <tr><th>Produto</th><th>Preço</th><th>Qtd.</th><th>Subtotal</th><th /></tr>
              </thead>
              <tbody>
                {linhas.map(({ produto, quantidade }) => (
                  <tr key={produto._id}>
                    <td>
                      <Link to={`/produtos/${produto._id}`} className="text-dark fw-semibold">{produto.nome}</Link>
                      <div className="small text-black-50">{produto.produtor?.nome}</div>
                    </td>
                    <td>{euros(produto.preco)}</td>
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
              <textarea
                className="form-control mb-2"
                rows="2"
                placeholder="Morada de entrega"
                value={entrega.morada}
                onChange={(e) => setEntrega({ ...entrega, morada: e.target.value })}
              />
            )}

            {erro && <div className="alert alert-danger py-2">{erro}</div>}

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
                disabled={aEnviar || (entrega.tipo === 'entrega' && !entrega.morada)}
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
