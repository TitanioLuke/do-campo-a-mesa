import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dataPt, euros } from '../servicos/api';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';
import { useLeilao } from '../hooks/useLeilao';
import Contador from '../componentes/Contador';
import Modal from '../componentes/Modal';

const ATALHOS = [5, 10, 25];

/**
 * Sala de leilão em direto.
 * Todo o estado vem do servidor pelo WebSocket (hook useLeilao): valor atual,
 * histórico, número de participantes e licitações recusadas.
 *
 * Licitar é sempre um acto explícito: os atalhos +5/+10/+25 apenas preenchem o
 * campo, e a licitação só sai depois de confirmada na janela de confirmação.
 */
export default function SalaLeilao() {
  const { id } = useParams();
  const { utilizador, papel } = useAuth();
  const { erro: avisarErro } = useAvisos();
  const { leilao, historico, participantes, erro, licitar, minimo } = useLeilao(id);

  const [valor, setValor] = useState('');
  const [aConfirmar, setAConfirmar] = useState(false);

  // Quando chega o estado do servidor, o campo passa a ter o valor mínimo
  useEffect(() => {
    if (minimo) setValor(String(minimo));
  }, [minimo]);

  // As licitações recusadas pelo servidor aparecem como aviso
  useEffect(() => {
    if (erro) avisarErro(erro);
  }, [erro, avisarErro]);

  if (!leilao) return <p className="text-center py-5">A entrar na sala do leilão…</p>;

  const terminado = leilao.estado === 'terminado' || new Date(leilao.terminaEm) <= new Date();
  const souOVencedor = leilao.licitacaoAtual.comprador === utilizador?._id;

  function pedirConfirmacao(evento) {
    evento.preventDefault();
    if (Number(valor) < minimo) {
      avisarErro(`A licitação tem de ser de pelo menos ${euros(minimo)}.`);
      return;
    }
    setAConfirmar(true);
  }

  function confirmar() {
    licitar(Number(valor));
    setAConfirmar(false);
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
                  ? <>Leilão terminado. Arrematado por <strong>{leilao.licitacaoAtual.nome}</strong> em {euros(leilao.licitacaoAtual.valor)}.{souOVencedor && ' O produtor entra em contacto consigo para combinar o pagamento e o levantamento.'}</>
                  : 'Leilão terminado sem licitações.'}
              </div>
            ) : papel !== 'comprador' ? (
              <div className="alert alert-secondary mb-0">
                Só as contas de <strong>comprador</strong> podem licitar. Está a acompanhar o leilão em direto.
              </div>
            ) : (
              <form onSubmit={pedirConfirmacao}>
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

                {/* Os atalhos preenchem o campo; não licitam sozinhos */}
                <div className="atalhos">
                  {ATALHOS.map((extra) => (
                    <button
                      key={extra}
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setValor(String(minimo + extra))}
                    >
                      {euros(minimo + extra)}
                    </button>
                  ))}
                </div>

                <p className="small text-black-50 mt-3 mb-0">
                  Licitar não movimenta dinheiro. Quem ganhar o leilão é contactado pelo
                  produtor para combinar o pagamento e o levantamento, tal como numa
                  encomenda normal da plataforma.
                </p>
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

      {aConfirmar && (
        <Modal
          titulo="Confirmar licitação"
          aoFechar={() => setAConfirmar(false)}
          rodape={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setAConfirmar(false)}>
                Cancelar
              </button>
              <button className="btn btn-terracota" onClick={confirmar}>
                Licitar {euros(Number(valor))}
              </button>
            </>
          }
        >
          <p className="mb-2">
            Vai licitar <strong>{euros(Number(valor))}</strong> no lote “{leilao.lote}”.
          </p>
          <p className="small text-black-50 mb-0">
            Se ninguém cobrir esta licitação até ao fim do leilão, fica comprometido a
            comprar o lote por este valor. Não é cobrado nada agora: o pagamento é
            combinado diretamente com o produtor, como nas restantes encomendas.
          </p>
        </Modal>
      )}
    </>
  );
}
