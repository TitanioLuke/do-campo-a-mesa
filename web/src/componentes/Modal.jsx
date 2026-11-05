import { useEffect } from 'react';

/**
 * Janela modal simples, usada para confirmar uma licitação e para avaliar.
 * Fecha com a tecla Escape ou com um clique fora da caixa, e enquanto está
 * aberta a página de trás não desliza.
 */
export default function Modal({ titulo, aoFechar, children, rodape }) {
  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aoFechar]);

  return (
    <div className="fundo-modal" onClick={aoFechar} role="presentation">
      <div
        className="caixa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <h2 className="h6 mb-0">{titulo}</h2>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={aoFechar} />
        </div>

        {children}

        {rodape && <div className="d-flex gap-2 justify-content-end mt-3">{rodape}</div>}
      </div>
    </div>
  );
}
