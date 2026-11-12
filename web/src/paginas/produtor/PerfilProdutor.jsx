import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import { useAvisos } from '../../contexto/AvisosContext';
import { coordenadasDe } from '../../dados/concelhos';
import { procurarMorada } from '../../servicos/geocodificar';
import { vazio } from '../../servicos/validacao';
import SelectLocalidade from '../../componentes/SelectLocalidade';
import Mapa from '../../componentes/Mapa';
import NavProdutor from './NavProdutor';

/**
 * Edição da página pública do produtor.
 * Usa PUT /api/auth/me e atualiza o utilizador no contexto da sessão, para a
 * aplicação toda passar a mostrar os dados novos sem recarregar a página.
 *
 * O ponto no mapa chega-se por dois caminhos, e os dois acabam no mesmo sítio
 * — duas coordenadas guardadas no produtor:
 *   1. escrever a morada e carregar em "Procurar": o OpenStreetMap devolve o
 *      ponto (ver servicos/geocodificar.js);
 *   2. arrastar o pin, para quem está num sítio que nenhuma morada acerta —
 *      uma quinta ao fim de um caminho de terra, por exemplo.
 * O concelho continua a existir à parte: é por ele que se filtra no catálogo.
 */
export default function PerfilProdutor() {
  const { utilizador, atualizar } = useAuth();

  const [form, setForm] = useState({
    nome: utilizador.nome || '',
    localidade: utilizador.localidade || '',
    telefone: utilizador.telefone || '',
    descricao: utilizador.descricao || '',
    morada: utilizador.morada || '',
    latitude: utilizador.latitude ?? null,
    longitude: utilizador.longitude ?? null,
  });
  const { sucesso, erro } = useAvisos();
  const [aGuardar, setAGuardar] = useState(false);
  const [aProcurar, setAProcurar] = useState(false);
  const [tentou, setTentou] = useState(false);

  // Validação própria, por baixo de cada campo (ver servicos/validacao.js)
  const problemas = {
    nome: vazio(form.nome) ? 'O nome não pode ficar vazio.' : '',
    localidade: vazio(form.localidade) ? 'Escolha o concelho.' : '',
  };
  const formularioValido = !Object.values(problemas).some(Boolean);
  const classe = (problema) => `form-control${tentou && problema ? ' is-invalid' : ''}`;

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const temMapa = form.latitude != null && form.longitude != null;

  /** O concelho dá o ponto de partida do mapa; a morada e o pin afinam-no. */
  function mudarLocalidade(valor) {
    const centro = coordenadasDe(valor);
    setForm((f) => ({
      ...f,
      localidade: valor,
      latitude: centro ? centro.latitude : f.latitude,
      longitude: centro ? centro.longitude : f.longitude,
    }));
  }

  async function procurarNoMapa() {
    if (vazio(form.morada)) return erro('Escreva a morada antes de a procurar.');

    setAProcurar(true);
    try {
      // O concelho vai junto: ajuda a desfazer ruas com o mesmo nome
      const { latitude, longitude } = await procurarMorada(`${form.morada}, ${form.localidade}`);
      setForm((f) => ({ ...f, latitude, longitude }));
      sucesso('Mapa colocado na morada. Arraste o pin se quiser afinar.');
    } catch (e) {
      erro(e.message);
    } finally {
      setAProcurar(false);
    }
  }

  async function submeter(evento) {
    evento.preventDefault();
    setTentou(true);
    if (!formularioValido) return erro('Há campos por corrigir no formulário.');

    setAGuardar(true);
    try {
      const atualizado = await api.put('/auth/me', form);
      atualizar(atualizado);
      sucesso('Página pública atualizada.');
    } catch (e) {
      erro(e.message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <>
      <NavProdutor titulo="A minha página pública" />

      <div className="row g-4">
        <div className="col-12 col-lg-7">
          <div className="painel">
            <h2 className="h6">Dados mostrados aos visitantes</h2>

            <form onSubmit={submeter} className="row g-3" noValidate>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1" htmlFor="nome">Nome do produtor / quinta</label>
                <input id="nome" className={classe(problemas.nome)} required value={form.nome} onChange={mudar('nome')} />
                {tentou && problemas.nome && <small className="text-danger">{problemas.nome}</small>}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small mb-1" htmlFor="telefone">Telefone</label>
                <input id="telefone" className="form-control" value={form.telefone} onChange={mudar('telefone')} />
              </div>

              <div className="col-12">
                <label className="form-label small mb-1" htmlFor="localidade">Concelho</label>
                <SelectLocalidade
                  id="localidade"
                  valor={form.localidade}
                  aoMudar={mudarLocalidade}
                  obrigatorio
                  invalido={tentou && !!problemas.localidade}
                />
                {tentou && problemas.localidade
                  ? <small className="text-danger">{problemas.localidade}</small>
                  : <small className="text-black-50">
                      É por aqui que os compradores o encontram nos filtros do catálogo.
                    </small>}
              </div>

              <div className="col-12">
                <label className="form-label small mb-1" htmlFor="morada">Morada</label>
                <div className="input-group">
                  <input
                    id="morada"
                    className="form-control"
                    placeholder="Rua, número e localidade"
                    value={form.morada}
                    onChange={mudar('morada')}
                  />
                  <button type="button" className="btn btn-outline-secondary" disabled={aProcurar} onClick={procurarNoMapa}>
                    {aProcurar ? 'A procurar…' : 'Procurar no mapa'}
                  </button>
                </div>
              </div>

              <div className="col-12">
                {temMapa ? (
                  <>
                    <Mapa
                      arrastavel
                      latitude={form.latitude}
                      longitude={form.longitude}
                      aoMover={(latitude, longitude) => setForm((f) => ({ ...f, latitude, longitude }))}
                    />
                    <small className="text-black-50">
                      Arraste o pin para o sítio exato. Guarde para ficar na sua página.
                    </small>
                  </>
                ) : (
                  <div className="alert alert-light border small mb-0">
                    Escolha o concelho ou procure a morada para aparecer um mapa na sua página.
                  </div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label small mb-1" htmlFor="descricao">Apresentação</label>
                <textarea
                  id="descricao"
                  className="form-control"
                  rows="4"
                  placeholder="Conte aos compradores o que produz e como produz."
                  value={form.descricao}
                  onChange={mudar('descricao')}
                />
              </div>

              <div className="col-12 d-flex gap-2 align-items-center">
                <button className="btn btn-verde" disabled={aGuardar}>
                  {aGuardar ? 'A guardar…' : 'Guardar alterações'}
                </button>
                <Link className="btn btn-outline-secondary" to={`/produtores/${utilizador._id}`}>
                  Ver a minha página
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="painel h-100">
            <h2 className="h6">Como vai aparecer</h2>

            <p className="h5 mb-1">{form.nome || 'Nome do produtor'}</p>
            <p className="text-black-50 small mb-2">
              {form.localidade || 'Concelho por escolher'}
              {form.telefone && ` · Tel. ${form.telefone}`}
            </p>
            {form.morada && <p className="small mb-2">{form.morada}</p>}
            <p className="small mb-0">{form.descricao || 'Ainda não escreveu uma apresentação.'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
