import SelectLocalidade from './SelectLocalidade';

const CATEGORIAS = ['Todas', 'Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Outros'];
const EPOCAS = ['Todas', 'Primavera', 'Verão', 'Outono', 'Inverno', 'Todo o ano'];

/**
 * Barra de pesquisa e filtros do catálogo.
 * Cada campo está ligado ao estado `filtro` do componente Catalogo
 * (data binding: value + onChange).
 */
export default function FiltrosCatalogo({ filtro, produtores = [], aoMudar, aoLimpar, numResultados }) {
  const mudar = (campo) => (evento) =>
    aoMudar({ ...filtro, [campo]: evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value });

  return (
    <section className="filtros">
      <div className="row g-2">
        <div className="col-12 col-md-6 col-lg-4">
          <label className="form-label small mb-1" htmlFor="q">Pesquisar</label>
          <input
            id="q"
            className="form-control"
            placeholder="Nome, ingrediente ou descrição…"
            value={filtro.q}
            onChange={mudar('q')}
          />
        </div>

        <div className="col-6 col-md-3 col-lg-2">
          <label className="form-label small mb-1" htmlFor="categoria">Categoria</label>
          <select id="categoria" className="form-select" value={filtro.categoria} onChange={mudar('categoria')}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-6 col-md-3 col-lg-2">
          <label className="form-label small mb-1" htmlFor="epoca">Época</label>
          <select id="epoca" className="form-select" value={filtro.epoca} onChange={mudar('epoca')}>
            {EPOCAS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <label className="form-label small mb-1" htmlFor="produtor">Produtor</label>
          <select id="produtor" className="form-select" value={filtro.produtor} onChange={mudar('produtor')}>
            <option value="">Todos os produtores</option>
            {produtores.map((p) => (
              <option key={p._id} value={p._id}>
                {p.nome}{p.localidade ? ` · ${p.localidade}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <label className="form-label small mb-1" htmlFor="localidade">Localidade</label>
          <SelectLocalidade
            id="localidade"
            valor={filtro.localidade}
            aoMudar={(valor) => aoMudar({ ...filtro, localidade: valor })}
            textoVazio="Todas as localidades"
          />
        </div>

        <div className="col-6 col-md-3 col-lg-2">
          <label className="form-label small mb-1" htmlFor="precoMax">Preço máximo (€)</label>
          <input id="precoMax" type="number" min="0" step="0.5" className="form-control" value={filtro.precoMax} onChange={mudar('precoMax')} />
        </div>

        <div className="col-12 col-md-6 col-lg-3 d-flex align-items-end">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="bio" checked={filtro.bio} onChange={mudar('bio')} />
            <label className="form-check-label" htmlFor="bio">Apenas modo biológico</label>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-2 d-flex align-items-end">
          <select className="form-select" value={filtro.ordenar} onChange={mudar('ordenar')} aria-label="Ordenar">
            <option value="recentes">Mais recentes</option>
            <option value="precoAsc">Preço: mais baratos</option>
            <option value="precoDesc">Preço: mais caros</option>
          </select>
        </div>

        <div className="col-12 col-lg-2 d-flex align-items-end justify-content-between">
          <small className="text-black-50">{numResultados} resultado(s)</small>
          <button className="btn btn-sm btn-outline-secondary" onClick={aoLimpar}>Limpar</button>
        </div>
      </div>
    </section>
  );
}
