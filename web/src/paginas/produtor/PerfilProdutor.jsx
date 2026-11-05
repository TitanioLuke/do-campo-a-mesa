import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
import { useAvisos } from '../../contexto/AvisosContext';
import { coordenadasDe } from '../../dados/concelhos';
import SelectLocalidade from '../../componentes/SelectLocalidade';
import NavProdutor from './NavProdutor';

/**
 * Edição da página pública do produtor.
 * Usa PUT /api/auth/me e atualiza o utilizador no contexto da sessão, para a
 * aplicação toda passar a mostrar os dados novos sem recarregar a página.
 */
export default function PerfilProdutor() {
  const { utilizador, atualizar } = useAuth();

  const [form, setForm] = useState({
    nome: utilizador.nome || '',
    localidade: utilizador.localidade || '',
    telefone: utilizador.telefone || '',
    descricao: utilizador.descricao || '',
  });
  const { sucesso, erro } = useAvisos();
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // O mapa usa as coordenadas do concelho escolhido, não um valor escrito à mão
  const coordenadas = coordenadasDe(form.localidade);

  async function submeter(evento) {
    evento.preventDefault();
    setAGuardar(true);

    try {
      const atualizado = await api.put('/auth/me', { ...form, ...(coordenadas ?? {}) });
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

            <form onSubmit={submeter} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1" htmlFor="nome">Nome do produtor / quinta</label>
                <input id="nome" className="form-control" required value={form.nome} onChange={mudar('nome')} />
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
                  aoMudar={(valor) => setForm({ ...form, localidade: valor })}
                  obrigatorio
                />
                <small className="text-black-50">
                  O mapa da sua página é colocado automaticamente no concelho que escolher.
                </small>
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
            <p className="small">{form.descricao || 'Ainda não escreveu uma apresentação.'}</p>

            {coordenadas ? (
              <iframe
                className="mapa"
                title="Pré-visualização do mapa"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordenadas.longitude - 0.06}%2C${coordenadas.latitude - 0.04}%2C${coordenadas.longitude + 0.06}%2C${coordenadas.latitude + 0.04}&layer=mapnik&marker=${coordenadas.latitude}%2C${coordenadas.longitude}`}
                loading="lazy"
              />
            ) : (
              <div className="alert alert-light border small mb-0">
                Escolha o concelho para aparecer um mapa na sua página.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
