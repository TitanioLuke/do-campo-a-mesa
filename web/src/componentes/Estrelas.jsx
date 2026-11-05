/**
 * Uma estrela em SVG. Cheia fica preenchida, vazia fica só com o contorno.
 * Usa `currentColor`, por isso herda a cor de quem a contém (.estrelas).
 */
function Estrela({ cheia }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={cheia ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
    </svg>
  );
}

/** Mostra uma nota de 0 a 5 em estrelas. */
export default function Estrelas({ nota = 0, total }) {
  const cheias = Math.round(nota);
  const descricao = total !== undefined
    ? `${nota} em 5, de ${total} avaliações`
    : `${nota} em 5`;

  return (
    <span className="estrelas" title={descricao} role="img" aria-label={descricao}>
      {[1, 2, 3, 4, 5].map((posicao) => <Estrela key={posicao} cheia={posicao <= cheias} />)}
      {total !== undefined && <small className="text-black-50 ms-1">({total})</small>}
    </span>
  );
}
