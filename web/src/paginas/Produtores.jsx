import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';
import SelectLocalidade from '../componentes/SelectLocalidade';

export default function Produtores() {
  const [produtores, setProdutores] = useState([]);
  const [filtro, setFiltro] = useState({ q: '', localidade: '' });
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    setACarregar(true);
    const temporizador = setTimeout(() => {
      const parametros = new URLSearchParams();
      if (filtro.q) parametros.set('q', filtro.q);
      if (filtro.localidade) parametros.set('localidade', filtro.localidade);

      api.get(`/producers?${parametros}`)
        .then(setProdutores)
        .catch(() => {})
        .finally(() => setACarregar(false));
    }, 300);

    return () => clearTimeout(temporizador);
  }, [filtro]);

  return (
    <>
      <h1 className="h4 mb-3">Produtores da região</h1>

      <section className="filtros">
        <div className="row g-2">
          <div className="col-12 col-md-7">
            <label className="form-label small mb-1" htmlFor="pesquisa">Pesquisar produtor</label>
            <input
              id="pesquisa"
              className="form-control"
              placeholder="Nome do produtor…"
              value={filtro.q}
              onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
            />
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small mb-1" htmlFor="localidade">Localidade</label>
            <SelectLocalidade
              id="localidade"
              valor={filtro.localidade}
              aoMudar={(valor) => setFiltro({ ...filtro, localidade: valor })}
              textoVazio="Todas as localidades"
            />
          </div>
        </div>
      </section>

      {aCarregar && <p className="text-center py-4 text-black-50">A carregar produtores…</p>}

      <div className="grelha-produtores">
        {produtores.map((p) => (
          <article className="painel h-100 d-flex flex-column" key={p._id}>
            <h2 className="h6 mb-1">{p.nome}</h2>
            <p className="text-black-50 small mb-2">{p.localidade || 'Localidade não indicada'}</p>
            <p className="small flex-grow-1">{p.descricao}</p>
            <Link className="btn btn-outline-success btn-sm" to={`/produtores/${p._id}`}>
              Ver página pública
            </Link>
          </article>
        ))}
      </div>

      {!aCarregar && produtores.length === 0 && (
        <div className="painel text-center py-5">
          {filtro.localidade ? (
            <>
              <p className="h5 mb-2">Ainda não há produtores em {filtro.localidade}.</p>
              <p className="text-black-50 mb-3">
                A plataforma está a crescer concelho a concelho. Experimente outra
                localidade ou veja todos os produtores.
              </p>
              <button className="btn btn-verde" onClick={() => setFiltro({ ...filtro, localidade: '' })}>
                Ver todas as localidades
              </button>
            </>
          ) : (
            <p className="h5 mb-0">Nenhum produtor corresponde à pesquisa.</p>
          )}
        </div>
      )}
    </>
  );
}
