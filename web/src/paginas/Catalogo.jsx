import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';
import CartaoProduto from '../componentes/CartaoProduto';
import CartaoLeilao from '../componentes/CartaoLeilao';
import FiltrosCatalogo from '../componentes/FiltrosCatalogo';

const FILTRO_INICIAL = {
  q: '', categoria: 'Todas', epoca: 'Todas', produtor: '', localidade: '', precoMax: '', bio: false, ordenar: 'recentes',
};

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [produtores, setProdutores] = useState([]);
  const [leiloes, setLeiloes] = useState([]);
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [aCarregar, setACarregar] = useState(true);

  const { adicionar } = useCarrinho();
  const { papel } = useAuth();
  const { erro } = useAvisos();

  // Leilões em destaque e lista de produtores para o filtro (só ao abrir a página)
  useEffect(() => {
    api.get('/auctions?estado=ativo').then(setLeiloes).catch(() => {});
    api.get('/producers').then(setProdutores).catch(() => {});
  }, []);

  // Sempre que um filtro muda, volta a pedir os produtos à API.
  // O setTimeout evita um pedido por cada tecla escrita na pesquisa.
  useEffect(() => {
    setACarregar(true);
    const temporizador = setTimeout(() => {
      const parametros = new URLSearchParams();
      if (filtro.q) parametros.set('q', filtro.q);
      if (filtro.categoria !== 'Todas') parametros.set('categoria', filtro.categoria);
      if (filtro.epoca !== 'Todas') parametros.set('epoca', filtro.epoca);
      if (filtro.produtor) parametros.set('produtor', filtro.produtor);
      if (filtro.localidade) parametros.set('localidade', filtro.localidade);
      if (filtro.precoMax) parametros.set('precoMax', filtro.precoMax);
      if (filtro.bio) parametros.set('bio', 'true');
      parametros.set('ordenar', filtro.ordenar);

      api.get(`/products?${parametros}`)
        .then(setProdutos)
        .catch((e) => erro(e.message))
        .finally(() => setACarregar(false));
    }, 300);

    return () => clearTimeout(temporizador);
  }, [filtro, erro]);

  const podeComprar = papel === 'comprador' || papel === 'visitante';

  return (
    <>
      <section className="destaque">
        <h1>Produtos locais, direto de quem os produz</h1>
        <p className="mb-0 col-lg-8">
          Hortícolas, fruta, mel, vinho e queijo de pequenos produtores da região.
          Encomende para levantamento ou entrega — e licite nos lotes em leilão direto.
        </p>
      </section>

      {leiloes.length > 0 && (
        <section className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h5 mb-0"><span className="ponto ponto-direto" />Leilões em direto</h2>
            <Link to="/leiloes" className="small">Ver todos</Link>
          </div>
          <div className="grelha-leiloes">
            {leiloes.slice(0, 3).map((l) => <CartaoLeilao key={l._id} leilao={l} />)}
          </div>
        </section>
      )}

      <h2 className="h5 mb-2">Catálogo</h2>
      <FiltrosCatalogo
        filtro={filtro}
        produtores={produtores}
        aoMudar={setFiltro}
        aoLimpar={() => setFiltro(FILTRO_INICIAL)}
        numResultados={produtos.length}
      />

      {aCarregar && <p className="text-center py-4 text-black-50">A carregar produtos…</p>}

      {!aCarregar && produtos.length === 0 && (
        <div className="painel text-center py-5">
          {filtro.localidade ? (
            <>
              <p className="h5 mb-2">Ainda não há produtores em {filtro.localidade}.</p>
              <p className="text-black-50 mb-3">
                A plataforma está a crescer concelho a concelho. Experimente outra
                localidade ou veja o catálogo completo.
              </p>
              <button className="btn btn-verde" onClick={() => setFiltro({ ...filtro, localidade: '' })}>
                Ver todas as localidades
              </button>
            </>
          ) : (
            <>
              <p className="h5 mb-2">Nenhum produto corresponde aos filtros escolhidos.</p>
              <button className="btn btn-outline-secondary" onClick={() => setFiltro(FILTRO_INICIAL)}>
                Limpar filtros
              </button>
            </>
          )}
        </div>
      )}

      <div className="grelha-produtos">
        {produtos.map((produto) => (
          <CartaoProduto
            key={produto._id}
            produto={produto}
            onAdicionar={podeComprar ? adicionar : undefined}
          />
        ))}
      </div>
    </>
  );
}
