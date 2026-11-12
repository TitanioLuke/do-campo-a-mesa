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

  // A unidade afina à medida que o fim se aproxima: "2d 23h" enquanto falta
  // muito, "5h 42min" no último dia e "12:45" na última hora. Os segundos só
  // aparecem quando já contam para alguma coisa — ninguém precisa de os ver
  // num leilão que ainda dura dois dias.
  let texto;
  if (dias > 0) texto = `${dias}d ${horas}h`;
  else if (horas > 0) texto = `${horas}h ${dois(minutos)}min`;
  else texto = `${dois(minutos)}:${dois(segundos)}`;

  return <span className="relogio">{texto}</span>;
}
