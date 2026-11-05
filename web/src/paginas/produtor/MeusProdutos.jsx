import { useEffect, useState } from 'react';
import { api, euros } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import NavProdutor from './NavProdutor';

const CATEGORIAS = ['Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Outros'];
const UNIDADES = ['kg', 'un', 'L', 'dz', 'cx'];
const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno', 'Todo o ano'];

// Colunas secundárias das tabelas: escondidas no telemóvel e visíveis a
// partir de md (768 px), para os botões de ação caberem no ecrã pequeno.
const SECUNDARIA = 'd-none d-md-table-cell';

const VAZIO = {
  nome: '', descricao: '', categoria: 'Hortícolas', preco: '', unidade: 'kg',
  stock: '', biologico: false, epoca: 'Todo o ano', imagem: '',
};

export default function MeusProdutos() {
  const { utilizador } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [aEditar, setAEditar] = useState(null); // _id do produto em edição
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = () =>
    api.get(`/products?produtor=${utilizador._id}`).then(setProdutos).catch(() => {});

  useEffect(() => { carregar(); }, [utilizador._id]);

  const mudar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

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
    const corpo = { ...form, preco: Number(form.preco), stock: Number(form.stock || 0) };

    try {
      if (aEditar) {
        await api.put(`/products/${aEditar}`, corpo);
        setAviso('Produto atualizado.');
      } else {
        await api.post('/products', corpo);
        setAviso('Produto criado.');
      }
      setForm(VAZIO);
      setAEditar(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function editar(produto) {
    setAEditar(produto._id);
    setForm({
      nome: produto.nome, descricao: produto.descricao || '', categoria: produto.categoria,
      preco: produto.preco, unidade: produto.unidade, stock: produto.stock,
      biologico: produto.biologico, epoca: produto.epoca, imagem: produto.imagem || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function apagar(produto) {
    if (!confirm(`Apagar "${produto.nome}"?`)) return;
    await api.del(`/products/${produto._id}`);
    carregar();
  }

  return (
    <>
      <NavProdutor titulo="Os meus produtos" />

      <div className="painel mb-4">
        <h2 className="h6">{aEditar ? 'Editar produto' : 'Novo produto'}</h2>

        <form onSubmit={submeter} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor="nome">Nome</label>
            <input id="nome" className="form-control" required value={form.nome} onChange={mudar('nome')} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="categoria">Categoria</label>
            <select id="categoria" className="form-select" value={form.categoria} onChange={mudar('categoria')}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor="epoca">Época</label>
            <select id="epoca" className="form-select" value={form.epoca} onChange={mudar('epoca')}>
              {EPOCAS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>

          <div className="col-4 col-md-3">
            <label className="form-label small mb-1" htmlFor="preco">Preço (€)</label>
            <input id="preco" type="number" step="0.01" min="0" className="form-control" required value={form.preco} onChange={mudar('preco')} />
          </div>
          <div className="col-4 col-md-3">
            <label className="form-label small mb-1" htmlFor="unidade">Unidade</label>
            <select id="unidade" className="form-select" value={form.unidade} onChange={mudar('unidade')}>
              {UNIDADES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-4 col-md-3">
            <label className="form-label small mb-1" htmlFor="stock">Stock</label>
            <input id="stock" type="number" min="0" className="form-control" value={form.stock} onChange={mudar('stock')} />
          </div>
          <div className="col-12 col-md-3 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="biologico" checked={form.biologico} onChange={mudar('biologico')} />
              <label className="form-check-label" htmlFor="biologico">Modo biológico</label>
            </div>
          </div>

          <div className="col-12">
            <label className="form-label small mb-1" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" className="form-control" rows="2" value={form.descricao} onChange={mudar('descricao')} />
          </div>

          <div className="col-12 col-md-8">
            <label className="form-label small mb-1" htmlFor="imagem">Fotografia</label>
            <input id="imagem" type="file" accept="image/*" className="form-control" onChange={escolherImagem} />
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            {form.imagem && <img src={form.imagem} alt="Pré-visualização" style={{ height: 60, borderRadius: 8 }} />}
          </div>

          {erro && <div className="col-12"><div className="alert alert-danger py-2 mb-0">{erro}</div></div>}
          {aviso && <div className="col-12"><div className="alert alert-success py-2 mb-0">{aviso}</div></div>}

          <div className="col-12 d-flex gap-2">
            <button className="btn btn-verde">{aEditar ? 'Guardar alterações' : 'Criar produto'}</button>
            {aEditar && (
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setAEditar(null); setForm(VAZIO); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="painel">
        <h2 className="h6">Catálogo ({produtos.length})</h2>
        <div className="table-responsive">
          <table className="tabela-simples">
            <thead>
              <tr><th>Produto</th><th className={SECUNDARIA}>Categoria</th><th>Preço</th><th>Stock</th><th /></tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong>{p.nome}</strong>
                    {p.biologico && <span className="etiqueta etiqueta-bio ms-2">bio</span>}
                  </td>
                  <td className={SECUNDARIA}>{p.categoria}</td>
                  <td>{euros(p.preco)} / {p.unidade}</td>
                  <td className={p.stock < 5 ? 'text-danger fw-bold' : ''}>{p.stock}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => editar(p)}>Editar</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => apagar(p)}>Apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {produtos.length === 0 && <p className="text-black-50 small mb-0">Ainda não tem produtos.</p>}
      </div>
    </>
  );
}
