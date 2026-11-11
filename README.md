# Do Campo à Mesa

Mercado digital de produtores locais com leilões em tempo real.

Trabalho prático individual de **Desenvolvimento Web e para a Cloud** — Mestrado em Engenharia
Informática, IPVC–ESTG.

A plataforma liga pequenos produtores agrícolas da região (hortícolas, fruta, mel, vinho, queijo)
a consumidores e à restauração local. Os produtores publicam produtos, os compradores fazem
encomendas e, para lotes sazonais ou excedentes, a plataforma organiza **leilões em direto** com
vários compradores a licitar em simultâneo.

---

## 1. Índice

1. [Índice](#1-índice)
2. [Tecnologias](#2-tecnologias)
3. [Como instalar e executar](#3-como-instalar-e-executar)
4. [Contas de demonstração](#4-contas-de-demonstração)
5. [Funcionalidades por perfil](#5-funcionalidades-por-perfil)
6. [Arquitetura](#6-arquitetura)
7. [Estrutura do projeto](#7-estrutura-do-projeto)
8. [Frontend: Mobile First, SASS e Bootstrap](#8-frontend-mobile-first-sass-e-bootstrap)
9. [SPA: componentes, estado e routing](#9-spa-componentes-estado-e-routing)
10. [API REST](#10-api-rest)
11. [Modelo de dados MongoDB: embedding vs linking](#11-modelo-de-dados-mongodb-embedding-vs-linking)
12. [Documentação Swagger](#12-documentação-swagger)
13. [Autenticação e segurança](#13-autenticação-e-segurança)
14. [Tempo real e consistência dos leilões](#14-tempo-real-e-consistência-dos-leilões)
15. [Deployment na Cloud](#15-deployment-na-cloud)
16. [Dificuldades encontradas](#16-dificuldades-encontradas)
17. [Utilização de ferramentas de IA](#17-utilização-de-ferramentas-de-ia)

---

## 2. Tecnologias

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

---

## 3. Como instalar e executar

### Pré-requisitos

- Node.js 20 ou superior
- MongoDB a correr localmente em `mongodb://127.0.0.1:27017`
  (ou um URI do MongoDB Atlas)

No macOS, com Homebrew:

```bash
brew services start mongodb-community
```

### 3.1. API

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

Preencher a base de dados com dados de demonstração:

```bash
cd api && npm run seed
```

**Só é preciso correr uma vez.** O comando apaga tudo o que estiver na base de dados e
volta a criá-la de raiz, com 12 utilizadores, 28 produtos, 16 encomendas espalhadas pelas
últimas seis semanas, 18 avaliações e 5 leilões (3 a decorrer, que duram vários dias, e 2
já terminados com histórico de licitações). A partir daí os dados ficam guardados no
MongoDB e persistem entre arranques — só voltar a correr este comando é que os apaga.

Arrancar a API:

```bash
cd api && npm run dev
```

- API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/api-docs>

### 3.2. Frontend

```bash
cd web && npm install && cp .env.example .env
```

```bash
cd web && npm run dev
```

- Aplicação: <http://localhost:5173>

> O ficheiro `web/.env` tem `VITE_API_URL=http://localhost:3000`. É a única configuração que o
> frontend precisa para apontar para outra API (por exemplo, a versão publicada na Cloud).

---

## 4. Contas de demonstração

A password de todas é `123456`. O ecrã de login tem botões que preenchem
automaticamente uma conta de cada papel.

| Papel | Email | Notas |
| --- | --- | --- |
| Administrador | `admin@dcm.pt` | Painel global, validação de produtores e moderação |
| Produtor | `quinta@dcm.pt` | Quinta do Vale, Ponte de Lima — 6 produtos, leilão a decorrer |
| Produtor | `horta@dcm.pt` | Horta da Serra, Viana do Castelo — 7 produtos, leilão terminado |
| Produtor | `apiario@dcm.pt` | Apiário do Minho, Arcos de Valdevez — 5 produtos, leilão a decorrer |
| Produtor | `queijaria@dcm.pt` | Queijaria do Lima, Ponte da Barca — 4 produtos |
| Produtor | `adega@dcm.pt` | Adega do Alvarinho, Monção — 4 produtos, leilão a decorrer |
| Produtor | `pomar@dcm.pt` | Pomar das Caldas, Caldas de Vizela — **pendente de validação** |
| Comprador | `ana@dcm.pt` | 4 encomendas, 4 avaliações feitas |
| Comprador | `bruno@dcm.pt` | 3 encomendas, uma ainda pendente |
| Comprador | `carla@dcm.pt` | Ganhou um leilão, tem licitações a decorrer |
| Comprador | `diogo@dcm.pt` | 3 encomendas, uma pronta para levantamento |
| Comprador | `lagar@dcm.pt` | Restaurante O Lagar — cliente de restauração, compras em quantidade |

Os produtos do **Pomar das Caldas** não aparecem no catálogo porque o registo do produtor
ainda não foi validado: é o que permite demonstrar a aprovação no painel do administrador.

---

## 5. Funcionalidades por perfil

### Visitante (sem sessão)

- Explorar o catálogo com pesquisa por nome/descrição e filtros por categoria, época,
  **produtor**, **localidade**, preço máximo e modo biológico; ordenação por preço ou data.
  A localidade é escolhida numa lista dos **308 concelhos de Portugal**, e quando não há
  ninguém a vender nesse concelho a página diz-o e oferece voltar ao catálogo completo.
- Ver a página pública de cada produtor, com apresentação, mapa e avaliações recebidas.
- Ver a lista de leilões (ativos e terminados) e o destaque dos leilões em direto na página inicial.
- Juntar produtos ao carrinho (fica guardado no `localStorage`) e registar-se como comprador
  ou produtor para finalizar.

### Comprador

- Carrinho com alteração de quantidades e escolha entre levantamento ou entrega.
- Finalizar a encomenda: o carrinho pode ter produtos de vários produtores e é criada
  **uma encomenda por produtor**.
- Acompanhar os estados (`pendente → confirmada → pronta → entregue`) com barra de progresso
  e **notificação em tempo real** sempre que o produtor muda o estado.
- Avaliar **produtos** e **produtores** (1–5 estrelas + comentário), em qualquer dos casos
  só depois de ter uma encomenda entregue, e só uma vez por produto / por produtor.
- Denunciar avaliações para moderação.
- Entrar na sala de um leilão e licitar: contagem decrescente, número de participantes,
  histórico de licitações, atalhos que licitam logo o valor seguinte e validação do
  mínimo no servidor.
- **Perfil próprio** com os seus dados e um resumo das compras (encomendas, produtores a
  quem comprou e total gasto).

### Produtor

- Painel com indicadores: vendas entregues, total de encomendas, encomendas por confirmar
  e avaliação média.
- **Alertas de stock baixo** (produtos com menos de 5 unidades).
- Gestão do catálogo: criar, editar e apagar produtos, com upload de fotografia.
- Encomendas recebidas, com filtro por estado e botão para avançar o estado
  (o comprador é notificado na hora).
- **Agendar leilões** (lote, preço base, incremento, quanto falta para abrir e duração).
  O leilão abre e fecha sozinho à hora marcada.
- Editar a sua **página pública** (nome, concelho, telefone e apresentação), com
  pré-visualização ao lado do formulário. O mapa é colocado automaticamente no concelho
  escolhido — ninguém tem de copiar latitudes e longitudes à mão.

### Administrador

- Painel global: compradores, produtores, produtos, encomendas, volume de negócios,
  leilões ativos, registos por validar e avaliações denunciadas.
- **Validar registos de produtores** (aprovar / rejeitar) — o produtor é notificado em tempo real.
- **Moderar avaliações denunciadas**: manter, esconder ou apagar
  (a média do produto é recalculada).
- Lista de leilões ativos em tempo real, utilizadores e últimas encomendas da plataforma.
- Estado dos serviços (API, WebSockets, Swagger UI).

---

## 6. Arquitetura

```
┌─────────────────────────┐   HTTPS / JSON    ┌────────────────────────────┐
│  SPA  (React + Vite)    │ ────────────────► │  API REST (Node + Express)  │
│  Bootstrap 5 · SASS     │ ◄──────────────── │  JWT · Swagger UI           │
│  Mobile First           │                   └────────────┬───────────────┘
│                         │                                │ Mongoose
│                         │     WebSocket                  ▼
│                         │ ◄───────────────► ┌────────────────────────────┐
└─────────────────────────┘   Socket.io       │        MongoDB             │
                                              │ users · products · orders  │
                                              │ auctions · bids · reviews  │
                                              └────────────────────────────┘
```

A API REST e o servidor de Socket.io correm no **mesmo processo e no mesmo servidor HTTP**
(`src/server.js`). Isto permite que uma rota REST envie eventos pelo WebSocket: a instância `io`
fica disponível em `app.set('io', io)` e as rotas acedem-lhe com `req.app.get('io')`.
É assim que `PATCH /api/orders/:id/estado` notifica o comprador.

---

## 7. Estrutura do projeto

```
TrabalhoPratico/
├── api/                          # API REST + servidor de WebSockets
│   ├── openapi.yaml              # Especificação OpenAPI 3 (25 endpoints, 10 schemas)
│   ├── uploads/                  # Imagens carregadas pelos produtores
│   └── src/
│       ├── models/               # Schemas Mongoose
│       │   ├── User.js  Product.js  Order.js
│       │   └── Auction.js  Bid.js  Review.js
│       ├── routes/               # Um ficheiro por recurso
│       │   ├── auth.js  products.js  producers.js  orders.js
│       │   └── auctions.js  reviews.js  admin.js  uploads.js
│       ├── middleware/
│       │   ├── auth.js           # Verificação do JWT + controlo por papel
│       │   └── upload.js         # Multer
│       ├── sockets/leiloes.js    # Salas, licitação atómica, fecho automático
│       ├── app.js                # Express: rotas, Swagger, erros
│       ├── server.js             # Liga ao MongoDB e arranca HTTP + Socket.io
│       └── seed.js               # Dados de demonstração
│
└── web/                          # SPA
    └── src/
        ├── componentes/          # Reutilizáveis
        │   ├── Cabecalho.jsx  Rodape.jsx  Notificacoes.jsx
        │   ├── CartaoProduto.jsx  CartaoLeilao.jsx  FiltrosCatalogo.jsx
        │   ├── SelectLocalidade.jsx  # lista de concelhos, partilhada por 3 ecrãs
        │   └── Contador.jsx  Estrelas.jsx  EtiquetaEstado.jsx  RotaProtegida.jsx
        ├── contexto/             # Estado global
        │   ├── AuthContext.jsx   # Sessão e papel
        │   ├── CarrinhoContext.jsx
        │   └── SocketContext.jsx # Ligação WebSocket + notificações
        ├── hooks/useLeilao.js    # Hook da sala de leilão
        ├── paginas/
        │   ├── Catalogo.jsx  Produto.jsx  Produtores.jsx  PaginaProdutor.jsx
        │   ├── Leiloes.jsx  SalaLeilao.jsx  Carrinho.jsx  MinhasEncomendas.jsx
        │   ├── Login.jsx  Registo.jsx  NaoEncontrado.jsx
        │   ├── produtor/         # Painel, produtos, encomendas, leilões, página pública
        │   └── admin/PainelAdmin.jsx
        ├── dados/concelhos.js    # Os 308 concelhos, com distrito e coordenadas
        ├── servicos/api.js       # Camada única de acesso à API
        ├── estilos/              # SASS
        │   ├── _variaveis.scss  _mixins.scss
        │   ├── _layout.scss  _componentes.scss  main.scss
        ├── App.jsx               # Providers + routing
        └── main.jsx
```

---

## 8. Frontend: Mobile First, SASS e Bootstrap

**Mobile First.** Os estilos base são os do telemóvel (uma coluna) e os ecrãs maiores são
acrescentados com media queries `min-width`. Estão definidos **3 breakpoints**, em
`web/src/estilos/_variaveis.scss`:

```scss
$breakpoints: (md: 768px, lg: 1024px, xl: 1280px);
```

**Mixins** (`_mixins.scss`) — toda a aplicação usa estes três:

```scss
@mixin a-partir-de($bp) {                      // Mobile First
  @media (min-width: map.get(v.$breakpoints, $bp)) { @content; }
}

@mixin grelha($md: 2, $lg: 3, $xl: 4) {        // grelha responsiva
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;                  // telemóvel
  @include a-partir-de(md) { grid-template-columns: repeat($md, 1fr); }
  @include a-partir-de(lg) { grid-template-columns: repeat($lg, 1fr); }
  @include a-partir-de(xl) { grid-template-columns: repeat($xl, 1fr); }
}

@mixin cartao($padding: 1rem) { /* ... */ }    // cartão branco reutilizável
```

Resultado no catálogo: 1 coluna no telemóvel → 2 a partir de 768 px → 3 a partir de 1024 px
→ 4 a partir de 1280 px.

**Parciais SASS** importados em `main.scss` com `@use`:
`_variaveis` (paleta, tipografia, breakpoints), `_mixins`, `_layout` (cabeçalho, rodapé,
destaque), `_componentes` (cartões, etiquetas, painéis, sala de leilão, notificações).

Um exemplo de código SASS que gera CSS a partir de um mapa — uma classe por estado de encomenda:

```scss
@each $nome, $cor in v.$estados {
  .estado-#{$nome} {
    color: $cor;
    background: rgba($cor, 0.1);
    border-color: rgba($cor, 0.35);
  }
}
```

**Bootstrap 5** fornece a grelha (`row`/`col-*`), formulários (`form-control`, `form-select`,
`form-check`), navegação (`navbar`, `nav-pills`), botões, alertas e tabelas. O CSS do Bootstrap
é importado em `main.jsx` **antes** do SASS próprio, para que os nossos estilos tenham a última
palavra.

**HTML semântico**: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`,
hierarquia correta de `<h1>`–`<h3>`, `<label>` ligado a cada campo e `alt` em todas as imagens.

---

## 9. SPA: componentes, estado e routing

**Routing no cliente** com `react-router-dom` (`web/src/App.jsx`). As rotas de cada perfil são
embrulhadas no componente `RotaProtegida`, que redireciona para `/login` quem não tem sessão e
mostra um aviso a quem tem o papel errado:

```jsx
<Route path="/produtor/produtos"
       element={<RotaProtegida papeis={['produtor']}><MeusProdutos /></RotaProtegida>} />
```

> A proteção no cliente é só conveniência: a segurança real está na API, que valida o JWT e o
> papel em cada pedido.

**Estado global** com a Context API — três providers em `App.jsx`:

- `AuthContext` — utilizador autenticado, papel, `entrar()`, `registar()`, `sair()`.
  Ao abrir a aplicação, se existir token no `localStorage`, confirma-o em `GET /api/auth/me`.
- `CarrinhoContext` — linhas do carrinho, total e número de artigos, guardado no `localStorage`
  para sobreviver a um recarregamento.
- `SocketContext` — **uma única ligação WebSocket por utilizador**, partilhada por toda a
  aplicação, e a lista de notificações que aparecem como *toasts*.

**Componentes reutilizáveis**: `CartaoProduto` (usado no catálogo e na página do produtor),
`CartaoLeilao`, `Contador` (contagem decrescente), `Estrelas`, `EtiquetaEstado`,
`FiltrosCatalogo`, `Notificacoes`.

**Data binding.** Cada campo dos filtros e dos formulários está ligado ao estado
(`value` + `onChange`). No catálogo, qualquer mudança no filtro dispara um novo pedido à API,
com 300 ms de espera para não fazer um pedido por tecla escrita:

```jsx
useEffect(() => {
  const temporizador = setTimeout(() => {
    const parametros = new URLSearchParams();
    if (filtro.q) parametros.set('q', filtro.q);
    /* ... */
    api.get(`/products?${parametros}`).then(setProdutos);
  }, 300);
  return () => clearTimeout(temporizador);
}, [filtro]);
```

Todos os pedidos passam por `web/src/servicos/api.js`, que acrescenta o cabeçalho
`Authorization: Bearer <token>`, trata o `204 No Content` e transforma os erros da API em
exceções com a mensagem em português.

### 9.1. Decisões de interface

Três coisas que valem por toda a aplicação:

- **Avisos num sítio só.** `AvisosContext` guarda uma fila de avisos temporários e
  qualquer página chama `sucesso()` ou `erro()`. O mesmo mecanismo serve os eventos que
  chegam pelo WebSocket e as confirmações dos formulários, por isso não há páginas com
  caixas de erro e outras em que o erro se perde.
- **Janelas modais** para o que precisa de uma decisão consciente: confirmar uma licitação
  e escrever uma avaliação. Fecham com Escape ou com um clique fora, e bloqueiam o deslize
  da página por trás.
- **Rodapé colado ao fundo**, com `#root` em `flex-column` e o conteúdo a crescer
  (`flex: 1 0 auto`). Nas páginas curtas o rodapé fica no fundo do ecrã em vez de deixar
  uma faixa branca por baixo.

### 9.2. A lista de concelhos

A localidade deixou de ser um campo de texto livre. `web/src/dados/concelhos.js` tem os
**308 concelhos de Portugal**, com o distrito e as coordenadas do centro, extraídos da
Carta Administrativa Oficial de Portugal. O mesmo ficheiro serve três ecrãs: o registo de
produtor, a página pública do produtor e os filtros do catálogo e da lista de produtores.

Isto resolve três problemas de uma vez:

- **A pesquisa bate sempre certo.** Como o nome gravado e o nome filtrado saem da mesma
  lista, não há "ponte de lima" a falhar contra "Ponte de Lima".
- **Ninguém escreve coordenadas.** O mapa da página do produtor usa as coordenadas do
  concelho escolhido, em vez de obrigar o produtor a ir buscá-las ao Google Maps.
- **O filtro usa correspondência exata**, e não `$regex`. Com expressão regular, filtrar
  por "Porto" apanharia também "Porto de Mós" e "Porto Santo", e "Braga" apanharia
  "Bragança". (O `$regex` continua a ser usado na pesquisa por nome e descrição, onde a
  correspondência parcial é precisamente o que se quer.)

Há ainda um pormenor que vale a pena saber: **dois concelhos chamam-se "Lagoa"**, um em
Faro e outro nos Açores. Na lista aparecem os dois, cada um no seu distrito.

---

## 10. API REST

Recursos identificados por URI, verbo HTTP adequado e código de estado correto em cada resposta.

| Método | Endpoint | Papel | Estado |
| --- | --- | --- | --- |
| POST | `/api/auth/registo` | — | 201 + `Location` |
| POST | `/api/auth/login` | — | 200 / 401 |
| GET · PUT | `/api/auth/me` | autenticado | 200 / 401 |
| GET | `/api/products` | — | 200 |
| POST | `/api/products` | produtor | 201 + `Location` |
| GET | `/api/products/:id` | — | 200 / 404 |
| PUT | `/api/products/:id` | produtor (dono) | 200 / 404 |
| DELETE | `/api/products/:id` | produtor / admin | **204** / 404 |
| GET | `/api/products/:id/reviews` | — | 200 |
| GET | `/api/producers` | — | 200 |
| GET | `/api/producers/:id` | — | 200 / 404 |
| GET | `/api/producers/me/estatisticas` | produtor | 200 |
| GET | `/api/orders` | comprador / produtor | 200 / 401 |
| POST | `/api/orders` | comprador | 201 / 400 |
| GET | `/api/orders/:id` | envolvidos / admin | 200 / 403 / 404 |
| PATCH | `/api/orders/:id/estado` | produtor (dono) | 200 / 400 / 404 |
| GET | `/api/auctions` | — | 200 |
| POST | `/api/auctions` | produtor | 201 + `Location` |
| GET | `/api/auctions/:id` | — | 200 / 404 |
| DELETE | `/api/auctions/:id` | produtor / admin | 204 / 404 |
| GET | `/api/auctions/:id/bids` | — | 200 |
| GET · POST | `/api/reviews` (produto **ou** produtor) | — / comprador | 200 / 201 / 403 |
| POST | `/api/reviews/:id/denunciar` | autenticado | 200 / 404 |
| GET | `/api/admin/estatisticas` | admin | 200 / 403 |
| GET | `/api/admin/produtores` | admin | 200 |
| PATCH | `/api/admin/produtores/:id` | admin | 200 / 400 / 404 |
| GET | `/api/admin/utilizadores` | admin | 200 |
| GET | `/api/admin/encomendas` | admin | 200 |
| GET · PATCH · DELETE | `/api/admin/reviews[/:id]` | admin | 200 / 204 / 404 |
| POST | `/api/uploads` | produtor / admin | 201 / 400 |

**Códigos de erro usados**: `400` dados inválidos, `401` token em falta ou inválido,
`403` autenticado mas sem permissão, `404` recurso inexistente, `500` erro interno
(tratado num middleware central em `app.js`, que converte os erros de validação do Mongoose
em `400`).

**Pesquisas com operadores do MongoDB** (`GET /api/products`):

```js
if (q) filtro.$or = [                                 // $regex, sem distinguir maiúsculas
  { nome: { $regex: q, $options: 'i' } },
  { descricao: { $regex: q, $options: 'i' } },
];
if (precoMin || precoMax) {                           // intervalo com $gte / $lte
  filtro.preco = {};
  if (precoMin) filtro.preco.$gte = Number(precoMin);
  if (precoMax) filtro.preco.$lte = Number(precoMax);
}
```

E `$lt` sobre datas em `GET /api/auctions?aTerminar=true` (leilões que terminam na próxima hora)
e `$lt` sobre números nos alertas de stock baixo do produtor (`stock: { $lt: 5 }`).

---

## 11. Modelo de dados MongoDB: embedding vs linking

Seis coleções: `users`, `products`, `orders`, `auctions`, `bids`, `reviews`.

A regra que segui: **embeber o que é sempre lido em conjunto e não cresce sem limite;
referenciar o que é partilhado, muda com frequência ou cresce indefinidamente.**

| Decisão | Porquê |
| --- | --- |
| **`orders.linhas` embebidas** | As linhas são poucas (uma encomenda tem 1 a 10 artigos), nunca são lidas sem a encomenda e nunca são partilhadas. Em cada linha guardo uma **cópia** de `nome` e `precoUnit`: se o produtor mudar o preço amanhã, a encomenda de hoje mantém o preço que o comprador pagou. |
| **`orders.comprador` e `orders.produtor` referenciados** | São utilizadores partilhados por muitas encomendas e os seus dados mudam. Lidos com `.populate()` só quando são precisos. |
| **`products.produtor` referenciado** | O mesmo produtor tem dezenas de produtos; duplicar a sua localidade e descrição em cada um obrigaria a reescrever todos os documentos a cada alteração. |
| **`auctions.licitacaoAtual` embebido** | É um único valor (valor, comprador, nome), lido sempre com o leilão e escrito em cada licitação. Embebido, a validação e a escrita da licitação fazem-se **numa só operação atómica** — é o que garante a consistência do leilão. |
| **`bids` em coleção própria (linking)** | O histórico de licitações cresce sem limite durante um leilão movimentado. Dentro do documento do leilão chegaria ao limite de 16 MB e tornaria cada leitura cara. |
| **`reviews` em coleção própria (linking)** | Crescem sem limite e são moderadas pelo administrador de forma independente do produto. A mesma coleção guarda os dois tipos de avaliação: com `produto` preenchido é uma avaliação a um produto, com `produto` a `null` é ao produtor. Como o campo `produtor` está sempre preenchido, a página do produtor mostra as duas com uma única pesquisa. |
| **`products.notaMedia` e `numAvaliacoes` desnormalizados** | O catálogo mostra a média em cada cartão; somar as avaliações em cada listagem seria caro. A média é recalculada quando uma avaliação é criada, escondida ou apagada. |
| **Um único documento `users` para os 3 papéis** | Os campos de produtor (localidade, coordenadas, estado de aprovação) são opcionais. Evita uma coleção extra e uma junção em cada pedido de catálogo. |

**Validação no schema** (Mongoose): `required` em todos os campos obrigatórios, `enum` em
`papel`, `categoria`, `unidade`, `epoca`, `estado` e `aprovado`, `min` em preços, stock,
quantidades e notas, `max: 5` na nota das avaliações, `unique` no email e `index` nas chaves
estrangeiras mais consultadas.

O `passwordHash` nunca sai da API: o método `toJSON` do `User` apaga-o de todas as respostas.

---

## 12. Documentação Swagger

A especificação está em `api/openapi.yaml` (OpenAPI 3.0.3) e cobre os **25 caminhos**, com
todos os parâmetros de query, corpos de pedido, códigos de resposta e o cabeçalho `Location`
nas criações.

- `components.schemas`: `Utilizador`, `RespostaLogin`, `ProdutoInput`, `Produto`,
  `LinhaEncomenda`, `Encomenda`, `Leilao`, `Licitacao`, `Avaliacao`, `Erro`.
- `components.securitySchemes.bearerAuth`: `http` / `bearer` / `JWT`, aplicado com
  `security: [{ bearerAuth: [] }]` em todos os endpoints protegidos.

Publicada com `swagger-ui-express` em **<http://localhost:3000/api-docs>**:

```js
const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
```

Para testar os endpoints protegidos no browser: fazer `POST /auth/login`, copiar o `token`
da resposta e colá-lo no botão **Authorize**.

---

## 13. Autenticação e segurança

- **Passwords com hash** — `bcrypt` com 12 rondas (`bcrypt.hash(password, 12)`). A password em
  claro nunca é guardada nem registada.
- **JWT com expiração** — assinado com `JWT_SECRET` e válido 8 horas. O payload tem apenas
  `id`, `papel` e `nome`, que é o que a API precisa para autorizar.
- **Middleware por papel** (`api/src/middleware/auth.js`):

  ```js
  function auth(...papeis) {
    return (req, res, next) => {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      if (!token) return res.status(401).json({ erro: 'Token em falta' });
      try { req.user = jwt.verify(token, process.env.JWT_SECRET); }
      catch { return res.status(401).json({ erro: 'Token inválido ou expirado' }); }
      if (papeis.length && !papeis.includes(req.user.papel))
        return res.status(403).json({ erro: 'Sem permissão' });
      next();
    };
  }
  ```

  Usado como `auth('produtor')`, `auth('admin')`, `auth('comprador', 'produtor')`.

- **Posse do recurso verificada no filtro da query**, não só pelo papel. Um produtor autenticado
  não consegue editar o produto de outro porque o `_id` do dono faz parte do filtro:

  ```js
  Product.findOneAndUpdate({ _id: req.params.id, produtor: req.user.id }, alteracoes, { new: true });
  ```

  Se o produto não for dele, não há documento que corresponda e a API responde `404`.

- **Campos não editáveis filtrados** — em `PUT /api/products/:id` os campos `produtor`,
  `notaMedia` e `numAvaliacoes` são retirados do corpo antes de gravar, para o cliente não
  poder transferir um produto para outro produtor nem falsificar a sua média.
- **Preços lidos sempre da base de dados** — `POST /api/orders` ignora preços enviados pelo
  cliente e usa os do documento do produto.
- **Segredos em variáveis de ambiente** — `.env` está no `.gitignore`; o repositório só tem
  `.env.example`.
- **Upload de imagens restrito** — só `image/jpeg`, `png`, `webp` e `gif`, no máximo 3 MB,
  com nome de ficheiro gerado pelo servidor (nunca o nome original do utilizador).
- **HTTPS em produção** — fica a cargo da plataforma PaaS, que termina o TLS (ver secção 15).

---

## 14. Tempo real e consistência dos leilões

### 14.1. Salas

O Socket.io usa **o mesmo JWT da API**, enviado no handshake, mas a autenticação é
*opcional*: quem não tiver sessão liga-se à mesma e acompanha os leilões, apenas fica sem
`socket.user` e por isso não consegue licitar.

```js
io.use((socket, next) => {
  const { token } = socket.handshake.auth || {};
  socket.user = null;
  if (token) {
    try { socket.user = jwt.verify(token, process.env.JWT_SECRET); }
    catch { /* token inválido: segue como visitante */ }
  }
  next();
});
```

Três famílias de salas:

- `leiloes` — sala única onde **todos** entram ao ligar-se. Mantém as listas de leilões
  atualizadas em qualquer página (ver 14.4).
- `leilao:<id>` — uma sala por leilão, em que o cliente entra com o evento `entrar` e sai com
  `sair`. A presença (número de participantes) é recalculada ao entrar, ao sair e no evento
  `disconnecting`.
- `user:<id>` — sala pessoal, só para quem tem sessão. Recebe as notificações de encomendas,
  de leilões ganhos/fechados e da validação do registo de produtor.

### 14.2. O desafio técnico: duas licitações ao mesmo tempo

Quando dois compradores licitam o mesmo valor quase no mesmo instante, o servidor tem de
aceitar **apenas uma** e todos os clientes têm de ficar a ver o mesmo estado.

A solução é não ler-e-depois-escrever. Toda a validação está **dentro do filtro** de um único
`findOneAndUpdate`, por isso é o MongoDB que a aplica, de forma atómica, sobre o documento:

```js
const leilao = await Auction.findOneAndUpdate(
  {
    _id: leilaoId,
    estado: 'ativo',
    terminaEm: { $gt: new Date() },
    // valor >= licitacaoAtual.valor + incremento, avaliado no servidor
    $expr: { $gte: [montante, { $add: ['$licitacaoAtual.valor', '$incremento'] }] },
  },
  { licitacaoAtual: { valor: montante, comprador: socket.user.id, nome: socket.user.nome } },
  { new: true }
);

if (!leilao) return socket.emit('recusada', 'Licitação recusada: valor demasiado baixo ou leilão terminado');

await Bid.create({ leilao: leilaoId, comprador: socket.user.id, nome: socket.user.nome, valor: montante });
io.to(`leilao:${leilaoId}`).emit('nova-licitacao', { licitacaoAtual: leilao.licitacaoAtual, licitacao });
```

Porque é que isto resolve o problema:

1. A primeira licitação a chegar ao MongoDB encontra o documento no estado esperado, grava
   e devolve o documento atualizado.
2. A segunda chega logo a seguir, mas `licitacaoAtual.valor` **já subiu**, por isso a condição
   `$expr` deixa de se verificar. Nenhum documento corresponde ao filtro, `findOneAndUpdate`
   devolve `null` e a licitação é recusada — sem nunca chegar a escrever.
3. O broadcast só acontece **depois** da escrita ter sido aceite, por isso todos os clientes da
   sala recebem exatamente o mesmo estado, na mesma ordem.

Se em vez disto o servidor lesse o leilão, comparasse o valor em JavaScript e só depois gravasse,
as duas licitações podiam ler o mesmo valor antigo e ambas passariam na comparação — a segunda
escrita sobrepunha-se à primeira e um comprador ficava com a licitação "perdida".

Testado com dois clientes a enviar 65 € no mesmo instante: uma licitação foi aceite, a outra
recebeu `recusada`, e o estado no servidor e nos dois clientes ficou igual.

### 14.3. Os três estados de um leilão

Um leilão não nasce aberto. Quem o cria escolhe daqui a quanto tempo abre — entre
**3 e 60 minutos** — e quanto tempo dura a partir daí:

```
agendado  ──(comecaEm)──>  ativo  ──(terminaEm)──>  terminado
```

O tempo de espera não é um capricho: sem ele, um leilão de 10 minutos criado às 15h00
estaria a meio antes de alguém dar por ele. Com o aviso, os compradores entram na sala
antes de abrir e ficam a ver a contagem decrescente.

**As mudanças de estado são só do servidor.** Um `setInterval` de 3 em 3 segundos
procura leilões agendados cuja hora chegou (`comecaEm: { $lte: agora }`) e ativos que
passaram da hora (`terminaEm: { $lt: agora }`), muda-lhes o estado e avisa as salas.
O cliente nunca decide que um leilão abriu: limita-se a mostrar o que recebe. É por isso
que o relógio do computador de quem licita não tem qualquer influência.

Licitar num leilão que ainda não abriu é impossível sem código extra, porque o filtro
atómico da licitação já exige `estado: 'ativo'`.

### 14.4. Tudo em tempo real, não só dentro da sala

Além das salas por leilão, há uma sala `leiloes` onde **todos os clientes entram ao
ligar-se**, com ou sem sessão iniciada. É ela que mantém vivas as *listas* de leilões —
a página inicial, a lista de leilões, o painel do produtor e o do administrador:

| Evento | Quando | O que o cliente faz |
| --- | --- | --- |
| `leilao-atualizado` | alguém licitou | corrige só esse leilão na lista |
| `leiloes-mudaram` | um leilão abriu, fechou, nasceu ou foi apagado | volta a pedir a lista |

A distinção importa: uma licitação só muda um valor, mas abrir ou fechar muda **a que
lista o leilão pertence**, e aí não chega corrigir um número.

No cliente isto está num hook, `useListaLeiloes`, por isso qualquer página fica em tempo
real sem saber nada de WebSockets.

A autenticação do socket passou a ser **opcional**: sem token o cliente liga-se na mesma
e acompanha tudo, mas fica sem `socket.user` e o servidor recusa-lhe a licitação. Assim
um visitante vê os leilões a mexer antes sequer de ter conta.

### 14.5. O que uma licitação compromete (e onde entra o dinheiro)

A plataforma **não tem pagamentos online**. Nem nas encomendas, nem nos leilões: o
pagamento é sempre combinado diretamente com o produtor, no levantamento ou na entrega.
Foi uma decisão deliberada — integrar um gateway de pagamentos traria obrigações legais e
de segurança (dados de cartão, PCI-DSS, estornos) que estão muito para lá do âmbito do
trabalho, e nenhum dos oito passos do enunciado o pede.

Por isso, licitar não movimenta dinheiro: é um **compromisso de compra**. Quem tiver a
licitação mais alta no fim do leilão fica comprometido a comprar o lote por esse valor, e
o produtor contacta-o para combinar o resto. A interface diz isto em dois sítios — por
baixo do formulário e na janela de confirmação — porque é precisamente a dúvida que um
utilizador tem ao ver um botão que aumenta o valor em 25 €.

Como não há dinheiro a mexer, licitar é um clique só: os atalhos (+5, +10, +25 acima do
mínimo) enviam a licitação logo, sem passo de confirmação, que é o que se espera de um
leilão em direto onde cada segundo conta.

### 14.6. Relógio sincronizado

O servidor envia apenas `terminaEm` (uma data absoluta). É cada cliente que calcula o tempo que
falta, de segundo a segundo, no componente `Contador`. Assim não é preciso sincronizar
contadores entre clientes: todos derivam o mesmo valor da mesma data.

### 14.7. Abertura e fecho automáticos

Um `setInterval` de 3 segundos faz as duas passagens de estado:

- **abre** os agendados cuja hora chegou (`comecaEm: { $lte: agora }`) e manda
  `leilao-comecou` à sala, para a página passar de contagem para formulário sozinha;
- **fecha** os ativos que passaram da hora (`terminaEm: { $lt: agora }`), marca-os como
  `terminado` e avisa a sala, o vencedor (`leilao-ganho`) e o produtor (`leilao-fechado`).

Em qualquer dos casos manda também `leiloes-mudaram` à sala `leiloes`, porque abrir ou
fechar muda a que listas o leilão pertence.

### 14.8. Notificações de encomendas

Quando o produtor muda o estado de uma encomenda, a rota REST usa o `io` para avisar o comprador
na sua sala pessoal:

```js
req.app.get('io').to(`user:${encomenda.comprador}`).emit('encomenda-atualizada', {
  id: encomenda._id, estado: encomenda.estado, produtor: encomenda.produtor.nome,
});
```

No cliente, a página "As minhas encomendas" ouve o mesmo evento e atualiza a lista sem
recarregar; em paralelo, o `SocketContext` mostra um *toast*. Quando um comprador fecha uma
encomenda, o produtor recebe `nova-encomenda` e o painel recarrega os indicadores.

---

## 15. Deployment na Cloud

Este passo era **opcional** no enunciado e não chegou a ser publicado. Fica aqui a justificação
do modelo de serviço que seria usado e o que já está preparado no código.

**Modelo escolhido: PaaS + BaaS.**

| Componente | Serviço | Modelo |
| --- | --- | --- |
| API + Socket.io | Azure App Service (Linux, Node 20) | **PaaS** |
| SPA | Azure Static Web Apps | **PaaS** |
| Base de dados | MongoDB Atlas (tier gratuito M0) | **BaaS** |
| Imagens | Azure Blob Storage | **BaaS** |

**Porquê PaaS e não IaaS.** Numa IaaS (máquinas virtuais) seria preciso instalar e manter o
sistema operativo, o Node, um proxy inverso, os certificados TLS e as atualizações de segurança.
Nada disso é específico desta aplicação: é trabalho de operação que não acrescenta valor ao
trabalho. Em PaaS entrega-se o código e a plataforma trata do runtime, do HTTPS, do balanceamento
e do escalamento; em troca perde-se controlo sobre o ambiente, o que aqui não é limitação.
A base de dados e o armazenamento de imagens vão em BaaS pela mesma razão, com a vantagem extra
de backups e réplicas já incluídos.

**O que o código já tem preparado:**

- Todas as configurações vêm de variáveis de ambiente (`MONGODB_URI`, `JWT_SECRET`, `PORT` na API;
  `VITE_API_URL` no frontend), por isso publicar é só definir as *app settings* — não há nada
  para mudar no código.
- O `MONGODB_URI` aceita um URI `mongodb+srv://` do Atlas sem qualquer alteração.
- O upload de imagens está isolado em `api/src/middleware/upload.js`. Trocar o disco local por
  Blob Storage é mudar só este ficheiro: o resto da aplicação continua a receber um URL.
- O Socket.io é servido no mesmo servidor HTTP da API, por isso basta ativar WebSockets no
  App Service (`az webapp config set --web-sockets-enabled true`).

Comandos (Azure CLI) que publicariam a API:

```bash
az group create -n dcm-rg -l westeurope
az appservice plan create -n dcm-plan -g dcm-rg --sku B1 --is-linux
az webapp create -n dcm-api -g dcm-rg -p dcm-plan --runtime "NODE:20-lts"
az webapp config appsettings set -n dcm-api -g dcm-rg --settings \
  MONGODB_URI="mongodb+srv://..." JWT_SECRET="..." PORT=8080
az webapp config set -n dcm-api -g dcm-rg --web-sockets-enabled true
az webapp deploy -n dcm-api -g dcm-rg --src-path api.zip --type zip
```

Em desenvolvimento, as imagens ficam em `api/uploads/` e são servidas pelo Express
(`app.use('/uploads', express.static(...))`).

---

## 16. Dificuldades encontradas

- **Licitações simultâneas.** Foi a parte que obrigou a mais cuidado. A primeira versão lia o
  leilão, comparava o valor em JavaScript e só depois gravava — o que abre uma janela em que duas
  licitações leem o mesmo valor antigo e ambas são aceites. Passar toda a validação para dentro
  do filtro do `findOneAndUpdate`, com `$expr`, resolveu o problema sem transações nem bloqueios.
- **Carrinho com vários produtores.** Como é o produtor que muda o estado da encomenda, uma
  encomenda com produtos de três produtores não teria um estado que fizesse sentido. A solução
  foi agrupar as linhas por produtor no `POST /api/orders` e criar uma encomenda por cada um.
  O carrinho avisa o comprador quando isso vai acontecer.
- **Stock em concorrência.** Dois compradores a levar a última unidade ao mesmo tempo tinham o
  mesmo problema dos leilões. A retirada do stock é feita com
  `findOneAndUpdate({ _id, stock: { $gte: quantidade } }, { $inc: { stock: -quantidade } })`,
  que só grava se ainda houver stock.
- **Duas ligações WebSocket por utilizador.** Na primeira versão, o hook `useLeilao` abria uma
  ligação própria, além da do contexto global — o que fazia o utilizador entrar duas vezes na
  sala pessoal e receber cada notificação a dobrar. Passou a existir **uma só ligação**, criada
  no `SocketContext` e usada pelo hook.
- **Fugas de memória nos ouvintes.** Mudar de sala de leilão sem remover os ouvintes do socket
  acumulava *handlers* e atualizava estado de componentes já desmontados. Todos os `useEffect`
  que registam ouvintes devolvem agora uma função de limpeza com os `socket.off` correspondentes.
- **Erros do Multer a darem 500.** Um ficheiro com formato inválido fazia o middleware atirar um
  erro que chegava ao tratamento central como erro interno. Passou a ser apanhado no *callback*
  do `upload.single` e convertido em `400` com a mensagem certa.

---

## 17. Utilização de ferramentas de IA

Conforme permitido pelo enunciado, foi usado um assistente de IA (Claude) no apoio à escrita de
código repetitivo (schemas Mongoose, formulários, especificação OpenAPI), na revisão da lógica de
concorrência dos leilões e na redacção deste relatório. Todas as decisões de arquitetura,
modelação de dados e segurança foram revistas e validadas por mim, e o código foi testado
ponta a ponta antes da entrega.

**Bibliotecas de terceiros usadas** (todas declaradas em `api/package.json` e `web/package.json`):
Express, Mongoose, Socket.io, jsonwebtoken, bcryptjs, cors, dotenv, swagger-ui-express, yamljs,
multer, React, React Router, Bootstrap, SASS e socket.io-client.
