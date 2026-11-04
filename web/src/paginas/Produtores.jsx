import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../servicos/api';

export default function Produtores() {
  const [produtores, setProdutores] = useState([]);
  const [pesquisa, setPesquisa] = useState('');

  useEffect(() => {
    const temporizador = setTimeout(() => {
      api.get(`/producers?q=${encodeURIComponent(pesquisa)}`).then(setProdutores).catch(() => {});
    }, 300);
    return () => clearTimeout(temporizador);
  }, [pesquisa]);

  return (
    <>
      <h1 className="h4 mb-3">Produtores da região</h1>

      <div className="filtros">
        <label className="form-label small mb-1" htmlFor="pesquisa">Pesquisar produtor</label>
        <input
          id="pesquisa"
          className="form-control"
          placeholder="Nome do produtor…"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />
      </div>

      <div className="grelha-produtores">
        {produtores.map((p) => (
          <article className="painel h-100 d-flex flex-column" key={p._id}>
            <h2 className="h6 mb-1">{p.nome}</h2>
            <p className="text-black-50 small mb-2">📍 {p.localidade || 'Localidade não indicada'}</p>
            <p className="small flex-grow-1">{p.descricao}</p>
            <Link className="btn btn-outline-success btn-sm" to={`/produtores/${p._id}`}>
              Ver página pública
            </Link>
          </article>
        ))}
      </div>

      {produtores.length === 0 && (
        <div className="alert alert-light border text-center">Nenhum produtor encontrado.</div>
      )}
    </>
  );
}
