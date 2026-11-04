import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, dataPt } from '../servicos/api';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useAuth } from '../contexto/AuthContext';
import CartaoProduto from '../componentes/CartaoProduto';
import Estrelas from '../componentes/Estrelas';

export default function PaginaProdutor() {
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const { adicionar } = useCarrinho();
  const { papel } = useAuth();

  useEffect(() => {
    api.get(`/producers/${id}`).then(setDados).catch((e) => setErro(e.message));
  }, [id]);

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!dados) return <p className="text-center py-5">A carregar…</p>;

  const { produtor, produtos, avaliacoes } = dados;
  const temMapa = produtor.latitude && produtor.longitude;
  const notaMedia = avaliacoes.length
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : 0;

  // Mapa embebido do OpenStreetMap (não precisa de chave nem de biblioteca extra)
  const urlMapa = temMapa
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${produtor.longitude - 0.02}%2C${produtor.latitude - 0.015}%2C${produtor.longitude + 0.02}%2C${produtor.latitude + 0.015}&layer=mapnik&marker=${produtor.latitude}%2C${produtor.longitude}`
    : null;

  return (
    <>
      <section className="destaque">
        <h1>{produtor.nome}</h1>
        <p className="mb-1">📍 {produtor.localidade} {produtor.telefone && `· ☎ ${produtor.telefone}`}</p>
        {avaliacoes.length > 0 && (
          <p className="mb-0">
            <Estrelas nota={Number(notaMedia)} total={avaliacoes.length} /> <span className="ms-1">{notaMedia} / 5</span>
          </p>
        )}
      </section>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <div className="painel h-100">
            <h2 className="h6">Sobre o produtor</h2>
            <p className="mb-0">{produtor.descricao || 'Este produtor ainda não escreveu uma apresentação.'}</p>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="painel h-100">
            <h2 className="h6">Onde fica</h2>
            {urlMapa ? (
              <>
                <iframe className="mapa" title={`Mapa de ${produtor.nome}`} src={urlMapa} loading="lazy" />
                <a
                  className="small d-block mt-2"
                  href={`https://www.openstreetmap.org/?mlat=${produtor.latitude}&mlon=${produtor.longitude}#map=14/${produtor.latitude}/${produtor.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir mapa numa janela nova
                </a>
              </>
            ) : (
              <p className="text-black-50 mb-0">Este produtor ainda não indicou as coordenadas.</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="h5 mb-2">Produtos ({produtos.length})</h2>
      <div className="grelha-produtos mb-4">
        {produtos.map((p) => (
          <CartaoProduto
            key={p._id}
            produto={p}
            onAdicionar={papel === 'comprador' || papel === 'visitante' ? adicionar : undefined}
          />
        ))}
      </div>

      <h2 className="h5 mb-2">Avaliações recebidas</h2>
      {avaliacoes.length === 0 && <p className="text-black-50">Ainda sem avaliações.</p>}
      <div className="row g-2">
        {avaliacoes.map((a) => (
          <div className="col-12 col-md-6" key={a._id}>
            <div className="painel h-100">
              <div className="d-flex justify-content-between">
                <strong>{a.nome}</strong>
                <Estrelas nota={a.nota} />
              </div>
              <div className="mb-1">
                <span className={`etiqueta ${a.produto ? 'etiqueta-epoca' : 'etiqueta-bio'}`}>
                  {a.produto ? a.produto.nome : 'ao produtor'}
                </span>
              </div>
              <p className="mb-1">{a.comentario}</p>
              <small className="text-black-50">{dataPt(a.createdAt)}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
