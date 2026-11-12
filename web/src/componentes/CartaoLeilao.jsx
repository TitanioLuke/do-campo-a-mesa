import { Link } from 'react-router-dom';
import { euros, imagemUrl } from '../servicos/api';
import Contador from './Contador';

/** Resumo de um leilão, usado nas listagens. Os três estados têm aspeto próprio. */
export default function CartaoLeilao({ leilao }) {
  const { estado } = leilao;

  return (
    <article className="cartao-produto">
      <img
        className="imagem"
        src={imagemUrl(leilao.imagem)}
        alt={leilao.lote}
        onError={(e) => { e.currentTarget.src = '/sem-imagem.svg'; }}
      />

      <div className="corpo">
        <h3 className="titulo">{leilao.lote}</h3>
        {leilao.produtor?.nome && <p className="produtor-nome mb-0">{leilao.produtor.nome}</p>}

        <p className="preco mb-0">{euros(leilao.licitacaoAtual.valor)}</p>
        <small className="text-black-50">
          {estado === 'agendado'
            ? 'preço base'
            : leilao.licitacaoAtual.nome
              ? `Melhor licitação: ${leilao.licitacaoAtual.nome}`
              : 'Ainda sem licitações'}
        </small>

        <div className="mt-2">
          {estado === 'agendado' && (
            <>
              <span className="etiqueta estado-pendente">agendado</span>
              <div className="small text-black-50 mt-1">Começa em</div>
              <Contador terminaEm={leilao.comecaEm} />
            </>
          )}

          {estado === 'ativo' && (
            <>
              <span className="ponto ponto-direto" />
              <span className="small text-black-50">Termina em</span>
              <div><Contador terminaEm={leilao.terminaEm} /></div>
            </>
          )}

          {estado === 'terminado' && <span className="etiqueta estado-entregue">terminado</span>}
        </div>

        <Link to={`/leiloes/${leilao._id}`} className="btn btn-terracota w-100 mt-2">
          {estado === 'terminado' ? 'Ver resultado' : estado === 'agendado' ? 'Ver o lote' : 'Entrar na sala'}
        </Link>
      </div>
    </article>
  );
}
