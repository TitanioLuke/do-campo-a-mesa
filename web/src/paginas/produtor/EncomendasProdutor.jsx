import { useCallback, useEffect, useState } from 'react';
import { api, dataPt, euros } from '../../servicos/api';
import { useSocket } from '../../contexto/SocketContext';
import NavProdutor from './NavProdutor';
import EtiquetaEstado from '../../componentes/EtiquetaEstado';

const SEGUINTE = { pendente: 'confirmada', confirmada: 'pronta', pronta: 'entregue' };

export default function EncomendasProdutor() {
  const [encomendas, setEncomendas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const { socket } = useSocket();

  const carregar = useCallback(() => {
    api.get(`/orders${filtro ? `?estado=${filtro}` : ''}`).then(setEncomendas).catch((e) => setErro(e.message));
  }, [filtro]);

  useEffect(carregar, [carregar]);

  // Encomendas novas aparecem sem recarregar a página
  useEffect(() => {
    if (!socket) return;
    socket.on('nova-encomenda', carregar);
    return () => socket.off('nova-encomenda', carregar);
  }, [socket, carregar]);

  /** Avança o estado; a API notifica o comprador pelo WebSocket. */
  async function avancar(encomenda) {
    setErro('');
    try {
      const atualizada = await api.patch(`/orders/${encomenda._id}/estado`, {
        estado: SEGUINTE[encomenda.estado],
      });
      setEncomendas((atuais) => atuais.map((e) => (e._id === atualizada._id ? { ...e, estado: atualizada.estado } : e)));
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <NavProdutor titulo="Encomendas recebidas" />

      <div className="filtros d-flex gap-2 align-items-center flex-wrap">
        <label className="small mb-0" htmlFor="estado">Filtrar por estado</label>
        <select id="estado" className="form-select form-select-sm" style={{ maxWidth: 200 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          {['pendente', 'confirmada', 'pronta', 'entregue'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <span className="small text-black-50">{encomendas.length} encomenda(s)</span>
      </div>

      {erro && <div className="alert alert-danger py-2">{erro}</div>}

      {encomendas.length === 0 ? (
        <div className="alert alert-light border text-center">Ainda não recebeu encomendas.</div>
      ) : (
        <div className="row g-3">
          {encomendas.map((encomenda) => (
            <div className="col-12 col-lg-6" key={encomenda._id}>
              <article className="painel h-100">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h2 className="h6 mb-1">{encomenda.comprador?.nome}</h2>
                    <small className="text-black-50">{dataPt(encomenda.createdAt)}</small>
                  </div>
                  <EtiquetaEstado estado={encomenda.estado} />
                </div>

                <p className="small text-black-50 mt-2 mb-2">
                  {encomenda.entrega.tipo === 'entrega'
                    ? `Entrega em: ${encomenda.entrega.morada}`
                    : 'Levantamento no produtor'}
                </p>

                <table className="tabela-simples">
                  <tbody>
                    {encomenda.linhas.map((l) => (
                      <tr key={l._id || l.produto}>
                        <td>{l.nome}</td>
                        <td className="text-end">{l.quantidade} × {euros(l.precoUnit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <strong className="text-success">{euros(encomenda.total)}</strong>
                  {SEGUINTE[encomenda.estado] ? (
                    <button className="btn btn-sm btn-verde" onClick={() => avancar(encomenda)}>
                      Marcar como {SEGUINTE[encomenda.estado]}
                    </button>
                  ) : (
                    <span className="small text-black-50">encomenda concluída</span>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
