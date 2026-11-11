/**
 * Mostrado quando um pedido ao servidor falhou.
 *
 * É propositadamente distinto do estado "não há resultados": dizer ao
 * utilizador que não há produtos quando o servidor é que não respondeu é
 * dar-lhe informação errada. Num alojamento gratuito, em que o servidor
 * adormece e demora a acordar, isto acontece mesmo.
 */
export default function FalhaAoCarregar({ oQue, aoTentar }) {
  return (
    <div className="painel text-center py-5">
      <p className="h5 mb-2">Não foi possível carregar {oQue}.</p>
      <p className="text-black-50 mb-3">
        O servidor pode estar sem resposta ou ainda a arrancar.
        Tente outra vez dentro de alguns segundos.
      </p>
      <button className="btn btn-verde" onClick={aoTentar}>Tentar outra vez</button>
    </div>
  );
}
