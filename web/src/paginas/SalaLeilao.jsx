import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { dataPt, euros } from '../servicos/api';
import { useAuth } from '../contexto/AuthContext';
import { useAvisos } from '../contexto/AvisosContext';
import { useLeilao } from '../hooks/useLeilao';
import Contador from '../componentes/Contador';

const ATALHOS = [5, 10, 25];

/**
 * Sala de leilão em direto.
 * Todo o estado vem do servidor pelo WebSocket (hook useLeilao): valor atual,
 * histórico, número de participantes e licitações recusadas. O leilão abre e
 * fecha sozinho — é o servidor que manda `leilao-comecou` e `leilao-terminado`.
 */
export default function SalaLeilao() {
  const { id } = useParams();
  const { utilizador, papel, temSessao } = useAuth();
  const { erro: avisarErro } = useAvisos();
  const { leilao, historico, participantes, erro, licitar, minimo, prolongado } = useLeilao(id);

  const [valor, setValor] = useState('');

  // Quando chega o estado do servidor, o campo passa a ter o valor mínimo
  useEffect(() => {
    if (minimo) setValor(String(minimo));
  }, [minimo]);

  // As licitações recusadas pelo servidor aparecem como aviso
  useEffect(() => {
    if (erro) avisarErro(erro);
  }, [erro, avisarErro]);

  if (!leilao) return <p className="text-center py-5">A entrar na sala do leilão…</p>;

  const agendado = leilao.estado === 'agendado';
  const terminado = leilao.estado === 'terminado';
  const aDecorrer = leilao.estado === 'ativo';
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
                <div className="small text-black-50">
                  {agendado ? 'Preço base' : 'Licitação atual'}
                </div>
                <div className="valor-atual">{euros(leilao.licitacaoAtual.valor)}</div>
                <div className="small">
                  {agendado
                    ? 'as licitações abrem quando o leilão começar'
                    : leilao.licitacaoAtual.nome
                      ? <>por <strong>{leilao.licitacaoAtual.nome}</strong>{souOVencedor && ' (você)'}</>
                      : 'ainda sem licitações'}
                </div>
              </div>

              <div className="text-end">
                <div className="small text-black-50">
                  {agendado ? 'Começa em' : 'Termina em'}
                </div>
                {terminado
                  ? <span className="relogio">terminado</span>
                  : <Contador terminaEm={agendado ? leilao.comecaEm : leilao.terminaEm} />}
                <div className="small text-black-50">
                  {dataPt(agendado ? leilao.comecaEm : leilao.terminaEm)}
                </div>
              </div>
            </div>

            {/* Aparece assim que uma licitação empurra o fim: sem isto, ver a
                contagem SUBIR parece um erro a quem está na sala. */}
            {aDecorrer && prolongado && (
              <div className="alert alert-warning py-2 mb-3 small">
                Leilão <strong>prolongado</strong>: cada licitação feita nos últimos
                30 segundos empurra o fim meio minuto, para ninguém ganhar à última
                sem os outros terem tempo de responder.
              </div>
            )}

            {agendado && (
              <div className="alert alert-warning mb-0">
                Este leilão ainda não abriu. Fique nesta página: quando a contagem chegar
                ao fim, a sala abre sozinha e pode começar a licitar.
              </div>
            )}

            {terminado && (
              <div className={`alert ${souOVencedor ? 'alert-success' : 'alert-secondary'} mb-0`}>
                {leilao.licitacaoAtual.nome
                  ? <>Leilão terminado. Arrematado por <strong>{leilao.licitacaoAtual.nome}</strong> em {euros(leilao.licitacaoAtual.valor)}.{souOVencedor && ' O produtor entra em contacto consigo.'}</>
                  : 'Leilão terminado sem licitações.'}
              </div>
            )}

            {aDecorrer && !temSessao && (
              <div className="alert alert-secondary mb-0">
                Está a acompanhar o leilão em direto. <Link to="/login">Inicie sessão</Link> como
                comprador para licitar.
              </div>
            )}

            {aDecorrer && temSessao && papel !== 'comprador' && (
              <div className="alert alert-secondary mb-0">
                Só as contas de <strong>comprador</strong> podem licitar. Está a acompanhar o leilão em direto.
              </div>
            )}

            {aDecorrer && papel === 'comprador' && (
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

                {/* Atalhos: licitam logo o valor indicado */}
                <div className="atalhos">
                  {ATALHOS.map((extra) => (
                    <button
                      key={extra}
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => licitar(minimo + extra)}
                    >
                      {euros(minimo + extra)}
                    </button>
                  ))}
                </div>

                <p className="small text-black-50 mt-3 mb-0">
                  Licitar não movimenta dinheiro. Quem ganhar é contactado pelo produtor
                  para combinar o pagamento e o levantamento.
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
              <p className="text-black-50 small mb-0">
                {agendado ? 'O leilão ainda não abriu.' : 'Seja o primeiro a licitar.'}
              </p>
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
