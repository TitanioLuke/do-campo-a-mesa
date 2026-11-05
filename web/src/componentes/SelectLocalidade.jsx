import { CONCELHOS_POR_DISTRITO } from '../dados/concelhos';

/**
 * Selector de concelho, agrupado por distrito.
 *
 * É usado no registo, na página pública do produtor e nos filtros. Como é
 * sempre a mesma lista, o nome que fica gravado no produtor e o nome por que
 * se filtra são exatamente iguais — não há "Ponte de Lima" a falhar contra
 * "ponte de lima" nem contra "Ponte Lima".
 */
export default function SelectLocalidade({ id, valor, aoMudar, textoVazio, obrigatorio = false }) {
  return (
    <select
      id={id}
      className="form-select"
      value={valor}
      required={obrigatorio}
      onChange={(evento) => aoMudar(evento.target.value)}
    >
      <option value="">{textoVazio || 'Escolher concelho…'}</option>

      {Object.entries(CONCELHOS_POR_DISTRITO).map(([distrito, concelhos]) => (
        <optgroup key={distrito} label={distrito}>
          {concelhos.map((concelho) => (
            <option key={`${distrito}-${concelho.nome}`} value={concelho.nome}>{concelho.nome}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
