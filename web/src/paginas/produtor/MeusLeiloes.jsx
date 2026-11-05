import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataPt, euros } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import NavProdutor from './NavProdutor';
import Contador from '../../componentes/Contador';

// Colunas secundárias das tabelas: escondidas no telemóvel e visíveis a
// partir de md (768 px), para os botões de ação caberem no ecrã pequeno.
const SECUNDARIA = 'd-none d-md-table-cell';

const VAZIO = { lote: '', descricao: '', precoBase: '', incremento: 5, duracaoMinutos: 30, imagem: '' };

export default function MeusLeiloes() {
  const { utilizador } = useAuth();
  const [leiloes, setLeiloes] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = () =>
    api.get(`/auctions?produtor=${utilizador._id}`).then(setLeiloes).catch(() => {});

  useEffect(() => { carregar(); }, [utilizador._id]);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function escolherImagem(evento) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;
    try {
      setForm({ ...form, imagem: await api.upload(ficheiro) });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function submeter(evento) {
    evento.preventDefault();
    setErro(''); setAviso('');
    try {
      await api.post('/auctions', {
        ...form,
        precoBase: Number(form.precoBase),
        incremento: Number(form.incremento),
        duracaoMinutos: Number(form.duracaoMinutos),
      });
      setAviso('Leilão criado e já a decorrer.');
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagar(leilao) {
    if (!confirm(`Apagar o leilão "${leilao.lote}"?`)) return;
    await api.del(`/auctions/${leilao._id}`);
    carregar();
  }

  return (
    <>
      <NavProdutor titulo="Os meus leilões" />

      <div className="painel mb-4">
        <h2 className="h6">Criar leilão</h2>

        <form onSubmit={submeter} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor="lote">Lote</label>
            <input id="lote" className="form-control" required placeholder="Ex.: Lote de 50 kg de kiwi" value={form.lote} onChange={mudar('lote')} />
          </div>
          <div className="col-4 col-md-2">
            <label className="form-label small mb-1" htmlFor="precoBase">Preço base (€)</label>
            <input id="precoBase" type="number" min="0" step="0.5" className="form-control" required value={form.precoBase} onChange={mudar('precoBase')} />
          </div>
          <div className="col-4 col-md-2">
            <label className="form-label small mb-1" htmlFor="incremento">Incremento (€)</label>
            <input id="incremento" type="number" min="1" step="1" className="form-control" required value={form.incremento} onChange={mudar('incremento')} />
          </div>
          <div className="col-4 col-md-2">
            <label className="form-label small mb-1" htmlFor="duracao">Duração (min)</label>
            <input id="duracao" type="number" min="1" className="form-control" required value={form.duracaoMinutos} onChange={mudar('duracaoMinutos')} />
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

          {erro && <div className="col-12"><div className="alert alert-danger py-2 mb-0">{erro}</div></div>}
          {aviso && <div className="col-12"><div className="alert alert-success py-2 mb-0">{aviso}</div></div>}

          <div className="col-12">
            <button className="btn btn-terracota">Começar leilão</button>
          </div>
        </form>
      </div>

      <div className="painel">
        <h2 className="h6">Leilões ({leiloes.length})</h2>
        <div className="table-responsive">
          <table className="tabela-simples">
            <thead>
              <tr><th>Lote</th><th>Atual</th><th className={SECUNDARIA}>Melhor licitação</th><th>Termina</th><th /></tr>
            </thead>
            <tbody>
              {leiloes.map((l) => (
                <tr key={l._id}>
                  <td><Link to={`/leiloes/${l._id}`} className="text-dark fw-semibold">{l.lote}</Link></td>
                  <td>{euros(l.licitacaoAtual.valor)}</td>
                  <td className={SECUNDARIA}>{l.licitacaoAtual.nome || <span className="text-black-50">—</span>}</td>
                  <td>
                    {l.estado === 'ativo' ? <Contador terminaEm={l.terminaEm} /> : <span className="etiqueta estado-entregue">terminado</span>}
                    <div className="small text-black-50">{dataPt(l.terminaEm)}</div>
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => apagar(l)}>Apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leiloes.length === 0 && <p className="text-black-50 small mb-0">Ainda não criou leilões.</p>}
      </div>
    </>
  );
}
