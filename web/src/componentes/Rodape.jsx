import { API_URL } from '../servicos/api';

export default function Rodape() {
  return (
    <footer className="rodape">
      <p className="mb-1">
        <strong>Do Campo à Mesa</strong> — mercado digital de produtores locais com leilões em direto
      </p>
      <p className="mb-0">
        Trabalho prático de Desenvolvimento Web e para a Cloud · IPVC–ESTG ·{' '}
        <a className="text-decoration-underline text-white-50" href={`${API_URL}/api-docs`} target="_blank" rel="noreferrer">
          Documentação da API
        </a>
      </p>
    </footer>
  );
}
