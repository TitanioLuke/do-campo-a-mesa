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
      {/* Cabeçalho, corpo e rodapé são três zonas com fundos e limites
          próprios: o título fica preso em cima, os botões em baixo, e o corpo
          é o único que desliza quando o conteúdo é grande. */}
      <div
        className="caixa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header>
          <h2>{titulo}</h2>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={aoFechar} />
        </header>

        <div className="corpo">{children}</div>

        {rodape && <footer>{rodape}</footer>}
      </div>
    </div>
  );
}
