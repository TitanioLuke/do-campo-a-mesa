# Do Campo à Mesa

Mercado digital de produtores locais com leilões em tempo real.

Trabalho prático individual de **Desenvolvimento Web e para a Cloud** — Mestrado em Engenharia
Informática, IPVC–ESTG.

A plataforma liga pequenos produtores agrícolas da região (hortícolas, fruta, mel, vinho, queijo)
a consumidores e à restauração local. Os produtores publicam produtos, os compradores fazem
encomendas e, para lotes sazonais ou excedentes, a plataforma organiza **leilões em direto** com
vários compradores a licitar em simultâneo.

| | |
| --- | --- |
| **Aplicação** | https://do-campo-a-mesa-six.vercel.app |
| **API** | https://do-campo-a-mesa-api-1rju.onrender.com |
| **Documentação OpenAPI** | https://do-campo-a-mesa-api-1rju.onrender.com/api-docs |
| **Relatório** | [`Relatorio.pdf`](Relatorio.pdf) — arquitetura e decisões técnicas |

> O alojamento da API é gratuito e adormece ao fim de 15 minutos sem pedidos. O primeiro acesso
> depois disso demora perto de um minuto a responder; os seguintes são imediatos.

---

## Índice

1. [Tecnologias](#tecnologias)
2. [Como instalar e executar](#como-instalar-e-executar)
3. [Contas de demonstração](#contas-de-demonstração)
4. [Funcionalidades por perfil](#funcionalidades-por-perfil)
5. [Estrutura do projeto](#estrutura-do-projeto)

---

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Frontend (SPA) | React 19 + Vite, React Router 7 |
| Estilos | SASS (variáveis, mixins, parciais) + Bootstrap 5 |
| API REST | Node.js + Express 5 |
| Base de dados | MongoDB + Mongoose |
| Tempo real | Socket.io |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Documentação | OpenAPI 3 + Swagger UI |
| Upload de imagens | Multer (pasta local `uploads/`) |
| Mapas | Leaflet + mosaicos do OpenStreetMap |

As decisões por trás destas escolhas estão no [relatório](Relatorio.pdf).

---

## Como instalar e executar

### Pré-requisitos

- **Node.js 22 ou superior** (fixado em `engines` nos dois `package.json`, para o Render e a
  Vercel escolherem a mesma versão que a máquina de desenvolvimento)
- **MongoDB** a correr localmente em `mongodb://127.0.0.1:27017`, ou um URI do MongoDB Atlas

No macOS, com Homebrew:

```bash
brew services start mongodb-community
```

### 1. API

```bash
cd api && npm install && cp .env.example .env
```

O ficheiro `.env` tem de conter:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/do-campo-a-mesa
JWT_SECRET=um-segredo-aleatorio
JWT_EXPIRA=8h
```

Para gerar um segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 2. Preencher a base de dados

```bash
cd api && npm run seed
```

O comando **apaga tudo o que estiver na base de dados** e volta a criá-la de raiz, com 13
utilizadores, 29 produtos, 16 encomendas espalhadas pelas últimas seis semanas, 19 avaliações e
7 leilões. Os dados ficam preparados para mostrar uma situação de cada funcionalidade:

- **3 leilões a decorrer** que duram vários dias, **2 terminados** com histórico de licitações
- **1 leilão agendado**, que abre sozinho poucos minutos depois de semear
- **1 leilão relâmpago**, que termina 5 minutos depois de semear — é com ele que se vê o
  prolongamento automático sem ter de esperar
- **2 registos de produtor por validar**, para mostrar os dois caminhos do administrador
- **1 produto esgotado** e **1 avaliação denunciada** à espera de moderação

Os leilões agendado e relâmpago contam a partir do momento em que o comando corre. Se forem
precisos para uma demonstração, convém semear imediatamente antes.

### 3. Arrancar

Em dois terminais:

```bash
cd api && npm run dev
```

```bash
cd web && npm install && npm run dev
```

| | |
| --- | --- |
| Aplicação | <http://localhost:5173> |
| API | <http://localhost:3000/api> |
| Swagger UI | <http://localhost:3000/api-docs> |

### Ver no telemóvel

O `vite.config.js` manda o servidor atender também no IP da máquina, por isso o terminal mostra
duas moradas:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.74:5173/      ← esta, no telemóvel
```

Basta o telemóvel estar na mesma rede Wi-Fi. Não é preciso configurar o endereço da API: a
aplicação procura-a na mesma máquina que serviu a página, e por isso funciona tanto em
`localhost` como pelo IP — no telemóvel, `localhost` seria o próprio telemóvel.

> `VITE_API_URL` só é preciso para apontar para **outra** API, como a versão publicada na Cloud.
> É o que a Vercel define na publicação.

---

## Contas de demonstração

A password de todas é `123456`. O ecrã de login tem botões que preenchem automaticamente uma
conta de cada papel.

| Papel | Email | Notas |
| --- | --- | --- |
| Administrador | `admin@dcm.pt` | Painel global, validação de produtores e moderação |
| Produtor | `quinta@dcm.pt` | Quinta do Vale, Ponte de Lima — 7 produtos, leilão a decorrer |
| Produtor | `horta@dcm.pt` | Horta da Serra, Viana do Castelo — 7 produtos, leilão terminado |
| Produtor | `apiario@dcm.pt` | Apiário do Minho, Arcos de Valdevez — 5 produtos, leilão a decorrer |
| Produtor | `queijaria@dcm.pt` | Queijaria do Lima, Ponte da Barca — 4 produtos |
| Produtor | `adega@dcm.pt` | Adega do Alvarinho, Monção — 4 produtos, leilão a decorrer |
| Produtor | `pomar@dcm.pt` | Pomar das Caldas, Vizela — **por validar**, já com 2 produtos à espera |
| Produtor | `vinha@dcm.pt` | Vinha do Lima, Ponte de Lima — **por validar**, registo acabado de criar |
| Comprador | `ana@dcm.pt` | 4 encomendas, 4 avaliações feitas, morada guardada no perfil |
| Comprador | `bruno@dcm.pt` | 3 encomendas, uma pendente, **sem** morada no perfil |
| Comprador | `carla@dcm.pt` | Ganhou um leilão, tem licitações a decorrer |
| Comprador | `diogo@dcm.pt` | 3 encomendas, uma pronta para levantamento |
| Comprador | `lagar@dcm.pt` | Restaurante O Lagar — compras em quantidade |

Os produtos do **Pomar das Caldas** não aparecem no catálogo porque o registo do produtor ainda
não foi validado: é o que permite demonstrar a aprovação no painel do administrador.

---

## Funcionalidades por perfil

### Visitante (sem sessão)

- Explorar o catálogo com pesquisa por nome/descrição e filtros por categoria, época, produtor,
  localidade, preço e modo biológico; ordenação por preço ou data. A localidade é escolhida numa
  lista dos **308 concelhos de Portugal**.
- Ver a página pública de cada produtor, com apresentação, mapa e avaliações recebidas.
- Ver a lista de leilões e acompanhar uma sala em direto, sem poder licitar.
- Juntar produtos ao carrinho (guardado no `localStorage`) e registar-se para finalizar.

### Comprador

- Registo com telefone e morada, ambos opcionais. A morada fica no perfil e evita escrevê-la em
  cada compra.
- Carrinho com escolha entre levantamento no produtor ou entrega ao domicílio. Na entrega, quem
  tem morada no perfil escolhe entre **essa morada** e **outra morada**.
- Finalizar a encomenda: o carrinho pode ter produtos de vários produtores e é criada **uma
  encomenda por produtor**.
- Acompanhar os estados (`pendente → confirmada → pronta → entregue`) com **notificação em tempo
  real** sempre que o produtor muda o estado.
- Avaliar **produtos** e **produtores** (1–5 estrelas + comentário), só depois de ter uma
  encomenda entregue e só uma vez por produto / por produtor.
- **Denunciar avaliações** para moderação, na página do produto ou na do produtor.
- **Sininho de notificações** no cabeçalho. As notificações são guardadas no servidor, por
  isso aparecem mesmo que a aplicação não estivesse aberta quando aconteceram, e seguem a
  conta em qualquer computador.
- Entrar na sala de um leilão e licitar: contagem decrescente, número de participantes, histórico
  e atalhos que licitam logo o valor seguinte. Licitar nos últimos 30 segundos **prolonga** o
  leilão.
- Perfil próprio com um resumo das compras.

### Produtor

- Painel com indicadores de vendas e **alertas de stock baixo**.
- Gestão do catálogo: criar, editar e apagar produtos, com upload de fotografia. **Só depois de o
  administrador aprovar o registo.**
- Encomendas recebidas, com filtro por estado e botão para avançar o estado.
- **Agendar leilões**: a abertura escolhe-se à hora e ao minuto, entre as 08:00 e as 18:00 do
  próprio dia; a duração escreve-se em dias, horas e minutos, até ao máximo de uma semana. O
  leilão abre e fecha sozinho.
- Editar a **página pública**, incluindo o ponto no mapa — escrevendo a morada ou arrastando o
  pin.
- **Sininho de notificações**: alguém comprou, alguém avaliou, um leilão acabou, o administrador
  validou o registo. Ficam guardadas no servidor — o produtor não precisa de estar com a
  aplicação aberta para as receber.

### Administrador

- Painel global: compradores, produtores, produtos, encomendas, volume de negócios, leilões
  ativos, registos por validar e avaliações denunciadas.
- **Validar registos de produtores** (aprovar / rejeitar) — o produtor é notificado em tempo real.
- **Moderar avaliações denunciadas**: manter, esconder ou apagar.
- Lista de leilões ativos em tempo real, utilizadores e últimas encomendas.
- Estado dos serviços (API, WebSockets, Swagger UI).

---

## Estrutura do projeto

```
TrabalhoPratico/
├── Relatorio.pdf                 # Arquitetura e decisões técnicas
├── render.yaml                   # Configuração do serviço no Render
│
├── api/                          # API REST + servidor de WebSockets
│   ├── openapi.yaml              # Especificação OpenAPI 3 (27 caminhos, 11 schemas)
│   ├── uploads/                  # Imagens carregadas pelos produtores
│   └── src/
│       ├── models/               # User, Product, Order, Auction, Bid, Review
│       ├── routes/               # auth, products, producers, orders,
│       │                         #   auctions, reviews, admin, uploads
│       ├── middleware/           # auth.js, produtorAprovado.js, upload.js
│       ├── sockets/leiloes.js    # Salas, licitação atómica, fecho automático
│       ├── app.js                # Express: rotas, Swagger, erros
│       ├── server.js             # Liga ao MongoDB e arranca HTTP + Socket.io
│       └── seed.js               # Dados de demonstração
│
└── web/                          # SPA
    ├── vercel.json               # Rewrites para o routing do React Router
    └── src/
        ├── componentes/          # CartaoProduto, CartaoLeilao, Contador,
        │                         #   Estrelas, Mapa, Modal, Sininho…
        ├── contexto/             # AuthContext, CarrinhoContext,
        │                         #   SocketContext, AvisosContext
        ├── hooks/                # useLeilao, useListaLeiloes
        ├── paginas/              # Uma por rota, com produtor/ e admin/ à parte
        ├── dados/concelhos.js    # Os 308 concelhos, com distrito e coordenadas
        ├── servicos/             # api.js, validacao.js, geocodificar.js
        ├── estilos/              # SASS: _variaveis, _mixins, _layout, _componentes
        ├── App.jsx               # Providers + routing
        └── main.jsx
```
