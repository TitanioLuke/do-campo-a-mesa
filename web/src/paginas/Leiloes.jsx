import { useEffect, useState } from 'react';
import { api } from '../servicos/api';
import CartaoLeilao from '../componentes/CartaoLeilao';

export default function Leiloes() {
  const [leiloes, setLeiloes] = useState([]);
  const [estado, setEstado] = useState('ativo');

  useEffect(() => {
    api.get(`/auctions?estado=${estado}`).then(setLeiloes).catch(() => {});
  }, [estado]);

  return (
    <>
      <h1 className="h4 mb-3">Leilões</h1>

      <div className="btn-group mb-3" role="group">
        <button className={`btn btn-sm ${estado === 'ativo' ? 'btn-verde' : 'btn-outline-secondary'}`} onClick={() => setEstado('ativo')}>
          Em direto
        </button>
        <button className={`btn btn-sm ${estado === 'terminado' ? 'btn-verde' : 'btn-outline-secondary'}`} onClick={() => setEstado('terminado')}>
          Terminados
        </button>
      </div>

      {leiloes.length === 0 ? (
        <div className="alert alert-light border text-center">
          {estado === 'ativo' ? 'Não há leilões a decorrer neste momento.' : 'Ainda não há leilões terminados.'}
        </div>
      ) : (
        <div className="grelha-leiloes">
          {leiloes.map((l) => <CartaoLeilao key={l._id} leilao={l} />)}
        </div>
      )}
    </>
  );
}
