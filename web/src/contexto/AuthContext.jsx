import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../servicos/api';

// Estado global da sessão: quem está autenticado e qual o seu papel.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [aCarregar, setACarregar] = useState(true);

  // Ao abrir a aplicação, se existir token guardado, confirma-o na API
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setACarregar(false);
      return;
    }
    api
      .get('/auth/me')
      .then(setUtilizador)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setACarregar(false));
  }, []);

  async function entrar(email, password) {
    const { token, utilizador } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', token);
    setUtilizador(utilizador);
    return utilizador;
  }

  async function registar(dados) {
    const { token, utilizador } = await api.post('/auth/registo', dados);
    localStorage.setItem('token', token);
    setUtilizador(utilizador);
    return utilizador;
  }

  function sair() {
    localStorage.removeItem('token');
    setUtilizador(null);
  }

  const valor = {
    utilizador,
    aCarregar,
    entrar,
    registar,
    sair,
    atualizar: setUtilizador,
    temSessao: Boolean(utilizador),
    papel: utilizador?.papel ?? 'visitante',
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
