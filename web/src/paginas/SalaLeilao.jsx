import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dataPt, euros } from '../servicos/api';
import { useAuth } from '../contexto/AuthContext';
import { useLeilao } from '../hooks/useLeilao';
import Contador from '../componentes/Contador';

/**
 * Sala de leilão em direto.
 * Todo o estado vem do servidor pelo WebSocket (hook useLeilao): valor atual,
 * histórico, número de participantes e licitações recusadas.
 */
export default function SalaLeilao() {
  const { id } = useParams();
  const { utilizador, papel } = useAuth();
  const { leilao, historico, participantes, erro, licitar, minimo } = useLeilao(id);

  const [valor, setValor] = useState('');

  // Quando chega o estado do servidor, o campo passa a ter o valor mínimo
  useEffect(() => {
    if (minimo) setValor(String(minimo));
  }, [minimo]);

  if (!leilao) return <p className="text-center py-5">A entrar na sala do leilão…</p>;

  const terminado = leilao.estado === 'terminado' || new Date(leilao.terminaEm) <= new Date();
  const souOVencedor = leilao.licitacaoAtual.comprador === utilizador?._id;

  function enviar(evento) {
    evento.preventDefault();
    licitar(Number(valor));
  }

  return (
    <>
      <nav className="mb-3 small">
        <Link to="/leiloes">Leilões</Link> · <span className="text-black-50">{leilao.lote}</span>
      </nav>

      <div className="row g-4">
        {/* ---------------- Painel principal ---------------- */}
        <div className="col-12 col-lg-7">
          <div className="painel-leilao">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h1 className="h4 mb-1">{leilao.lote}</h1>
                <p className="text-black-50 mb-0 small">
                  {leilao.produtor?.nome} · base {euros(leilao.precoBase)} · incremento {euros(leilao.incremento)}
                </p>
              </div>
              <span className="etiqueta estado-confirmada">{participantes} na sala</span>
            </div>

            <p className="text-black-50">{leilao.descricao}</p>

            <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 my-3">
              <div>
                <div className="small text-black-50">Licitação atual</div>
                <div className="valor-atual">{euros(leilao.licitacaoAtual.valor)}</div>
                <div className="small">
                  {leilao.licitacaoAtual.nome
                    ? <>por <strong>{leilao.licitacaoAtual.nome}</strong>{souOVencedor && ' (você)'}</>
                    : 'ainda sem licitações'}
                </div>
              </div>

              <div className="text-end">
                <div className="small text-black-50">Termina em</div>
                {terminado ? <span className="relogio">terminado</span> : <Contador terminaEm={leilao.terminaEm} />}
                <div className="small text-black-50">{dataPt(leilao.terminaEm)}</div>
              </div>
            </div>

            {terminado ? (
              <div className={`alert ${souOVencedor ? 'alert-success' : 'alert-secondary'} mb-0`}>
                {leilao.licitacaoAtual.nome
                  ? <>Leilão terminado. Arrematado por <strong>{leilao.licitacaoAtual.nome}</strong> em {euros(leilao.licitacaoAtual.valor)}.{souOVencedor && ' Parabéns!'}</>
                  : 'Leilão terminado sem licitações.'}
              </div>
            ) : papel !== 'comprador' ? (
              <div className="alert alert-secondary mb-0">
                Só as contas de <strong>comprador</strong> podem licitar. Está a acompanhar o leilão em direto.
              </div>
            ) : (
              <form onSubmit={enviar}>
                <label className="form-label small mb-1" htmlFor="valor">
                  A sua licitação (mínimo {euros(minimo)})
                </label>
                <div className="input-group mb-2">
                  <input
                    id="valor"
                    type="number"
                    className="form-control"
                    min={minimo}
                    step="1"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                  <span className="input-group-text">€</span>
                  <button className="btn btn-terracota" type="submit">Licitar</button>
                </div>

                <div className="atalhos">
                  {[5, 10, 25].map((extra) => (
                    <button
                      key={extra}
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => licitar(minimo + extra)}
                    >
                      +{extra} €
                    </button>
                  ))}
                </div>

                {erro && <div className="alert alert-danger mt-3 mb-0 py-2">{erro}</div>}
              </form>
            )}
          </div>
        </div>

        {/* ---------------- Histórico ---------------- */}
        <div className="col-12 col-lg-5">
          <div className="painel">
            <h2 className="h6">Histórico de licitações</h2>
            {historico.length === 0 ? (
              <p className="text-black-50 small mb-0">Seja o primeiro a licitar.</p>
            ) : (
              <ul className="historico-licitacoes">
                {historico.map((l) => (
                  <li key={l._id}>
                    <span>{l.nome}</span>
                    <span>{euros(l.valor)} <small className="text-black-50">{dataPt(l.createdAt).split(', ')[1]}</small></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
