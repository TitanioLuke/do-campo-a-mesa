import { createContext, useCallback, useContext, useState } from 'react';

/**
 * Avisos temporários (toasts) no canto do ecrã.
 *
 * Serve a aplicação toda: tanto os eventos que chegam pelo WebSocket como as
 * confirmações e os erros dos formulários. Antes cada página mostrava os seus
 * avisos à sua maneira, uns numa caixa por baixo do formulário, outros não
 * apareciam de todo; agora é tudo pelo mesmo sítio.
 */
const AvisosContext = createContext(null);

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const fechar = useCallback(
    (id) => setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id)),
    []
  );

  /** tipo: 'sucesso' | 'erro' | 'info' */
  const notificar = useCallback(
    (texto, tipo = 'info', segundos = 5) => {
      const id = Date.now() + Math.random();
      setAvisos((atuais) => [...atuais, { id, texto, tipo }]);
      setTimeout(() => fechar(id), segundos * 1000);
    },
    [fechar]
  );

  // Atalhos, para as páginas não terem de andar a escrever o tipo
  const sucesso = useCallback((texto) => notificar(texto, 'sucesso'), [notificar]);
  const erro = useCallback((texto) => notificar(texto, 'erro', 7), [notificar]);

  return (
    <AvisosContext.Provider value={{ avisos, notificar, sucesso, erro, fechar }}>
      {children}
    </AvisosContext.Provider>
  );
}

export const useAvisos = () => useContext(AvisosContext);
