/** Mostra uma nota de 0 a 5 em estrelas. */
export default function Estrelas({ nota = 0, total }) {
  const cheias = Math.round(nota);
  return (
    <span className="estrelas" title={`${nota} em 5`}>
      {'★'.repeat(cheias)}
      <span className="text-black-50">{'★'.repeat(5 - cheias)}</span>
      {total !== undefined && <small className="text-black-50 ms-1">({total})</small>}
    </span>
  );
}
