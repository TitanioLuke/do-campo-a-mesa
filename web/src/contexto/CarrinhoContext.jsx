import { createContext, useContext, useEffect, useState } from 'react';

// Estado global do carrinho. Fica guardado no localStorage para não se
// perder quando a página é recarregada.
const CarrinhoContext = createContext(null);

const CHAVE = 'carrinho';

export function CarrinhoProvider({ children }) {
  const [linhas, setLinhas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(linhas));
  }, [linhas]);

  function adicionar(produto, quantidade = 1) {
    setLinhas((atuais) => {
      const existente = atuais.find((l) => l.produto._id === produto._id);
      if (existente) {
        return atuais.map((l) =>
          l.produto._id === produto._id
            ? { ...l, quantidade: Math.min(l.quantidade + quantidade, produto.stock) }
            : l
        );
      }
      return [...atuais, { produto, quantidade }];
    });
  }

  const alterarQuantidade = (id, quantidade) =>
    setLinhas((atuais) =>
      atuais.map((l) => (l.produto._id === id ? { ...l, quantidade: Math.max(1, quantidade) } : l))
    );

  const remover = (id) => setLinhas((atuais) => atuais.filter((l) => l.produto._id !== id));
  const limpar = () => setLinhas([]);

  const total = linhas.reduce((soma, l) => soma + l.produto.preco * l.quantidade, 0);
  const numArtigos = linhas.reduce((soma, l) => soma + l.quantidade, 0);

  return (
    <CarrinhoContext.Provider
      value={{ linhas, adicionar, alterarQuantidade, remover, limpar, total, numArtigos }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export const useCarrinho = () => useContext(CarrinhoContext);
