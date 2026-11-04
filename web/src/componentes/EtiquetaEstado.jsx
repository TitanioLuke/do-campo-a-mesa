/** Etiqueta colorida com o estado de uma encomenda. */
export default function EtiquetaEstado({ estado }) {
  return <span className={`etiqueta estado-${estado}`}>{estado}</span>;
}
