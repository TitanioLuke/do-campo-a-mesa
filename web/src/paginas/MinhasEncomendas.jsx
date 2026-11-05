import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataPt, euros } from '../servicos/api';
import { useSocket } from '../contexto/SocketContext';
import EtiquetaEstado from '../componentes/EtiquetaEstado';

const PASSOS = ['pendente', 'confirmada', 'pronta', 'entregue'];

// Dentro de uma <option> só cabe texto, por isso a nota é dada por palavras
const NOTAS = [[5, 'Excelente'], [4, 'Bom'], [3, 'Razoável'], [2, 'Fraco'], [1, 'Mau']];

export default function MinhasEncomendas() {
  const [encomendas, setEncomendas] = useState([]);
  // O que está a ser avaliado: { produto } para um produto, { produtor } para o produtor
  const [avaliacao, setAvaliacao] = useState(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState('');
  const { socket } = useSocket();

  const carregar = useCallback(() => {
    api.get('/orders').then(setEncomendas).catch(() => {});
  }, []);

  useEffect(carregar, [carregar]);

  // Quando o produtor muda o estado, o servidor avisa pelo WebSocket:
  // a lista é atualizada na hora, sem recarregar a página.
  useEffect(() => {
    if (!socket) return;
    const aoAtualizar = ({ id, estado }) =>
      setEncomendas((atuais) => atuais.map((e) => (e._id === id ? { ...e, estado } : e)));

    socket.on('encomenda-atualizada', aoAtualizar);
    return () => socket.off('encomenda-atualizada', aoAtualizar);
  }, [socket]);

  function abrirFormulario(alvo) {
    setAvaliacao(alvo);
    setNota(5);
    setComentario('');
    setAviso('');
  }

  async function enviarAvaliacao(evento) {
    evento.preventDefault();
    try {
      // A API aceita `produto` ou `produtor`: enviamos só o que estamos a avaliar
      const alvo = avaliacao.produto ? { produto: avaliacao.produto } : { produtor: avaliacao.produtor };
      await api.post('/reviews', { ...alvo, nota, comentario });

      setAviso(`Avaliação de "${avaliacao.titulo}" registada. Obrigado!`);
      setAvaliacao(null);
      setComentario('');
      setNota(5);
    } catch (e) {
      setAviso(e.message);
    }
  }

  return (
    <>
      <h1 className="h4 mb-3">As minhas encomendas</h1>
      {aviso && <div className="alert alert-info py-2">{aviso}</div>}

      {encomendas.length === 0 && (
        <div className="alert alert-light border text-center">
          Ainda não fez encomendas. <Link to="/">Ver catálogo</Link>
        </div>
      )}

      <div className="row g-3">
        {encomendas.map((encomenda) => (
          <div className="col-12" key={encomenda._id}>
            <article className="painel">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h2 className="h6 mb-1">
                    <Link to={`/produtores/${encomenda.produtor?._id}`} className="text-dark">
                      {encomenda.produtor?.nome}
                    </Link>
                  </h2>
                  <small className="text-black-50">
                    {dataPt(encomenda.createdAt)} · {encomenda.entrega.tipo}
                    {encomenda.entrega.morada && ` · ${encomenda.entrega.morada}`}
                  </small>
                </div>

                <div className="text-end">
                  <EtiquetaEstado estado={encomenda.estado} />
                  {encomenda.estado === 'entregue' && (
                    <div>
                      <button
                        className="btn btn-sm btn-outline-success mt-2"
                        onClick={() =>
                          abrirFormulario({
                            produtor: encomenda.produtor._id,
                            titulo: encomenda.produtor.nome,
                          })
                        }
                      >
                        Avaliar produtor
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progresso dos estados */}
              <div className="d-flex gap-1 my-3">
                {PASSOS.map((passo, i) => (
                  <div
                    key={passo}
                    className="flex-fill text-center small"
                    style={{
                      borderTop: `4px solid ${i <= PASSOS.indexOf(encomenda.estado) ? '#2f5d3a' : '#e3e3e0'}`,
                      paddingTop: 4,
                      color: i <= PASSOS.indexOf(encomenda.estado) ? '#2f5d3a' : '#b0b0a8',
                    }}
                  >
                    {passo}
                  </div>
                ))}
              </div>

              <table className="tabela-simples">
                <tbody>
                  {encomenda.linhas.map((linha) => (
                    <tr key={linha._id || linha.produto}>
                      <td>{linha.nome}</td>
                      <td>{linha.quantidade} × {euros(linha.precoUnit)}</td>
                      <td className="fw-bold">{euros(linha.quantidade * linha.precoUnit)}</td>
                      <td className="text-end">
                        {encomenda.estado === 'entregue' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => abrirFormulario({ produto: linha.produto, titulo: linha.nome })}
                          >
                            Avaliar produto
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-end mb-0 mt-2">
                Total: <strong className="text-success">{euros(encomenda.total)}</strong>
              </p>
            </article>
          </div>
        ))}
      </div>

      {/* Formulário de avaliação (aparece ao carregar num dos botões "Avaliar") */}
      {avaliacao && (
        <div className="painel mt-4">
          <h2 className="h6">
            Avaliar {avaliacao.produto ? 'o produto' : 'o produtor'} “{avaliacao.titulo}”
          </h2>

          <form onSubmit={enviarAvaliacao}>
            <div className="mb-2">
              <label className="form-label small mb-1" htmlFor="nota">Nota</label>
              <select id="nota" className="form-select" value={nota} onChange={(e) => setNota(Number(e.target.value))}>
                {NOTAS.map(([n, texto]) => <option key={n} value={n}>{n} — {texto}</option>)}
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1" htmlFor="comentario">
                {avaliacao.produto ? 'Comentário sobre o produto' : 'Comentário sobre o atendimento e a entrega'}
              </label>
              <textarea id="comentario" className="form-control" rows="2" maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-verde">Enviar avaliação</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setAvaliacao(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
