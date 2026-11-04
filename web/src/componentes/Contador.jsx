import { useEffect, useState } from 'react';

/**
 * Contagem decrescente.
 * O servidor envia apenas a data de fim (`terminaEm`); é o cliente que calcula
 * o tempo que falta, por isso todos os clientes mostram o mesmo valor.
 */
export default function Contador({ terminaEm, aoTerminar }) {
  const restante = () => Math.max(0, new Date(terminaEm) - Date.now());
  const [ms, setMs] = useState(restante);

  useEffect(() => {
    setMs(restante());
    const intervalo = setInterval(() => {
      const novo = restante();
      setMs(novo);
      if (novo === 0) {
        clearInterval(intervalo);
        aoTerminar?.();
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [terminaEm]);

  const total = Math.floor(ms / 1000);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dois = (n) => String(n).padStart(2, '0');

  if (ms === 0) return <span className="relogio">terminado</span>;

  // Leilões longos mostram "3d 04:12:08"; os curtos só "12:08" ou "04:12:08"
  return (
    <span className="relogio">
      ⏱ {dias > 0 && `${dias}d `}
      {(dias > 0 || horas > 0) && `${dois(horas)}:`}
      {dois(minutos)}:{dois(segundos)}
    </span>
  );
}
