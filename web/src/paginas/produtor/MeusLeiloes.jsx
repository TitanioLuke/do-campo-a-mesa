import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataPt, euros } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import { useAvisos } from '../../contexto/AvisosContext';
import { useListaLeiloes } from '../../hooks/useListaLeiloes';
import NavProdutor from './NavProdutor';
import Contador from '../../componentes/Contador';
import ModalConfirmar from '../../componentes/ModalConfirmar';

// A duração escreve-se em três campos — dias, horas e minutos — e a API recebe
// a soma em minutos. Três campos em vez de um valor e uma unidade porque as
// durações reais não são redondas: 2 horas e meia são 2h30, e não 2,5 horas
// nem 150 minutos que alguém tem de calcular de cabeça.
const DURACAO_MAXIMA_MINUTOS = 7 * 24 * 60; // uma semana, o mesmo limite do servidor

// O leilão abre a uma hora do próprio dia, em horário de trabalho — os mesmos
// limites que o servidor volta a verificar.
const HORA_ABERTURA_MIN = 8;
const HORA_ABERTURA_MAX = 18;
const HORAS = Array.from({ length: HORA_ABERTURA_MAX - HORA_ABERTURA_MIN + 1 },
  (_, i) => String(HORA_ABERTURA_MIN + i).padStart(2, '0'));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/**
 * O próximo horário certo: daqui a 5 minutos, arredondado para cima aos 5, e
 * sempre dentro do horário de abertura. É o que o formulário propõe de início.
 */
function proximaAbertura() {
  const quando = new Date(Date.now() + 5 * 60 * 1000);
  quando.setMinutes(Math.ceil(quando.getMinutes() / 5) * 5, 0, 0);

  let hora = quando.getHours();
  let minuto = quando.getMinutes();
  if (hora < HORA_ABERTURA_MIN) { hora = HORA_ABERTURA_MIN; minuto = 0; }
  if (hora >= HORA_ABERTURA_MAX) { hora = HORA_ABERTURA_MAX; minuto = 0; }

  return { hora: String(hora).padStart(2, '0'), minuto: String(minuto).padStart(2, '0') };
}

/** O formulário vazio. É uma função porque a hora proposta depende de agora. */
function formVazio() {
  const { hora, minuto } = proximaAbertura();
  return {
    lote: '', descricao: '', precoBase: '', incremento: 5,
    hora, minuto, dias: 0, horas: 0, minutos: 30, imagem: '',
  };
}

/** 150 → "2h 30min"; serve para o produtor confirmar o que escreveu. */
function emPalavras(total) {
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const minutos = total % 60;
  return [
    dias && `${dias} ${dias === 1 ? 'dia' : 'dias'}`,
    horas && `${horas}h`,
    minutos && `${minutos}min`,
  ].filter(Boolean).join(' ');
}

export default function MeusLeiloes() {
  const { utilizador } = useAuth();
  const { sucesso, erro } = useAvisos();
  // A lista está em tempo real: as licitações dos compradores aparecem aqui
  const { leiloes, recarregar } = useListaLeiloes(`?produtor=${utilizador._id}`);

  const [form, setForm] = useState(formVazio);

  // O relógio vive no estado e avança de 30 em 30 segundos, como no Contador.
  // Assim a frase "Abre daqui a …" acompanha o tempo a passar em vez de ficar
  // parada no instante em que a página foi aberta.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 30 * 1000);
    return () => clearInterval(intervalo);
  }, []);
  const [aApagar, setAApagar] = useState(null);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // O que vai para a API: a soma dos três campos, em minutos
  const duracaoMinutos =
    (Number(form.dias) || 0) * 1440 + (Number(form.horas) || 0) * 60 + (Number(form.minutos) || 0);
  const duracaoValida = duracaoMinutos >= 1 && duracaoMinutos <= DURACAO_MAXIMA_MINUTOS;

  // A hora escolhida, no dia de hoje. O servidor recebe o instante completo.
  const comecaEm = new Date(agora);
  comecaEm.setHours(Number(form.hora), Number(form.minuto), 0, 0);
  const faltam = Math.round((comecaEm.getTime() - agora) / 60000);
  const horaValida = comecaEm.getTime() - agora >= 60 * 1000;
  const foraDeHoras = new Date(agora).getHours() >= HORA_ABERTURA_MAX;

  // Às 18:00 em ponto fecha a janela, por isso essa hora só admite os minutos a 00.
  const minutosPossiveis = form.hora === String(HORA_ABERTURA_MAX) ? ['00'] : MINUTOS;

  function mudarHora(evento) {
    const hora = evento.target.value;
    setForm({ ...form, hora, minuto: hora === String(HORA_ABERTURA_MAX) ? '00' : form.minuto });
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
      // Os campos vão um a um para ficar à vista o que a API recebe: os três
      // campos da duração não viajam, só a soma em minutos.
      await api.post('/auctions', {
        lote: form.lote,
        descricao: form.descricao,
        imagem: form.imagem,
        precoBase: Number(form.precoBase),
        incremento: Number(form.incremento),
        comecaEm: comecaEm.toISOString(),
        duracaoMinutos,
      });
      sucesso(`Leilão "${form.lote}" agendado para as ${form.hora}:${form.minuto}.`);
      setForm(formVazio());
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
          <div className="col-12 col-md-5">
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
          <div className="col-12 col-md-3">
            <label className="form-label small mb-1" htmlFor="hora">Começa hoje às</label>
            <div className="input-group">
              <select id="hora" className="form-select" value={form.hora} onChange={mudarHora} aria-label="Hora">
                {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="input-group-text px-2">:</span>
              <select className="form-select" value={form.minuto} onChange={mudar('minuto')} aria-label="Minutos">
                {minutosPossiveis.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <small className={horaValida ? 'text-black-50' : 'text-danger'}>
              {foraDeHoras
                ? `Hoje já não dá: as aberturas são entre as 0${HORA_ABERTURA_MIN}:00 e as ${HORA_ABERTURA_MAX}:00.`
                : horaValida
                  ? `Abre daqui a ${emPalavras(faltam)}.`
                  : 'Essa hora já passou.'}
            </small>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor="duracao-dias">Duração</label>
            <div className="input-group">
              <input id="duracao-dias" type="number" min="0" max="7" className="form-control"
                value={form.dias} onChange={mudar('dias')} aria-label="Dias" />
              <span className="input-group-text px-2">dias</span>
              <input id="duracao-horas" type="number" min="0" max="23" className="form-control"
                value={form.horas} onChange={mudar('horas')} aria-label="Horas" />
              <span className="input-group-text px-2">horas</span>
              <input id="duracao-minutos" type="number" min="0" max="59" className="form-control"
                value={form.minutos} onChange={mudar('minutos')} aria-label="Minutos" />
              <span className="input-group-text px-2">min</span>
            </div>
            <small className={duracaoValida ? 'text-black-50' : 'text-danger'}>
              {duracaoValida
                ? `O leilão dura ${emPalavras(duracaoMinutos)}.`
                : 'A duração tem de ser entre 1 minuto e uma semana.'}
            </small>
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
            <button className="btn btn-terracota" disabled={!duracaoValida || !horaValida}>Agendar leilão</button>
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
