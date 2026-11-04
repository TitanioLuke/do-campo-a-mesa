import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './contexto/AuthContext';
import { CarrinhoProvider } from './contexto/CarrinhoContext';
import { SocketProvider } from './contexto/SocketContext';

import Cabecalho from './componentes/Cabecalho';
import Rodape from './componentes/Rodape';
import Notificacoes from './componentes/Notificacoes';
import RotaProtegida from './componentes/RotaProtegida';

import Catalogo from './paginas/Catalogo';
import Produto from './paginas/Produto';
import Produtores from './paginas/Produtores';
import PaginaProdutor from './paginas/PaginaProdutor';
import Leiloes from './paginas/Leiloes';
import SalaLeilao from './paginas/SalaLeilao';
import Login from './paginas/Login';
import Registo from './paginas/Registo';
import Carrinho from './paginas/Carrinho';
import MinhasEncomendas from './paginas/MinhasEncomendas';
import NaoEncontrado from './paginas/NaoEncontrado';

import PainelProdutor from './paginas/produtor/PainelProdutor';
import MeusProdutos from './paginas/produtor/MeusProdutos';
import EncomendasProdutor from './paginas/produtor/EncomendasProdutor';
import MeusLeiloes from './paginas/produtor/MeusLeiloes';
import PerfilProdutor from './paginas/produtor/PerfilProdutor';

import PainelAdmin from './paginas/admin/PainelAdmin';

/**
 * Raiz da SPA: estado global (sessão, carrinho, websocket) + routing no cliente.
 */
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CarrinhoProvider>
          <BrowserRouter>
            <Cabecalho />

            <main className="conteudo">
              <Routes>
                {/* --- Públicas (visitante) --- */}
                <Route path="/" element={<Catalogo />} />
                <Route path="/produtos/:id" element={<Produto />} />
                <Route path="/produtores" element={<Produtores />} />
                <Route path="/produtores/:id" element={<PaginaProdutor />} />
                <Route path="/leiloes" element={<Leiloes />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registo" element={<Registo />} />
                <Route path="/carrinho" element={<Carrinho />} />

                {/* --- Comprador --- */}
                <Route
                  path="/leiloes/:id"
                  element={<RotaProtegida papeis={['comprador', 'produtor', 'admin']}><SalaLeilao /></RotaProtegida>}
                />
                <Route
                  path="/encomendas"
                  element={<RotaProtegida papeis={['comprador']}><MinhasEncomendas /></RotaProtegida>}
                />

                {/* --- Produtor --- */}
                <Route path="/produtor" element={<RotaProtegida papeis={['produtor']}><PainelProdutor /></RotaProtegida>} />
                <Route path="/produtor/produtos" element={<RotaProtegida papeis={['produtor']}><MeusProdutos /></RotaProtegida>} />
                <Route path="/produtor/encomendas" element={<RotaProtegida papeis={['produtor']}><EncomendasProdutor /></RotaProtegida>} />
                <Route path="/produtor/leiloes" element={<RotaProtegida papeis={['produtor']}><MeusLeiloes /></RotaProtegida>} />
                <Route path="/produtor/perfil" element={<RotaProtegida papeis={['produtor']}><PerfilProdutor /></RotaProtegida>} />

                {/* --- Administrador --- */}
                <Route path="/admin" element={<RotaProtegida papeis={['admin']}><PainelAdmin /></RotaProtegida>} />

                <Route path="*" element={<NaoEncontrado />} />
              </Routes>
            </main>

            <Notificacoes />
            <Rodape />
          </BrowserRouter>
        </CarrinhoProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
