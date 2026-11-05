import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dataPt, euros } from '../servicos/api';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';
import Estrelas from '../componentes/Estrelas';

export default function Produto() {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState('');

  const { adicionar } = useCarrinho();
  const { papel, temSessao } = useAuth();
  const { sucesso, erro: avisarErro } = useAvisos();

  useEffect(() => {
    api.get(`/products/${id}`).then(setProduto).catch((e) => setErro(e.message));
    api.get(`/products/${id}/reviews`).then(setAvaliacoes).catch(() => {});
  }, [id]);

  async function denunciar(avaliacaoId) {
    try {
      await api.post(`/reviews/${avaliacaoId}/denunciar`);
      sucesso('Avaliação enviada para moderação do administrador.');
    } catch (e) {
      avisarErro(e.message);
    }
  }

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!produto) return <p className="text-center py-5">A carregar…</p>;

  return (
    <>
      <nav aria-label="Caminho" className="mb-3 small">
        <Link to="/">Catálogo</Link> · <span className="text-black-50">{produto.nome}</span>
      </nav>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <img
            className="img-fluid rounded w-100"
            style={{ aspectRatio: '4 / 3', objectFit: 'cover' }}
            src={produto.imagem || '/sem-imagem.svg'}
            alt={produto.nome}
            onError={(e) => { e.currentTarget.src = '/sem-imagem.svg'; }}
          />
        </div>

        <div className="col-12 col-lg-6">
          <div className="painel">
            <h1 className="h3">{produto.nome}</h1>

            {produto.produtor && (
              <p className="mb-2">
                de <Link to={`/produtores/${produto.produtor._id}`}>{produto.produtor.nome}</Link>
                {produto.produtor.localidade && ` · ${produto.produtor.localidade}`}
              </p>
            )}

            <div className="d-flex gap-1 flex-wrap mb-2">
              <span className="etiqueta etiqueta-epoca">{produto.categoria}</span>
              <span className="etiqueta etiqueta-epoca">{produto.epoca}</span>
              {produto.biologico && <span className="etiqueta etiqueta-bio">biológico</span>}
            </div>

            {produto.numAvaliacoes > 0 && (
              <p className="mb-2"><Estrelas nota={produto.notaMedia} total={produto.numAvaliacoes} /></p>
            )}

            <p className="text-black-50">{produto.descricao}</p>

            <p className="preco h3 text-success">
              {euros(produto.preco)} <small className="text-black-50 fs-6 fw-normal">/ {produto.unidade}</small>
            </p>
            <p className={produto.stock > 0 ? 'text-black-50' : 'text-danger fw-bold'}>
              {produto.stock > 0 ? `${produto.stock} ${produto.unidade} disponíveis` : 'Esgotado'}
            </p>

            {(papel === 'comprador' || papel === 'visitante') && produto.stock > 0 && (
              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="form-control"
                  style={{ maxWidth: 100 }}
                  min="1"
                  max={produto.stock}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
                <button
                  className="btn btn-verde flex-grow-1"
                  onClick={() => {
                    adicionar(produto, quantidade);
                    sucesso(`${quantidade} × ${produto.nome} no carrinho.`);
                  }}
                >
                  Adicionar ao carrinho
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      <section className="mt-4">
        <h2 className="h5">Avaliações</h2>
        {avaliacoes.length === 0 && <p className="text-black-50">Ainda não há avaliações deste produto.</p>}

        <div className="row g-2">
          {avaliacoes.map((a) => (
            <div className="col-12 col-md-6" key={a._id}>
              <div className="painel h-100">
                <div className="d-flex justify-content-between align-items-start">
                  <strong>{a.nome}</strong>
                  <Estrelas nota={a.nota} />
                </div>
                <p className="mb-1">{a.comentario}</p>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-black-50">{dataPt(a.createdAt)}</small>
                  {temSessao && (
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => denunciar(a._id)}>
                      denunciar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
