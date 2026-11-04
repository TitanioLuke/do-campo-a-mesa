import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../servicos/api';
import { useAuth } from '../../contexto/AuthContext';
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
    latitude: utilizador.latitude ?? '',
    longitude: utilizador.longitude ?? '',
  });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function submeter(evento) {
    evento.preventDefault();
    setErro(''); setAviso(''); setAGuardar(true);

    try {
      const atualizado = await api.put('/auth/me', {
        ...form,
        // os campos numéricos vão como número, ou vazios se não forem preenchidos
        latitude: form.latitude === '' ? undefined : Number(form.latitude),
        longitude: form.longitude === '' ? undefined : Number(form.longitude),
      });
      atualizar(atualizado);
      setAviso('Página pública atualizada.');
    } catch (e) {
      setErro(e.message);
    } finally {
      setAGuardar(false);
    }
  }

  const temMapa = form.latitude !== '' && form.longitude !== '';

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
                <label className="form-label small mb-1" htmlFor="localidade">Localidade</label>
                <input id="localidade" className="form-control" placeholder="Ex.: Ponte de Lima" value={form.localidade} onChange={mudar('localidade')} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small mb-1" htmlFor="telefone">Telefone</label>
                <input id="telefone" className="form-control" value={form.telefone} onChange={mudar('telefone')} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1" htmlFor="latitude">Latitude</label>
                <input id="latitude" type="number" step="any" className="form-control" placeholder="41.7681" value={form.latitude} onChange={mudar('latitude')} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1" htmlFor="longitude">Longitude</label>
                <input id="longitude" type="number" step="any" className="form-control" placeholder="-8.5836" value={form.longitude} onChange={mudar('longitude')} />
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

              {erro && <div className="col-12"><div className="alert alert-danger py-2 mb-0">{erro}</div></div>}
              {aviso && <div className="col-12"><div className="alert alert-success py-2 mb-0">{aviso}</div></div>}

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
              📍 {form.localidade || 'Localidade por indicar'}
              {form.telefone && ` · ☎ ${form.telefone}`}
            </p>
            <p className="small">{form.descricao || 'Ainda não escreveu uma apresentação.'}</p>

            {temMapa ? (
              <iframe
                className="mapa"
                title="Pré-visualização do mapa"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.longitude - 0.02}%2C${form.latitude - 0.015}%2C${Number(form.longitude) + 0.02}%2C${Number(form.latitude) + 0.015}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`}
                loading="lazy"
              />
            ) : (
              <div className="alert alert-light border small mb-0">
                Preencha a latitude e a longitude para aparecer um mapa na sua página.
                Pode copiá-las do Google Maps ou do OpenStreetMap.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
