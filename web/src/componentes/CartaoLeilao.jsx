import { Link } from 'react-router-dom';
import { euros } from '../servicos/api';
import Contador from './Contador';

/** Resumo de um leilão, usado nas listagens. */
export default function CartaoLeilao({ leilao }) {
  const terminado = leilao.estado === 'terminado';

  return (
    <article className="cartao-produto">
      <img
        className="imagem"
        src={leilao.imagem || '/sem-imagem.svg'}
        alt={leilao.lote}
        onError={(e) => { e.currentTarget.src = '/sem-imagem.svg'; }}
      />
      <div className="corpo">
        <h3 className="titulo">{leilao.lote}</h3>
        {leilao.produtor?.nome && <p className="produtor-nome mb-0">{leilao.produtor.nome}</p>}

        <p className="preco mb-0">{euros(leilao.licitacaoAtual.valor)}</p>
        <small className="text-black-50">
          {leilao.licitacaoAtual.nome ? `Melhor licitação: ${leilao.licitacaoAtual.nome}` : 'Ainda sem licitações'}
        </small>

        <div className="mt-2">
          {terminado ? (
            <span className="etiqueta estado-entregue">terminado</span>
          ) : (
            <Contador terminaEm={leilao.terminaEm} />
          )}
        </div>

        <Link to={`/leiloes/${leilao._id}`} className="btn btn-terracota w-100 mt-2">
          {terminado ? 'Ver resultado' : 'Entrar na sala'}
        </Link>
      </div>
    </article>
  );
}
