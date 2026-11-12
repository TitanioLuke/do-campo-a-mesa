// Converter uma morada escrita em coordenadas (geocodificação).
//
// Usa o serviço público de pesquisa do OpenStreetMap, o Nominatim — o mesmo
// mapa que a aplicação já mostra. Não precisa de chave nem de conta, e por
// isso não há segredos de terceiros neste projeto.
//
// A morada que o produtor escreve é enviada para o openstreetmap.org: é o que
// permite pôr o pin no sítio certo. O resultado — duas coordenadas — fica
// guardado na nossa base de dados, por isso a pesquisa acontece uma vez,
// quando o produtor a pede, e não a cada visita à sua página.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/**
 * Procura uma morada e devolve { latitude, longitude, nome }.
 * Lança um erro com a mensagem a mostrar quando não encontra nada.
 *
 * `countrycodes=pt` limita a pesquisa a Portugal: sem isso, "Rua da Igreja"
 * tanto podia cair em Viana do Castelo como no Brasil.
 */
export async function procurarMorada(morada) {
  const parametros = new URLSearchParams({
    q: morada,
    format: 'json',
    limit: '1',
    countrycodes: 'pt',
  });

  let resposta;
  try {
    resposta = await fetch(`${NOMINATIM}?${parametros}`);
  } catch {
    throw new Error('Não foi possível contactar o serviço de mapas.');
  }

  if (!resposta.ok) throw new Error('O serviço de mapas não respondeu. Tente outra vez.');

  const [encontrado] = await resposta.json();
  if (!encontrado) {
    throw new Error('Não encontrámos essa morada. Escreva a rua e a localidade.');
  }

  return {
    latitude: Number(encontrado.lat),
    longitude: Number(encontrado.lon),
    nome: encontrado.display_name,
  };
}
