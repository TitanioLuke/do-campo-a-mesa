import { useAvisos } from '../contexto/AvisosContext';

/** Avisos temporários no canto inferior do ecrã. */
export default function Notificacoes() {
  const { avisos, fechar } = useAvisos();
  if (avisos.length === 0) return null;

  return (
    <div className="notificacoes" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`notificacao aviso-${aviso.tipo} d-flex justify-content-between align-items-start gap-2`}>
          <span>{aviso.texto}</span>
          <button className="btn-close btn-sm" aria-label="Fechar" onClick={() => fechar(aviso.id)} />
        </div>
      ))}
    </div>
  );
}
