import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataPt, euros } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import { useAvisos } from '../../contexto/AvisosContext';
import { useListaLeiloes } from '../../hooks/useListaLeiloes';
import NavProdutor from './NavProdutor';
import Contador from '../../componentes/Contador';
import ModalConfirmar from '../../componentes/ModalConfirmar';

// O produtor escolhe a unidade que lhe dá jeito; a API recebe sempre minutos.
// Assim ninguém tem de fazer contas de cabeça para um leilão de 4 dias.
const UNIDADES = { minutos: 1, horas: 60, dias: 60 * 24 };
const DURACAO_MAXIMA_MINUTOS = 7 * 24 * 60; // uma semana, o mesmo limite do servidor

const VAZIO = {
  lote: '', descricao: '', precoBase: '', incremento: 5,
  minutosAteComecar: 5, duracaoValor: 30, duracaoUnidade: 'minutos', imagem: '',
};

export default function MeusLeiloes() {
  const { utilizador } = useAuth();
  const { sucesso, erro } = useAvisos();
  // A lista está em tempo real: as licitações dos compradores aparecem aqui
  const { leiloes, recarregar } = useListaLeiloes(`?produtor=${utilizador._id}`);

  const [form, setForm] = useState(VAZIO);
  const [aApagar, setAApagar] = useState(null);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // Quanto vale, nesta unidade, o limite de uma semana
  const maximo = DURACAO_MAXIMA_MINUTOS / UNIDADES[form.duracaoUnidade];

  // Ao trocar de unidade, 30 minutos não podem virar 30 dias: o valor é
  // encurtado ao máximo permitido pela unidade nova.
  function mudarUnidade(evento) {
    const duracaoUnidade = evento.target.value;
    const limite = DURACAO_MAXIMA_MINUTOS / UNIDADES[duracaoUnidade];
    setForm({ ...form, duracaoUnidade, duracaoValor: Math.min(Number(form.duracaoValor) || 1, limite) });
  }

  async function escolherImagem(evento) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;
    try {
      setForm({ ...form, imagem: await api.upload(ficheiro) });
      sucesso('Fotografia carregada.');
    } catch (e) {
      erro(e.message);
    }
  }

  async function submeter(evento) {
    evento.preventDefault();
    try {
      const { duracaoValor, duracaoUnidade, ...resto } = form;
      await api.post('/auctions', {
        ...resto,
        precoBase: Number(form.precoBase),
        incremento: Number(form.incremento),
        minutosAteComecar: Number(form.minutosAteComecar),
        duracaoMinutos: Number(duracaoValor) * UNIDADES[duracaoUnidade],
      });
      sucesso(`Leilão "${form.lote}" agendado para daqui a ${form.minutosAteComecar} minutos.`);
      setForm(VAZIO);
      recarregar();
    } catch (e) {
      erro(e.message);
    }
  }

  async function apagar() {
    const leilao = aApagar;
    setAApagar(null);
    try {
      await api.del(`/auctions/${leilao._id}`);
      sucesso(`Leilão "${leilao.lote}" apagado.`);
      recarregar();
    } catch (e) {
      erro(e.message);
    }
  }

  return (
    <>
      <NavProdutor titulo="Os meus leilões" />

      <div className="painel mb-4">
        <h2 className="h6">Agendar leilão</h2>

        <form onSubmit={submeter} className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label small mb-1" htmlFor="lote">Lote</label>
            <input id="lote" className="form-control" required placeholder="Ex.: Lote de 50 kg de kiwi" value={form.lote} onChange={mudar('lote')} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="precoBase">Preço base (€)</label>
            <input id="precoBase" type="number" min="0" step="0.5" className="form-control" required value={form.precoBase} onChange={mudar('precoBase')} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="incremento">Incremento (€)</label>
            <input id="incremento" type="number" min="1" step="1" className="form-control" required value={form.incremento} onChange={mudar('incremento')} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="comeca">Começa daqui a (min)</label>
            <input id="comeca" type="number" min="3" max="60" className="form-control" required value={form.minutosAteComecar} onChange={mudar('minutosAteComecar')} />
            <small className="text-black-50">entre 3 e 60</small>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label small mb-1" htmlFor="duracao">Duração</label>
            <div className="input-group">
              <input
                id="duracao"
                type="number"
                min="1"
                max={maximo}
                className="form-control"
                required
                value={form.duracaoValor}
                onChange={mudar('duracaoValor')}
              />
              <select
                className="form-select"
                aria-label="Unidade da duração"
                value={form.duracaoUnidade}
                onChange={mudarUnidade}
              >
                <option value="minutos">minutos</option>
                <option value="horas">horas</option>
                <option value="dias">dias</option>
              </select>
            </div>
            <small className="text-black-50">no máximo uma semana</small>
          </div>

          <div className="col-12">
            <label className="form-label small mb-1" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" className="form-control" rows="2" value={form.descricao} onChange={mudar('descricao')} />
          </div>

          <div className="col-12 col-md-8">
            <label className="form-label small mb-1" htmlFor="imagem">Fotografia do lote</label>
            <input id="imagem" type="file" accept="image/*" className="form-control" onChange={escolherImagem} />
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            {form.imagem && <img src={form.imagem} alt="Pré-visualização" style={{ height: 60, borderRadius: 8 }} />}
          </div>

          <div className="col-12">
            <button className="btn btn-terracota">Agendar leilão</button>
            <p className="small text-black-50 mt-2 mb-0">
              O leilão abre sozinho à hora marcada e fecha quando a duração acabar.
              O tempo até abrir dá aos compradores a hipótese de entrarem na sala a tempo.
            </p>
          </div>
        </form>
      </div>

      <div className="painel">
        <h2 className="h6">Leilões ({leiloes.length})</h2>
        <div className="table-responsive">
          <table className="tabela-simples">
            <thead>
              <tr><th>Lote</th><th>Atual</th><th className="d-none d-md-table-cell">Melhor licitação</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {leiloes.map((l) => (
                <tr key={l._id}>
                  <td><Link to={`/leiloes/${l._id}`} className="text-dark fw-semibold">{l.lote}</Link></td>
                  <td>{euros(l.licitacaoAtual.valor)}</td>
                  <td className="d-none d-md-table-cell">{l.licitacaoAtual.nome || <span className="text-black-50">—</span>}</td>
                  <td>
                    {l.estado === 'agendado' && (
                      <>
                        <span className="etiqueta estado-pendente">começa em</span>
                        <div><Contador terminaEm={l.comecaEm} /></div>
                      </>
                    )}
                    {l.estado === 'ativo' && (
                      <>
                        <span className="ponto ponto-direto" />
                        <Contador terminaEm={l.terminaEm} />
                      </>
                    )}
                    {l.estado === 'terminado' && <span className="etiqueta estado-entregue">terminado</span>}
                    <div className="small text-black-50">{dataPt(l.terminaEm)}</div>
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setAApagar(l)}>Apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leiloes.length === 0 && <p className="text-black-50 small mb-0">Ainda não criou leilões.</p>}
      </div>

      {aApagar && (
        <ModalConfirmar
          titulo="Apagar leilão"
          mensagem={
            aApagar.licitacaoAtual.nome
              ? `O leilão "${aApagar.lote}" já tem licitações, e o histórico é apagado com ele. A melhor licitação é de ${aApagar.licitacaoAtual.nome}.`
              : `O leilão "${aApagar.lote}" ainda não tem licitações e deixa de estar visível.`
          }
          aoConfirmar={apagar}
          aoFechar={() => setAApagar(null)}
        />
      )}
    </>
  );
}
