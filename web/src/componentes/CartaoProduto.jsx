import { Link } from 'react-router-dom';
import { euros, imagemUrl } from '../servicos/api';
import Estrelas from './Estrelas';

/** Cartão reutilizável do catálogo e da página do produtor. */
export default function CartaoProduto({ produto, onAdicionar }) {
  const semStock = produto.stock <= 0;

  return (
    <article className="cartao-produto">
      <Link to={`/produtos/${produto._id}`}>
        <img
          className="imagem"
          src={imagemUrl(produto.imagem)}
          alt={produto.nome}
          onError={(e) => { e.currentTarget.src = '/sem-imagem.svg'; }}
        />
      </Link>

      <div className="corpo">
        <h3 className="titulo">
          <Link to={`/produtos/${produto._id}`} className="text-dark">{produto.nome}</Link>
        </h3>

        {produto.produtor?.nome && (
          <p className="produtor-nome mb-0">
            {produto.produtor.nome}
            {produto.produtor.localidade && ` · ${produto.produtor.localidade}`}
          </p>
        )}

        <div className="d-flex gap-1 flex-wrap">
          {produto.biologico && <span className="etiqueta etiqueta-bio">biológico</span>}
          <span className="etiqueta etiqueta-epoca">{produto.epoca}</span>
        </div>

        {produto.numAvaliacoes > 0 && <Estrelas nota={produto.notaMedia} total={produto.numAvaliacoes} />}

        <p className="preco mb-0 mt-auto pt-2">
          {euros(produto.preco)} <small className="text-black-50 fw-normal">/ {produto.unidade}</small>
        </p>

        <small className={semStock ? 'text-danger' : 'text-black-50'}>
          {semStock ? 'Esgotado' : `${produto.stock} ${produto.unidade} em stock`}
        </small>

        {onAdicionar && (
          <button className="btn btn-verde w-100 mt-2" disabled={semStock} onClick={() => onAdicionar(produto)}>
            Adicionar ao carrinho
          </button>
        )}
      </div>
    </article>
  );
}
