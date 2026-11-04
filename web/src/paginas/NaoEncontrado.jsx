import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <div className="text-center py-5">
      <h1 className="display-6">Página não encontrada</h1>
      <p className="text-black-50">O endereço que abriu não existe nesta aplicação.</p>
      <Link className="btn btn-verde" to="/">Voltar ao catálogo</Link>
    </div>
  );
}
