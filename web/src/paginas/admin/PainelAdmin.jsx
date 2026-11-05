import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, api, dataPt, euros } from '../../servicos/api';
import { useSocket } from '../../contexto/SocketContext';
import Contador from '../../componentes/Contador';
import Estrelas from '../../componentes/Estrelas';
import EtiquetaEstado from '../../componentes/EtiquetaEstado';

// Colunas secundárias das tabelas: escondidas no telemóvel e visíveis a
// partir de md (768 px), para os botões de ação caberem no ecrã pequeno.
const SECUNDARIA = 'd-none d-md-table-cell';

const SEPARADORES = [
  ['resumo', 'Resumo'],
  ['produtores', 'Validar produtores'],
  ['avaliacoes', 'Moderar avaliações'],
  ['leiloes', 'Leilões ativos'],
  ['utilizadores', 'Utilizadores'],
  ['encomendas', 'Encomendas'],
];

export default function PainelAdmin() {
  const [separador, setSeparador] = useState('resumo');
  const [estatisticas, setEstatisticas] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [denunciadas, setDenunciadas] = useState([]);
  const [leiloes, setLeiloes] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [encomendas, setEncomendas] = useState([]);
  const [apiViva, setApiViva] = useState(null);

  const { ligado } = useSocket();

  function carregar() {
    api.get('/admin/estatisticas').then(setEstatisticas).catch(() => {});
    api.get('/admin/produtores?aprovado=pendente').then(setPendentes).catch(() => {});
    api.get('/admin/reviews?denunciadas=true').then(setDenunciadas).catch(() => {});
    api.get('/auctions?estado=ativo').then(setLeiloes).catch(() => {});
    api.get('/admin/utilizadores').then(setUtilizadores).catch(() => {});
    api.get('/admin/encomendas').then(setEncomendas).catch(() => {});
    api.get('/health').then(() => setApiViva(true)).catch(() => setApiViva(false));
  }

  useEffect(carregar, []);

  async function validar(produtor, aprovado) {
    await api.patch(`/admin/produtores/${produtor._id}`, { aprovado });
    carregar();
  }

  async function moderar(avaliacao, oculta) {
    await api.patch(`/admin/reviews/${avaliacao._id}`, { oculta });
    carregar();
  }

  async function apagarAvaliacao(avaliacao) {
    if (!confirm('Apagar definitivamente esta avaliação?')) return;
    await api.del(`/admin/reviews/${avaliacao._id}`);
    carregar();
  }

  const indicadores = estatisticas && [
    ['Compradores', estatisticas.compradores],
    ['Produtores', estatisticas.produtores],
    ['Produtos', estatisticas.produtos],
    ['Encomendas', estatisticas.encomendas],
    ['Volume de negócios', euros(estatisticas.volumeNegocios)],
    ['Leilões ativos', estatisticas.leiloesAtivos],
    ['Registos por validar', estatisticas.produtoresPendentes],
    ['Avaliações denunciadas', estatisticas.avaliacoesDenunciadas],
  ];

  return (
    <>
      <h1 className="h4 mb-3">Administração da plataforma</h1>

      <ul className="nav nav-pills gap-1 mb-3 flex-wrap">
        {SEPARADORES.map(([chave, nome]) => (
          <li className="nav-item" key={chave}>
            <button
              className={`nav-link ${separador === chave ? 'active bg-success' : 'text-dark'}`}
              onClick={() => setSeparador(chave)}
            >
              {nome}
              {chave === 'produtores' && pendentes.length > 0 && <span className="contador-carrinho">{pendentes.length}</span>}
              {chave === 'avaliacoes' && denunciadas.length > 0 && <span className="contador-carrinho">{denunciadas.length}</span>}
            </button>
          </li>
        ))}
      </ul>

      {/* ---------------- Resumo ---------------- */}
      {separador === 'resumo' && (
        <>
          <div className="grelha-indicadores mb-4">
            {indicadores?.map(([rotulo, valor]) => (
              <div className="indicador" key={rotulo}>
                <div className="valor">{valor}</div>
                <div className="rotulo">{rotulo}</div>
              </div>
            ))}
          </div>

          <div className="painel">
            <h2 className="h6">Estado dos serviços</h2>
            <table className="tabela-simples">
              <tbody>
                <tr>
                  <td>API REST + MongoDB</td>
                  <td className="text-end">{apiViva === null ? '…' : apiViva ? '🟢 a responder' : '🔴 sem resposta'}</td>
                </tr>
                <tr>
                  <td>Servidor de WebSockets (Socket.io)</td>
                  <td className="text-end">{ligado ? '🟢 ligado' : '⚪ desligado'}</td>
                </tr>
                <tr>
                  <td>Documentação OpenAPI (Swagger UI)</td>
                  <td className="text-end">
                    <a href={`${API_URL}/api-docs`} target="_blank" rel="noreferrer">abrir /api-docs</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------------- Validar produtores ---------------- */}
      {separador === 'produtores' && (
        <div className="painel">
          <h2 className="h6">Registos de produtor por validar</h2>
          {pendentes.length === 0 ? (
            <p className="text-black-50 small mb-0">Não há registos pendentes.</p>
          ) : (
            pendentes.map((p) => (
              <div className="border-bottom py-3" key={p._id}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <strong>{p.nome}</strong>
                    <div className="small text-black-50">{p.email} · 📍 {p.localidade} · ☎ {p.telefone}</div>
                    <p className="small mb-0 mt-1">{p.descricao}</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-verde" onClick={() => validar(p, 'aprovado')}>Aprovar</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => validar(p, 'rejeitado')}>Rejeitar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------- Moderar avaliações ---------------- */}
      {separador === 'avaliacoes' && (
        <div className="painel">
          <h2 className="h6">Avaliações denunciadas</h2>
          {denunciadas.length === 0 ? (
            <p className="text-black-50 small mb-0">Não há avaliações denunciadas.</p>
          ) : (
            denunciadas.map((a) => (
              <div className="border-bottom py-3" key={a._id}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <strong>{a.nome}</strong> <Estrelas nota={a.nota} />
                    <div className="small text-black-50">
                      {a.produto ? `sobre o produto “${a.produto.nome}”` : 'sobre o produtor'} · {dataPt(a.createdAt)}
                    </div>
                    <p className="mb-0 mt-1">{a.comentario}</p>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => moderar(a, false)}>Manter</button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => moderar(a, true)}>Esconder</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => apagarAvaliacao(a)}>Apagar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------- Leilões ativos ---------------- */}
      {separador === 'leiloes' && (
        <div className="painel">
          <h2 className="h6">Leilões a decorrer</h2>
          <div className="table-responsive">
            <table className="tabela-simples">
              <thead><tr><th>Lote</th><th className={SECUNDARIA}>Produtor</th><th>Atual</th><th className={SECUNDARIA}>Melhor licitação</th><th>Termina</th></tr></thead>
              <tbody>
                {leiloes.map((l) => (
                  <tr key={l._id}>
                    <td><Link to={`/leiloes/${l._id}`} className="text-dark fw-semibold">{l.lote}</Link></td>
                    <td className={SECUNDARIA}>{l.produtor?.nome}</td>
                    <td>{euros(l.licitacaoAtual.valor)}</td>
                    <td className={SECUNDARIA}>{l.licitacaoAtual.nome || '—'}</td>
                    <td><Contador terminaEm={l.terminaEm} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leiloes.length === 0 && <p className="text-black-50 small mb-0">Não há leilões ativos.</p>}
        </div>
      )}

      {/* ---------------- Utilizadores ---------------- */}
      {separador === 'utilizadores' && (
        <div className="painel">
          <h2 className="h6">Utilizadores ({utilizadores.length})</h2>
          <div className="table-responsive">
            <table className="tabela-simples">
              <thead><tr><th>Nome</th><th className={SECUNDARIA}>Email</th><th>Papel</th><th>Estado</th><th className={SECUNDARIA}>Registo</th></tr></thead>
              <tbody>
                {utilizadores.map((u) => (
                  <tr key={u._id}>
                    <td>{u.nome}</td>
                    <td className={`small ${SECUNDARIA}`}>{u.email}</td>
                    <td>{u.papel}</td>
                    <td>{u.papel === 'produtor' ? <span className={`etiqueta estado-${u.aprovado === 'aprovado' ? 'entregue' : 'pendente'}`}>{u.aprovado}</span> : '—'}</td>
                    <td className={`small text-black-50 ${SECUNDARIA}`}>{dataPt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- Encomendas ---------------- */}
      {separador === 'encomendas' && (
        <div className="painel">
          <h2 className="h6">Últimas encomendas</h2>
          <div className="table-responsive">
            <table className="tabela-simples">
              <thead><tr><th className={SECUNDARIA}>Data</th><th>Comprador</th><th className={SECUNDARIA}>Produtor</th><th>Total</th><th>Estado</th></tr></thead>
              <tbody>
                {encomendas.map((e) => (
                  <tr key={e._id}>
                    <td className={`small text-black-50 ${SECUNDARIA}`}>{dataPt(e.createdAt)}</td>
                    <td>{e.comprador?.nome}</td>
                    <td className={SECUNDARIA}>{e.produtor?.nome}</td>
                    <td>{euros(e.total)}</td>
                    <td><EtiquetaEstado estado={e.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {encomendas.length === 0 && <p className="text-black-50 small mb-0">Ainda não há encomendas.</p>}
        </div>
      )}
    </>
  );
}
