import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, euros } from '../../servicos/api';
import { useSocket } from '../../contexto/SocketContext';
import { useListaLeiloes } from '../../hooks/useListaLeiloes';
import NavProdutor from './NavProdutor';
import Contador from '../../componentes/Contador';

export default function PainelProdutor() {
  const [dados, setDados] = useState(null);
  const { socket } = useSocket();
  const { leiloes } = useListaLeiloes('?estado=ativo');

  function carregar() {
    api.get('/producers/me/estatisticas').then(setDados).catch(() => {});
  }

  useEffect(carregar, []);

  // Recarrega os indicadores quando chega uma encomenda nova
  useEffect(() => {
    if (!socket) return;
    socket.on('nova-encomenda', carregar);
    return () => socket.off('nova-encomenda', carregar);
  }, [socket]);

  if (!dados) return <p className="text-center py-5">A carregar…</p>;

  const indicadores = [
    ['Vendas entregues', euros(dados.vendasTotais)],
    ['Encomendas', dados.totalEncomendas],
    ['Por confirmar', dados.encomendasPendentes],
    ['Avaliação média', dados.numAvaliacoes ? `${dados.notaMedia} / 5` : '—'],
  ];

  return (
    <>
      <NavProdutor titulo="Painel do produtor" />

      <div className="grelha-indicadores mb-4">
        {indicadores.map(([rotulo, valor]) => (
          <div className="indicador" key={rotulo}>
            <div className="valor">{valor}</div>
            <div className="rotulo">{rotulo}</div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="painel h-100">
            <h2 className="h6">Alertas de stock baixo</h2>
            {dados.stockBaixo.length === 0 ? (
              <p className="text-black-50 small mb-0">Nenhum produto com menos de 5 unidades.</p>
            ) : (
              <table className="tabela-simples">
                <tbody>
                  {dados.stockBaixo.map((p) => (
                    <tr key={p._id}>
                      <td>{p.nome}</td>
                      <td className="text-danger fw-bold text-end">{p.stock} {p.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link className="btn btn-sm btn-outline-success mt-3" to="/produtor/produtos">Gerir produtos</Link>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="painel h-100">
            <h2 className="h6"><span className="ponto ponto-direto" />Leilões a decorrer na plataforma</h2>
            {leiloes.length === 0 ? (
              <p className="text-black-50 small mb-0">Não há leilões ativos.</p>
            ) : (
              <table className="tabela-simples">
                <tbody>
                  {leiloes.map((l) => (
                    <tr key={l._id}>
                      <td><Link to={`/leiloes/${l._id}`} className="text-dark">{l.lote}</Link></td>
                      <td className="text-end">{euros(l.licitacaoAtual.valor)}</td>
                      <td className="text-end"><Contador terminaEm={l.terminaEm} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link className="btn btn-sm btn-outline-success mt-3" to="/produtor/leiloes">Criar leilão</Link>
          </div>
        </div>
      </div>
    </>
  );
}
