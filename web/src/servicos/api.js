// Camada única de acesso à API REST.
// Todos os componentes passam por aqui, por isso o token e o tratamento
// de erros ficam num sítio só.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function token() {
  return localStorage.getItem('token');
}

/**
  * O `fetch` só rejeita quando o pedido nem chega ao servidor: sem rede, servidor
  * em baixo, ou ainda a arrancar. A mensagem do browser nesse caso é
  * "Failed to fetch", em inglês e sem explicar nada — por isso é traduzida aqui,
  * num sítio só, em vez de em cada página.
  */
const ERRO_DE_REDE = 'Não foi possível contactar o servidor. Verifique a ligação e tente outra vez.';

async function pedido(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(`${API_URL}/api${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error(ERRO_DE_REDE);
  }

  if (resposta.status === 204) return null; // No Content

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || `Erro ${resposta.status}`);
  return dados;
}

export const api = {
  get: (caminho) => pedido('GET', caminho),
  post: (caminho, corpo) => pedido('POST', caminho, corpo),
  put: (caminho, corpo) => pedido('PUT', caminho, corpo),
  patch: (caminho, corpo) => pedido('PATCH', caminho, corpo),
  del: (caminho) => pedido('DELETE', caminho),

  // Upload de imagem (multipart/form-data, sem Content-Type manual)
  async upload(ficheiro) {
    const dados = new FormData();
    dados.append('imagem', ficheiro);

    let resposta;
    try {
      resposta = await fetch(`${API_URL}/api/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: dados,
      });
    } catch {
      throw new Error(ERRO_DE_REDE);
    }
    const json = await resposta.json();
    if (!resposta.ok) throw new Error(json.erro || 'Falha no upload');
    return json.url;
  },
};

/** Formata um número como preço em euros. */
export const euros = (valor) =>
  Number(valor || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

/** Formata uma data no formato português. */
export const dataPt = (valor) =>
  new Date(valor).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
