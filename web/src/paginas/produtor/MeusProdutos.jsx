import { useEffect, useState } from 'react';
import { api, euros, imagemUrl } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import { useAvisos } from '../../contexto/AvisosContext';
import NavProdutor from './NavProdutor';
import ModalConfirmar from '../../componentes/ModalConfirmar';
import { vazio } from '../../servicos/validacao';

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
  // Enquanto o administrador não aprovar o registo não há formulário: a API
  // recusa na mesma, mas um formulário que só serve para receber um erro é
  // pior do que não estar lá.
  const aprovado = utilizador.aprovado === 'aprovado';
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [aEditar, setAEditar] = useState(null); // _id do produto em edição
  const [aApagar, setAApagar] = useState(null); // produto à espera de confirmação
  const [tentou, setTentou] = useState(false);
  const { sucesso, erro } = useAvisos();

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
      sucesso('Fotografia carregada.');
    } catch (e) {
      erro(e.message);
    }
  }

  // Validação própria, por baixo de cada campo (ver servicos/validacao.js)
  const problemas = {
    nome: vazio(form.nome) ? 'Escreva o nome do produto.' : '',
    preco:
      vazio(form.preco) ? 'Indique o preço.'
        : Number(form.preco) < 0 ? 'O preço não pode ser negativo.'
        : '',
  };
  const formularioValido = !Object.values(problemas).some(Boolean);
  const classe = (problema) => `form-control${tentou && problema ? ' is-invalid' : ''}`;

  async function submeter(evento) {
    evento.preventDefault();
    setTentou(true);
    if (!formularioValido) return erro('Há campos por corrigir no formulário.');

    const corpo = { ...form, preco: Number(form.preco), stock: Number(form.stock || 0) };

    try {
      if (aEditar) {
        await api.put(`/products/${aEditar}`, corpo);
        sucesso(`"${corpo.nome}" atualizado.`);
      } else {
        await api.post('/products', corpo);
        sucesso(`"${corpo.nome}" criado.`);
      }
      setForm(VAZIO);
      setAEditar(null);
      setTentou(false);
      carregar();
    } catch (e) {
      erro(e.message);
    }
  }

  function editar(produto) {
    setAEditar(produto._id);
    setTentou(false);
    setForm({
      nome: produto.nome, descricao: produto.descricao || '', categoria: produto.categoria,
      preco: produto.preco, unidade: produto.unidade, stock: produto.stock,
      biologico: produto.biologico, epoca: produto.epoca, imagem: produto.imagem || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function apagar() {
    const produto = aApagar;
    setAApagar(null);
    try {
      await api.del(`/products/${produto._id}`);
      sucesso(`"${produto.nome}" apagado.`);
      carregar();
    } catch (e) {
      erro(e.message);
    }
  }

  return (
    <>
      <NavProdutor titulo="Os meus produtos" />

      {aprovado && (
      <div className="painel mb-4">
        <h2 className="h6">{aEditar ? 'Editar produto' : 'Novo produto'}</h2>

        <form onSubmit={submeter} className="row g-3" noValidate>
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor="nome">Nome</label>
            <input id="nome" className={classe(problemas.nome)} required value={form.nome} onChange={mudar('nome')} />
            {tentou && problemas.nome && <small className="text-danger">{problemas.nome}</small>}
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
            <input id="preco" type="number" step="0.01" min="0" className={classe(problemas.preco)} required value={form.preco} onChange={mudar('preco')} />
            {tentou && problemas.preco && <small className="text-danger">{problemas.preco}</small>}
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
            {form.imagem && <img src={imagemUrl(form.imagem)} alt="Pré-visualização" style={{ height: 60, borderRadius: 8 }} />}
          </div>

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
      )}

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
                    {/* Sem aprovação a API recusa, por isso não se mostram botões
                        que só dariam erro. */}
                    {aprovado && (
                      <>
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => editar(p)}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setAApagar(p)}>Apagar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {produtos.length === 0 && <p className="text-black-50 small mb-0">Ainda não tem produtos.</p>}
      </div>

      {aApagar && (
        <ModalConfirmar
          titulo="Apagar produto"
          mensagem={`"${aApagar.nome}" deixa de aparecer no catálogo. As encomendas já feitas não são afetadas, porque guardam uma cópia do nome e do preço.`}
          aoConfirmar={apagar}
          aoFechar={() => setAApagar(null)}
        />
      )}
    </>
  );
}
