import { useState } from 'react';
import { useListaLeiloes } from '../hooks/useListaLeiloes';
import CartaoLeilao from '../componentes/CartaoLeilao';

const SEPARADORES = [
  ['ativo', 'Em direto'],
  ['agendado', 'Por começar'],
  ['terminado', 'Terminados'],
];

const VAZIO = {
  ativo: 'Não há leilões a decorrer neste momento.',
  agendado: 'Não há leilões agendados.',
  terminado: 'Ainda não há leilões terminados.',
};

export default function Leiloes() {
  const [estado, setEstado] = useState('ativo');
  // A lista mantém-se sozinha: as licitações dos outros aparecem aqui em direto
  const { leiloes, aCarregar } = useListaLeiloes(`?estado=${estado}`);

  return (
    <>
      <h1 className="h4 mb-3">Leilões</h1>

      <div className="btn-group mb-3" role="group">
        {SEPARADORES.map(([chave, nome]) => (
          <button
            key={chave}
            className={`btn btn-sm ${estado === chave ? 'btn-verde' : 'btn-outline-secondary'}`}
            onClick={() => setEstado(chave)}
          >
            {nome}
          </button>
        ))}
      </div>

      {aCarregar && <p className="text-center py-4 text-black-50">A carregar leilões…</p>}

      {!aCarregar && leiloes.length === 0 ? (
        <div className="painel text-center py-5">
          <p className="h5 mb-0">{VAZIO[estado]}</p>
        </div>
      ) : (
        <div className="grelha-leiloes">
          {leiloes.map((l) => <CartaoLeilao key={l._id} leilao={l} />)}
        </div>
      )}
    </>
  );
}
