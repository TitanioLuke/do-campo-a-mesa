import { useState } from 'react';

/** Olho aberto ou riscado, conforme a password esteja à vista ou escondida. */
function Olho({ aberto }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.8 12S5.6 5 12 5s10.2 7 10.2 7-3.8 7-10.2 7S1.8 12 1.8 12z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <line x1="3.5" y1="3.5" x2="20.5" y2="20.5" />}
    </svg>
  );
}

/**
 * Campo de password com um botão para ver o que se escreve.
 * O botão só muda o `type` do input entre `password` e `text` — o valor
 * continua a ser o mesmo estado do formulário.
 */
export default function CampoPassword({ id, valor, aoMudar, ...resto }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="campo-password">
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        className="form-control"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        {...resto}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Esconder a password' : 'Ver a password'}
        title={visivel ? 'Esconder a password' : 'Ver a password'}
      >
        <Olho aberto={visivel} />
      </button>
    </div>
  );
}
