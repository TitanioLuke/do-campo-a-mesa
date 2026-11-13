---
title: "Do Campo à Mesa"
subtitle: "Mercado digital de produtores locais com leilões em tempo real"
author: "Afonso Araújo · Mestrado em Engenharia Informática · IPVC–ESTG"
date: "Desenvolvimento Web e para a Cloud · 2026/2027"
---

# 1. Introdução

**Do Campo à Mesa** é uma plataforma web que liga pequenos produtores agrícolas da região
(hortícolas, fruta, mel, vinho, queijo) a consumidores e à restauração local. Os produtores
publicam produtos, os compradores fazem encomendas e, para lotes sazonais ou excedentes, a
plataforma organiza **leilões em direto**, com vários compradores a licitar em simultâneo.

O trabalho junta duas naturezas diferentes de problema, e é essa junção que o define: por um
lado, gestão de dados — produtos, encomendas, avaliações, produtores; por outro, **interação em
tempo real**, em que vários clientes têm de ver o mesmo estado ao mesmo tempo e o servidor tem
de decidir, sem ambiguidade, qual de duas licitações quase simultâneas é a válida.

## 1.1. O que está feito

| | |
| --- | --- |
| **Repositório** | https://github.com/TitanioLuke/do-campo-a-mesa |
| **Aplicação publicada** | https://do-campo-a-mesa-six.vercel.app |
| **API** | https://do-campo-a-mesa-api-1rju.onrender.com |
| **Documentação OpenAPI** | https://do-campo-a-mesa-api-1rju.onrender.com/api-docs |

As instruções de instalação e execução, as contas de demonstração e a lista detalhada de
funcionalidades por perfil estão no `README.md` do repositório. Este documento trata da
arquitetura, das decisões técnicas e dos problemas que foi preciso resolver.

> O alojamento da API é gratuito e adormece ao fim de 15 minutos sem pedidos. O primeiro acesso
> depois disso demora perto de um minuto a responder; os seguintes são imediatos.

## 1.2. Intervenientes

| Perfil | O que faz |
| --- | --- |
| **Visitante** | Explora o catálogo com pesquisa e filtros, vê a página pública de cada produtor com mapa e avaliações, acompanha os leilões em direto sem poder licitar |
| **Comprador** | Carrinho e encomendas (levantamento ou entrega), acompanha os quatro estados com notificação em tempo real, avalia produtos e produtores, denuncia avaliações, licita em leilões |
| **Produtor** | Gere o catálogo com fotografias, atualiza o estado das encomendas, agenda e acompanha leilões, edita a sua página pública e o ponto no mapa, consulta indicadores de vendas |
| **Administrador** | Valida registos de produtores, modera avaliações denunciadas, vê o painel global de utilizadores, encomendas e leilões ativos |

## 1.3. Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Frontend (SPA) | React 19 + Vite, React Router 7 |
| Estilos | SASS (variáveis, mixins, parciais) + Bootstrap 5 |
| API REST | Node.js + Express 5 |
| Base de dados | MongoDB + Mongoose |
| Tempo real | Socket.io |
| Autenticação | JWT (jsonwebtoken) + bcryptjs |
| Documentação | OpenAPI 3 + Swagger UI |
| Upload de imagens | Multer |
| Mapas | Leaflet + mosaicos do OpenStreetMap |



# 2. Arquitetura

```
+---------------------------+   HTTPS / JSON   +----------------------------+
|   SPA  (React + Vite)     | ---------------> |  API REST (Node + Express) |
|   Bootstrap 5 . SASS      | <--------------- |  JWT . Swagger UI          |
|   Mobile First            |                  +-------------+--------------+
|                           |                                |  Mongoose
|                           |      WebSocket                 v
|                           | <--------------> +----------------------------+
+---------------------------+      Socket.io   |          MongoDB           |
                                               |  users . products . orders |
                                               |  auctions . bids . reviews |
                                               +----------------------------+
```

A API REST e o servidor de Socket.io correm no **mesmo processo e no mesmo servidor HTTP**
(`src/server.js`). Não é um detalhe de arrumação: é o que permite que uma rota REST envie
eventos pelo WebSocket. A instância `io` fica disponível em `app.set('io', io)` e as rotas
acedem-lhe com `req.app.get('io')`. É assim que `PATCH /api/orders/:id/estado` — um pedido HTTP
feito pelo produtor — faz aparecer uma notificação no ecrã do comprador, que não fez pedido
nenhum.

## 2.1. Organização do código

A API separa **modelos** (schemas Mongoose), **rotas** (um ficheiro por recurso), **middleware**
(JWT e papéis, aprovação do produtor, upload) e **sockets** (salas, licitação atómica, fecho
automático). A SPA separa **componentes** reutilizáveis, **contextos** de estado global,
**hooks**, **páginas** e **serviços** (acesso à API, validação, geocodificação). A árvore
completa está no `README.md`.

# 3. Frontend: Mobile First, SASS e Bootstrap

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

Resultado no catálogo: 1 coluna no telemóvel → 2 a partir de 768 px → 3 a partir de 1024 px →
4 a partir de 1280 px.

**Parciais SASS** importados em `main.scss` com `@use`: `_variaveis` (paleta, tipografia,
breakpoints), `_mixins`, `_layout` (cabeçalho, rodapé, destaque), `_componentes` (cartões,
etiquetas, painéis, sala de leilão, notificações).

Um exemplo de SASS a gerar CSS a partir de um mapa — uma classe por estado de encomenda:

```scss
@each $nome, $cor in v.$estados {
  .estado-#{$nome} {
    color: $cor;
    background: rgba($cor, 0.1);
    border-color: rgba($cor, 0.35);
  }
}
```

**Bootstrap 5** fornece a grelha (`row`/`col-*`), formulários, navegação, botões, alertas e
tabelas. O CSS do Bootstrap é importado em `main.jsx` **antes** do SASS próprio, para que os
estilos da aplicação tenham a última palavra.

**HTML semântico**: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`,
hierarquia correta de `<h1>`–`<h3>`, `<label>` ligado a cada campo e `alt` em todas as imagens.



# 4. SPA: componentes, estado e routing

**Routing no cliente** com `react-router-dom` (`web/src/App.jsx`). As rotas de cada perfil são
embrulhadas no componente `RotaProtegida`, que redireciona para `/login` quem não tem sessão e
mostra um aviso a quem tem o papel errado:

```jsx
<Route path="/produtor/produtos"
       element={<RotaProtegida papeis={['produtor']}><MeusProdutos /></RotaProtegida>} />
```

A proteção no cliente é só conveniência: a segurança real está na API, que valida o JWT e o
papel em cada pedido.

**Estado global** com a Context API — quatro providers em `App.jsx`:

- `AuthContext` — utilizador autenticado, papel, `entrar()`, `registar()`, `sair()`. Ao abrir a
  aplicação, se existir token no `localStorage`, confirma-o em `GET /api/auth/me`.
- `CarrinhoContext` — linhas do carrinho, total e número de artigos, guardado no `localStorage`
  para sobreviver a um recarregamento.
- `SocketContext` — **uma única ligação WebSocket por utilizador**, partilhada por toda a
  aplicação, mais a lista de notificações do sininho.
- `AvisosContext` — fila de avisos temporários (*toasts*).

**Data binding.** Cada campo dos filtros e dos formulários está ligado ao estado (`value` +
`onChange`). No catálogo, qualquer mudança no filtro dispara um novo pedido à API, com 300 ms de
espera para não fazer um pedido por tecla escrita:

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

## 4.1. Decisões de interface

- **Avisos num sítio só.** Qualquer página chama `sucesso()` ou `erro()`. O mesmo mecanismo
  serve os eventos que chegam pelo WebSocket e as confirmações dos formulários, por isso não há
  páginas com caixas de erro e outras em que o erro se perde.

- **Validação dos formulários feita pela aplicação, não pelo browser.** O atributo `required` do
  HTML trava o envio, mas a mensagem que mostra é uma caixa cinzenta do browser e vem no idioma
  dele — numa página inteiramente em português aparecia *"Please fill out this field"*. Os seis
  formulários da aplicação levam `noValidate`, e as mensagens passam a ser escritas por nós, por
  baixo do campo errado e com a moldura a vermelho. O `required` fica nos campos: já não trava o
  envio, mas continua a dizer aos leitores de ecrã que o campo é obrigatório. As mensagens só
  aparecem **depois da primeira tentativa de submeter** — um formulário que abre todo vermelho
  está a ralhar com quem ainda não fez nada — e nenhum botão fica desativado por causa da
  validação, porque um botão que não responde não explica o que falta.

- **Confirmação antes do que não se desfaz.** Apagar um produto, um leilão ou uma avaliação,
  rejeitar o registo de um produtor, esvaziar o carrinho e agendar um leilão passam todos pela
  mesma janela modal, e cada uma diz o que vai acontecer em concreto — o leilão avisa se já tem
  licitações, porque o histórico é apagado com ele.

- **Um mapa, duas utilizações.** O produtor marca onde fica de duas maneiras: escreve a morada e
  o OpenStreetMap devolve o ponto (`servicos/geocodificar.js`, com a pesquisa limitada a
  Portugal), ou arrasta o pin — que é o que salva uma quinta ao fim de um caminho de terra, onde
  morada nenhuma acerta. Os dois caminhos acabam no mesmo sítio: duas coordenadas guardadas no
  produtor. O mesmo componente serve a página pública, aí só para ver.

- **"Não há resultados" e "não foi possível carregar" são estados diferentes.** Quando o servidor
  não responde, o catálogo mostra *"Não foi possível carregar o catálogo"* com um botão de
  repetir, e não *"nenhum produto corresponde aos filtros"*, que seria mentira. A distinção não é
  teórica: num alojamento gratuito o servidor adormece e demora perto de um minuto a acordar, e
  nesse intervalo um visitante veria uma loja aparentemente vazia.

## 4.2. A lista de concelhos

A localidade não é um campo de texto livre. `web/src/dados/concelhos.js` tem os **308 concelhos
de Portugal**, com o distrito e as coordenadas do centro. O mesmo ficheiro serve três ecrãs: o
registo de produtor, a página pública do produtor e os filtros do catálogo.

Isto resolve três problemas de uma vez. **A pesquisa bate sempre certo**, porque o nome gravado e
o nome filtrado saem da mesma lista — não há "ponte de lima" a falhar contra "Ponte de Lima".
**Ninguém escreve coordenadas**, porque o concelho já traz as suas. E **o filtro usa
correspondência exata**, e não `$regex`: com expressão regular, filtrar por "Porto" apanharia
também "Porto de Mós" e "Porto Santo", e "Braga" apanharia "Bragança".



# 5. API REST

Recursos identificados por URI, verbo HTTP adequado e código de estado correto em cada resposta.
São 27 caminhos, documentados em OpenAPI (secção 7); a tabela seguinte mostra uma amostra.

| Método | Endpoint | Papel | Estado |
| --- | --- | --- | --- |
| POST | `/api/auth/registo` | — | 201 + `Location` |
| POST | `/api/auth/login` | — | 200 / 401 |
| GET · PUT | `/api/auth/me` | autenticado | 200 / 401 |
| GET | `/api/products` | — | 200 |
| POST | `/api/products` | produtor aprovado | 201 + `Location` |
| DELETE | `/api/products/:id` | produtor / admin | **204** / 404 |
| GET · POST | `/api/orders` | comprador / produtor | 200 / 201 / 400 |
| PATCH | `/api/orders/:id/estado` | produtor (dono) | 200 / 400 / 404 |
| GET · POST | `/api/auctions` | — / produtor aprovado | 200 / 201 |
| GET · POST | `/api/reviews` | — / comprador | 200 / 201 / 403 |
| GET | `/api/admin/estatisticas` | admin | 200 / 403 |
| POST | `/api/uploads` | produtor aprovado | 201 / 400 |

**Códigos de erro**: `400` dados inválidos, `401` token em falta ou inválido, `403` autenticado
mas sem permissão, `404` recurso inexistente, `500` erro interno — tratado num middleware central
em `app.js`, que converte os erros de validação do Mongoose em `400`.

## 5.1. Pesquisas com operadores do MongoDB

```js
if (q) filtro.procura = { $regex: escaparRegex(normalizar(q)) };   // $regex
if (precoMin || precoMax) {                           // intervalo com $gte / $lte
  filtro.preco = {};
  if (precoMin) filtro.preco.$gte = Number(precoMin);
  if (precoMax) filtro.preco.$lte = Number(precoMax);
}
```

Aquela primeira linha tem duas decisões atrás dela, e ambas vieram de defeitos encontrados a
testar.

**O campo `procura`.** Os produtos guardam o nome e a descrição numa terceira cópia, em
minúsculas e sem acentos, mantida por um hook do schema. A pesquisa normaliza o termo da mesma
maneira e procura aí. Numa aplicação portuguesa isto não é detalhe: metade dos nomes leva acento
e quase ninguém os escreve no telemóvel — antes disto, procurar **"maca" não encontrava "Maçã
Bravo de Esmolfe"**. O hook é `pre('validate')` e não `pre('save')` de propósito, porque o
`insertMany` do seed valida os documentos mas não dispara os hooks de gravação.

**O escape.** O que o utilizador escreve é texto, não um padrão. Sem escapar, escrever `(` na
caixa de pesquisa produzia uma expressão regular inválida e **a API respondia 500**; `.*`
devolvia o catálogo inteiro; e um padrão como `a{1,99999}` podia pôr o servidor a trabalhar à
toa. Hoje qualquer um destes devolve 200 com zero resultados, que é o que um utilizador espera de
uma pesquisa por um parêntese.

Há ainda `$lt` sobre datas em `GET /api/auctions?aTerminar=true` (leilões que terminam na próxima
hora) e `$lt` sobre números nos alertas de stock baixo do produtor (`stock: { $lt: 5 }`).



# 6. Modelo de dados MongoDB: embedding vs linking

Seis coleções: `users`, `products`, `orders`, `auctions`, `bids`, `reviews`.

A regra seguida: **embeber o que é sempre lido em conjunto e não cresce sem limite; referenciar o
que é partilhado, muda com frequência ou cresce indefinidamente.**

| Decisão | Porquê |
| --- | --- |
| **`orders.linhas` embebidas** | São poucas (1 a 10 artigos), nunca são lidas sem a encomenda e nunca são partilhadas. Em cada linha guardo uma **cópia** de `nome` e `precoUnit`: se o produtor mudar o preço amanhã, a encomenda de hoje mantém o preço que o comprador pagou. |
| **`orders.entrega.morada` copiada** | Pelo mesmo motivo. A morada entra na encomenda como texto, não como referência ao perfil: se o comprador se mudar, as encomendas antigas continuam a dizer para onde foram entregues. |
| **`orders.comprador` e `orders.produtor` referenciados** | São utilizadores partilhados por muitas encomendas e os seus dados mudam. Lidos com `.populate()` só quando são precisos. |
| **`products.produtor` referenciado** | O mesmo produtor tem dezenas de produtos; duplicar a sua localidade e descrição em cada um obrigaria a reescrever todos os documentos a cada alteração. |
| **`auctions.licitacaoAtual` embebido** | É um único valor, lido sempre com o leilão e escrito em cada licitação. Embebido, a validação e a escrita fazem-se **numa só operação atómica** — é o que garante a consistência do leilão. |
| **`bids` em coleção própria** | O histórico cresce sem limite durante um leilão movimentado. Dentro do documento do leilão chegaria ao limite de 16 MB e tornaria cada leitura cara. |
| **`reviews` em coleção própria** | Crescem sem limite e são moderadas de forma independente do produto. A mesma coleção guarda os dois tipos: com `produto` preenchido é ao produto, com `produto` a `null` é ao produtor. Como `produtor` está sempre preenchido, a página do produtor mostra as duas com uma única pesquisa. |
| **`products.notaMedia` desnormalizado** | O catálogo mostra a média em cada cartão; somar as avaliações em cada listagem seria caro. É recalculada quando uma avaliação é criada, escondida ou apagada. |
| **Um `users` para os 3 papéis** | Os campos de produtor são opcionais. Evita uma coleção extra e uma junção em cada pedido de catálogo. |

**Validação no schema**: `required` nos campos obrigatórios, `enum` em `papel`, `categoria`,
`unidade`, `epoca`, `estado` e `aprovado`, `min` em preços, stock, quantidades e notas, `max: 5`
na nota, `unique` no email e `index` nas chaves estrangeiras mais consultadas. O `passwordHash`
nunca sai da API: o método `toJSON` do `User` apaga-o de todas as respostas.

## 6.1. As contas são feitas pelo MongoDB, não em JavaScript

Os painéis mostram totais — volume de negócios, vendas entregues, média das avaliações. A
primeira versão trazia os documentos todos para memória e somava-os com `reduce`:

```js
const encomendas = await Order.find();                       // TODAS as encomendas
volumeNegocios: encomendas.reduce((s, e) => s + e.total, 0)
```

Com 16 encomendas ninguém nota. Com 100 000, a API tenta carregar a coleção inteira para
responder a um número. A conta passou a ser feita onde os dados estão:

```js
const [encomendas] = await Order.aggregate([
  { $group: { _id: null, quantas: { $sum: 1 }, volume: { $sum: '$total' } } },
]);
```

Nos indicadores do produtor, uma única passagem conta as encomendas, conta as pendentes e soma as
entregues, usando `$cond` para decidir o que entra em cada conta:

```js
{ $group: {
    _id: null,
    total: { $sum: 1 },
    pendentes: { $sum: { $cond: [{ $eq: ['$estado', 'pendente'] }, 1, 0] } },
    vendas:    { $sum: { $cond: [{ $eq: ['$estado', 'entregue'] }, '$total', 0] } },
} }
```

## 6.2. Índices, e a prova de que servem para alguma coisa

Além dos índices nas chaves estrangeiras, há um **índice composto** para a consulta mais usada da
aplicação — o catálogo filtrado por categoria e preço:

```js
productSchema.index({ categoria: 1, preco: 1 });
```

A ordem dos campos segue a regra **ESR**: primeiro o campo comparado por *igualdade*
(`categoria`), depois o usado em *intervalo* e para *ordenar* (`preco`).

Medido com `.explain('executionStats')` sobre `categoria = "Mel" e preco <= 8`, numa coleção de
28 produtos:

| | Documentos lidos | Devolvidos |
| --- | --- | --- |
| Sem índice (`COLLSCAN`) | **28** | 2 |
| Com índice (`IXSCAN`) | **2** | 2 |

Sem índice o MongoDB lê a coleção toda e deita fora 26 documentos; com ele lê exatamente os dois
que interessam. A proporção 1:1 entre chaves examinadas e documentos devolvidos é o sinal de que
o índice cobre a consulta.



# 7. Documentação Swagger

A especificação está em `api/openapi.yaml` (OpenAPI 3.0.3) e cobre os **27 caminhos**, com todos
os parâmetros de query, corpos de pedido, códigos de resposta e o cabeçalho `Location` nas
criações.

- `components.schemas`: `Utilizador`, `RespostaLogin`, `ProdutoInput`, `Produto`,
  `LinhaEncomenda`, `Encomenda`, `Leilao`, `Licitacao`, `Avaliacao`, `Notificacao`, `Erro`.
- `components.securitySchemes.bearerAuth`: `http` / `bearer` / `JWT`, aplicado com
  `security: [{ bearerAuth: [] }]` em todos os endpoints protegidos.

Publicada com `swagger-ui-express`:

```js
const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
```

Para testar os endpoints protegidos no browser: fazer `POST /auth/login`, copiar o `token` da
resposta e colá-lo no botão **Authorize**.

# 8. Autenticação e segurança

- **Passwords com hash** — `bcrypt` com 12 rondas. A password em claro nunca é guardada nem
  registada.
- **JWT com expiração** — assinado com `JWT_SECRET` e válido 8 horas. O payload tem apenas `id`,
  `papel` e `nome`, que é o que a API precisa para autorizar.
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

- **Ser produtor não chega: tem de estar aprovado.** O papel diz o que a conta é, não se já pode
  trabalhar. Um segundo middleware (`produtorAprovado.js`) protege tudo o que um produtor cria ou
  altera — produtos, leilões e fotografias — e responde 403 enquanto o administrador não validar
  o registo. O estado é lido da **base de dados** e não do token: o token é assinado no início da
  sessão e não muda quando o administrador aprova, por isso lê-lo daí obrigaria o produtor a sair
  e a voltar a entrar para começar a vender. É uma consulta a mais por escrita, só nas escritas,
  e em troca a aprovação tem efeito no instante seguinte.

- **Posse do recurso verificada no filtro da query**, não só pelo papel. Um produtor autenticado
  não consegue editar o produto de outro porque o `_id` do dono faz parte do filtro:

```js
Product.findOneAndUpdate({ _id: req.params.id, produtor: req.user.id }, alteracoes, { new: true });
```

  Se o produto não for dele, não há documento que corresponda e a API responde `404`.

- **Campos não editáveis filtrados** — em `PUT /api/products/:id` os campos `produtor`,
  `notaMedia` e `numAvaliacoes` são retirados do corpo antes de gravar, para o cliente não poder
  transferir um produto para outro produtor nem falsificar a sua média.
- **Preços lidos sempre da base de dados** — `POST /api/orders` ignora preços enviados pelo
  cliente.
- **Segredos em variáveis de ambiente** — `.env` está no `.gitignore`; o repositório só tem
  `.env.example`.
- **Upload restrito** — só `image/jpeg`, `png`, `webp` e `gif`, no máximo 3 MB, com nome de
  ficheiro gerado pelo servidor.
- **HTTPS em produção** — a cargo da plataforma PaaS, que termina o TLS.
- **Cabeçalhos de segurança** — `helmet`. Duas exceções deliberadas: a CSP fica desligada porque
  o Swagger UI usa estilos e scripts inline, e a `Cross-Origin-Resource-Policy` é `cross-origin`
  porque a SPA corre noutra origem e precisa de carregar as imagens de `/uploads`.
- **Limite de tentativas no login** — 10 tentativas **falhadas** por IP em cada 15 minutos. O
  bcrypt torna cada tentativa lenta, mas é o atacante que decide quantas faz; este limite é que
  lhe corta o ritmo. Só as falhadas contam, por isso quem sabe a password nunca é incomodado —
  medido: 15 entradas corretas seguidas passam todas, 10 erradas esgotam a quota.



# 9. Tempo real e consistência dos leilões

## 9.1. Salas

O Socket.io usa **o mesmo JWT da API**, enviado no handshake, mas a autenticação é *opcional*:
quem não tiver sessão liga-se à mesma e acompanha os leilões, apenas fica sem `socket.user` e por
isso não consegue licitar.

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

Quatro famílias de salas:

- `leiloes` — sala única onde **todos** entram ao ligar-se. Mantém as listas de leilões
  atualizadas em qualquer página.
- `leilao:<id>` — uma sala por leilão. A presença é recalculada ao entrar, ao sair e no evento
  `disconnecting`.
- `user:<id>` — sala pessoal, só para quem tem sessão. Recebe as notificações de encomendas, de
  leilões ganhos ou fechados e da validação do registo.
- `admins` — os administradores, para as denúncias de avaliações chegarem ao painel.

## 9.2. O desafio técnico: duas licitações ao mesmo tempo

Quando dois compradores licitam o mesmo valor quase no mesmo instante, o servidor tem de aceitar
**apenas uma** e todos os clientes têm de ficar a ver o mesmo estado.

A solução é não ler-e-depois-escrever. Toda a validação está **dentro do filtro** de um único
`findOneAndUpdate`, por isso é o MongoDB que a aplica, de forma atómica, sobre o documento:

```js
const agora = new Date();
const fimProlongado = new Date(agora.getTime() + PROLONGAMENTO_MS); // 30 segundos

const leilao = await Auction.findOneAndUpdate(
  {
    _id: leilaoId,
    estado: 'ativo',
    terminaEm: { $gt: agora },
    // valor >= licitacaoAtual.valor + incremento, avaliado no servidor
    $expr: { $gte: [montante, { $add: ['$licitacaoAtual.valor', '$incremento'] }] },
  },
  {
    $set: { licitacaoAtual: { valor: montante, comprador: socket.user.id, nome: socket.user.nome } },
    $max: { terminaEm: fimProlongado },   // prolongamento automático, secção 9.6
  },
  { new: true }
);

if (!leilao) return socket.emit('recusada', 'Licitação recusada');

await Bid.create({ leilao: leilaoId, comprador: socket.user.id, valor: montante });
io.to(`leilao:${leilaoId}`).emit('nova-licitacao', { licitacaoAtual: leilao.licitacaoAtual });
```

Porque é que isto resolve o problema:

1. A primeira licitação a chegar ao MongoDB encontra o documento no estado esperado, grava e
   devolve o documento atualizado.
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

## 9.3. Os três estados de um leilão

Um leilão não nasce aberto. Quem o cria escolhe **a que horas abre** — à hora e ao minuto, entre
as 08:00 e as 18:00 do próprio dia — e quanto tempo dura a partir daí:

```
agendado  --(comecaEm)-->  ativo  --(terminaEm)-->  terminado
```

O tempo de espera não é um capricho: sem ele, um leilão de 10 minutos criado às 15h00 estaria a
meio antes de alguém dar por ele. Com o aviso, os compradores entram na sala antes de abrir e
ficam a ver a contagem decrescente.

O formulário envia o instante completo (`comecaEm`) e o servidor volta a verificá-lo: tem de
faltar pelo menos um minuto, não pode ser dali a mais de 24 horas e a hora do dia tem de cair
entre as 08:00 e as 18:00. Essa última é lida no **relógio do servidor**, não no de quem submete
— é por isso que o serviço publicado corre com `TZ=Europe/Lisbon`.

**As mudanças de estado são só do servidor.** Um `setInterval` de 3 em 3 segundos procura leilões
agendados cuja hora chegou (`comecaEm: { $lte: agora }`) e ativos que passaram da hora
(`terminaEm: { $lt: agora }`), muda-lhes o estado e avisa as salas. O cliente nunca decide que um
leilão abriu: limita-se a mostrar o que recebe. É por isso que o relógio do computador de quem
licita não tem qualquer influência. Licitar num leilão que ainda não abriu é impossível sem
código extra, porque o filtro atómico da licitação já exige `estado: 'ativo'`.

## 9.4. Tudo em tempo real, não só dentro da sala

Além das salas por leilão, há uma sala `leiloes` onde **todos os clientes entram ao ligar-se**,
com ou sem sessão iniciada. É ela que mantém vivas as *listas* de leilões:

| Evento | Quando | O que o cliente faz |
| --- | --- | --- |
| `leilao-atualizado` | alguém licitou | corrige só esse leilão na lista |
| `leiloes-mudaram` | um leilão abriu, fechou, nasceu ou foi apagado | volta a pedir a lista |

A distinção importa: uma licitação só muda um valor, mas abrir ou fechar muda **a que lista o
leilão pertence**, e aí não chega corrigir um número. No cliente isto está num hook,
`useListaLeiloes`, por isso qualquer página fica em tempo real sem saber nada de WebSockets.

## 9.5. Relógio sincronizado

O servidor envia apenas `terminaEm` (uma data absoluta). É cada cliente que calcula o tempo que
falta, de segundo a segundo, no componente `Contador`. Assim não é preciso sincronizar contadores
entre clientes: todos derivam o mesmo valor da mesma data.

A unidade mostrada **afina à medida que o fim se aproxima**:

| Falta | Mostra | Porquê |
| --- | --- | --- |
| mais de um dia | `2d 23h` | os segundos de um leilão que ainda dura dois dias não dizem nada |
| entre 1 hora e 1 dia | `5h 07min` | o minuto chega para decidir se vale a pena voltar mais tarde |
| menos de uma hora | `12:45` | aqui cada segundo conta, e é quando as licitações aparecem |

## 9.6. Prolongamento automático: ninguém ganha no último segundo

Com um fim fixo, a melhor jogada para um comprador não é licitar o que o lote vale: é passar o
leilão em silêncio e atirar o lance nos últimos segundos, quando já ninguém consegue responder.
Chama-se *sniping*, e faz com que ganhe quem tem melhor ligação à internet, não quem ofereceu
mais.

A regra passou a ser: **um leilão nunca fecha com uma licitação feita há menos de 30 segundos**.
Licitar perto do fim empurra o fim para meio minuto depois dessa licitação, e o leilão só fecha
quando passarem 30 segundos sem ninguém licitar.

O que torna isto simples é um operador do MongoDB, o `$max`, que **só grava se o valor novo for
maior do que o que lá está**. Como `terminaEm` é uma data, "maior" quer dizer "mais tarde":

| Quanto falta para o fim | `fimProlongado` é mais tarde? | Resultado |
| --- | --- | --- |
| 2 horas | não | o fim fica como estava |
| 40 segundos | não | o fim fica como estava |
| 5 segundos | sim | o fim passa a ser daqui a 30 segundos |

E repare-se que **não é uma segunda escrita**: o prolongamento vai no mesmo `findOneAndUpdate`
que valida e grava a licitação (secção 9.2), por isso é tão atómico como ela. Se fossem duas
escritas, havia uma janela em que o relógio do servidor podia fechar o leilão entre aceitar a
licitação e empurrar o fim.

No cliente não foi preciso temporizador nenhum: o `Contador` já tem o `terminaEm` nas
dependências do seu `useEffect`, por isso basta o hook guardar a data nova para a contagem
reiniciar sozinha em todos os ecrãs.

Testado com dois compradores ligados ao mesmo leilão: uma licitação a 10 minutos do fim não mexeu
na data; uma a 5 segundos do fim empurrou-a exatamente 30 segundos e os dois clientes receberam a
mesma data nova; uma segunda licitação dentro da janela voltou a empurrar; e, sem mais
licitações, o leilão fechou 30 segundos depois da última, com o vencedor e o valor certos.

## 9.7. Notificações: o WebSocket entrega, mas não guarda

O *toast* desaparece ao fim de segundos. Serve para quem está a olhar — e não serve para mais
nada: quem estava noutro separador perdia a venda, a avaliação e o fim do leilão. A primeira
resposta a isso foi um **sininho** no cabeçalho, com a lista guardada no `localStorage` do
browser.

Essa resposta estava errada, e a razão é instrutiva. Um evento de WebSocket **só existe
enquanto alguém está ligado para o receber**: o Socket.io entrega-o às salas que existem
naquele instante e esquece-o. Guardá-lo no cliente só resolve o caso de quem já lá estava.
Com a lista no browser havia duas falhas:

- um produtor que não tivesse a aplicação aberta — que é o estado normal de um produtor —
  **nunca sabia da encomenda**;
- e quem a tivesse aberta ficava com as notificações presas àquele computador; no telemóvel
  o sininho estava vazio.

A correção foi tratar a notificação como aquilo que ela é: **um recurso, não um evento**. Há
uma coleção `notifications` e uma função única no servidor que grava primeiro e emite depois:

```js
async function notificar(io, utilizador, { texto, para, tipo }) {
  const notificacao = await Notification.create({ utilizador, texto, para, tipo });
  io.to(`user:${utilizador}`).emit('notificacao', { ...notificacao.toJSON() });
  return notificacao;
}
```

A ordem não é indiferente: gravando primeiro, a notificação existe mesmo que ninguém esteja
ligado para a receber. O `emit` passa a ser só a entrega imediata a quem por acaso está
presente. Quem não está encontra-a ao iniciar sessão, em `GET /api/notifications`, em qualquer
computador.

Os sete sítios que notificam passaram todos por esta função:

| Papel | Quando | Para onde leva |
| --- | --- | --- |
| Comprador | a encomenda mudou de estado | `/encomendas` |
| Comprador | ganhou um leilão | a sala do leilão |
| Produtor | alguém comprou | `/produtor/encomendas` |
| Produtor | alguém avaliou um produto seu, ou a si | a sua página pública |
| Produtor | um leilão seu fechou — com quem e por quanto | a sala do leilão |
| Produtor | o administrador aprovou ou rejeitou o registo | `/produtor` |
| Administrador | há uma avaliação denunciada para moderar | `/admin` |

Os textos ficam **no servidor**, que é quem os grava: é a mesma frase que vai para a base de
dados e para o ecrã, e não há uma versão no cliente a divergir da outra.

Três pormenores que valem a pena:

- Os eventos antigos (`nova-encomenda`, `encomenda-atualizada`, `avaliacao-denunciada`)
  **continuam a existir**, mas agora com um só papel: manter em dia as páginas que já estão
  abertas. Ficaram separados do que é notificar — uma coisa é sincronizar um ecrã, outra é
  deixar um recado.
- O `registo-validado` não se limita a avisar: **corrige o utilizador da sessão**, senão o
  produtor acabado de aprovar via a mensagem e continuava sem os formulários, porque o estado
  do registo vinha do momento em que iniciou a sessão.
- A lista não é um arquivo. Mostram-se as 30 mais recentes, e um **índice TTL** encarrega o
  próprio MongoDB de apagar as que passam dos 30 dias:

```js
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
```

Verificado com o produtor **fora da aplicação**: a encomenda foi feita com ele sem sessão
iniciada, e ao entrar o sininho já tinha a notificação à espera, por ler.

## 9.8. O que uma licitação compromete

A plataforma **não tem pagamentos online**. Nem nas encomendas, nem nos leilões: o pagamento é
sempre combinado diretamente com o produtor. Foi uma decisão deliberada — integrar um gateway de
pagamentos traria obrigações legais e de segurança (dados de cartão, PCI-DSS, estornos) muito
para lá do âmbito do trabalho.

Por isso, licitar não movimenta dinheiro: é um **compromisso de compra**. Quem tiver a licitação
mais alta no fim fica comprometido a comprar o lote por esse valor, e o produtor contacta-o para
combinar o resto. A interface diz isto em dois sítios, porque é precisamente a dúvida que um
utilizador tem ao ver um botão que aumenta o valor em 25 €.



# 10. Deployment na Cloud

A aplicação **está publicada** e a configuração está versionada no repositório, em `render.yaml`
e `web/vercel.json` — não é uma intenção escrita no relatório, são ficheiros que as plataformas
leem.

**Modelo escolhido: PaaS + BaaS.**

| Componente | Serviço | Modelo |
| --- | --- | --- |
| API REST + Socket.io | Render — *Web Service* (Node) | **PaaS** |
| SPA React | Vercel | **PaaS** |
| Base de dados | MongoDB Atlas (*tier* gratuito M0) | **BaaS** |
| Imagens carregadas | disco do serviço (ver 10.5) | — |

## 10.1. Porquê PaaS e não IaaS

Numa IaaS (máquinas virtuais) seria preciso instalar e manter o sistema operativo, o Node, um
proxy inverso, os certificados TLS e as atualizações de segurança. Nada disso é específico desta
aplicação: é trabalho de operação que não acrescenta valor ao trabalho. Em PaaS entrega-se o
código e a plataforma trata do *runtime*, do HTTPS, do balanceamento e do escalamento; em troca
perde-se controlo sobre o ambiente, o que aqui não é limitação. A base de dados vai em BaaS pela
mesma razão, com a vantagem extra de ter backups e réplicas já incluídos.

## 10.2. Porquê Render e Vercel, e não Azure

O primeiro plano era o Azure, por ser uma suite integrada: App Service para a API, Static Web
Apps para a SPA e Blob Storage para as imagens. O **Azure for Students recusou a conta** — o
domínio institucional não consta da lista de verificação académica da Microsoft — e a alternativa
era uma subscrição paga com cartão associado.

O Render e a Vercel dão exatamente o mesmo modelo de serviço, com planos gratuitos e sem cartão.
O que se perde é ter o armazenamento de objetos na mesma suite, que é a limitação descrita em
10.5. O que **não** se perdeu foi nenhuma linha de código: toda a configuração vem de variáveis
de ambiente, por isso mudar de fornecedor foi reconfigurar, não reprogramar — o que é, em si, o
melhor argumento a favor do PaaS.

## 10.3. O que está no repositório

**`render.yaml`** descreve o serviço da API:

| Chave | Valor | Porquê |
| --- | --- | --- |
| `rootDir` | `api` | o repositório tem a API e a SPA; o Render só constrói esta pasta |
| `buildCommand` | `npm install` | não há passo de compilação: a API é CommonJS |
| `startCommand` | `npm start` | → `node src/server.js` |
| `healthCheckPath` | `/api/health` | o Render usa-a para saber se o serviço subiu |
| `region` | `frankfurt` | o mais próximo, para a latência das licitações |

Os segredos ficam marcados com `sync: false`: aparecem no painel do Render à espera de valor e
**nunca entram no repositório**. A versão do Node está no `engines` do `package.json`, que tanto
o Render como a Vercel leem.

**`web/vercel.json`** tem uma regra só:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

É o que faz uma SPA funcionar num alojamento estático. O routing é do React Router, no browser:
`/leiloes` não existe como ficheiro no servidor. Sem esta regra, abrir ou recarregar essa página
diretamente devolveria 404.

| Onde | Variável | Valor |
| --- | --- | --- |
| Render | `MONGODB_URI` | URI do cluster do Atlas |
| Render | `JWT_SECRET` | segredo novo, gerado só para produção |
| Render | `CORS_ORIGIN` | endereço da SPA na Vercel |
| Render | `TZ` | `Europe/Lisbon`, para validar as horas de abertura no fuso certo |
| Vercel | `VITE_API_URL` | endereço da API no Render |

## 10.4. Ordem de publicação

Há uma dependência circular: a API precisa de saber o endereço da SPA (para o CORS) e a SPA
precisa de saber o endereço da API. Resolve-se publicando primeiro e configurando depois:

1. **Atlas** — cluster, utilizador e `0.0.0.0/0` na lista de IPs (o plano gratuito do Render não
   garante um IP fixo, por isso não há endereço para restringir).
2. **Render** — ligar o repositório; o `render.yaml` é lido automaticamente. Preencher
   `MONGODB_URI` e `JWT_SECRET`.
3. **Vercel** — importar com a raiz em `web/` e definir `VITE_API_URL` com o endereço do passo 2.
4. **Voltar ao Render** — definir `CORS_ORIGIN` com o endereço do passo 3. Só a partir daqui a
   API deixa de aceitar qualquer origem.

Os *web services* do Render suportam WebSocket nativamente, ao contrário do App Service do Azure,
que exigia `--web-sockets-enabled true`. Uma característica do plano gratuito que convém saber:
**o serviço adormece depois de 15 minutos sem pedidos** e o primeiro pedido seguinte demora cerca
de 50 segundos. Não afeta o código nem os dados, mas afeta uma demonstração ao vivo.

## 10.5. Limitação conhecida: as imagens carregadas

O enunciado sugere guardar as imagens num serviço de armazenamento de objetos. **Esta aplicação
não o faz**, e vale a pena ser explícito sobre o que isso significa.

As imagens são recebidas pelo Multer, gravadas em `api/uploads/` e servidas pelo Express. O
`POST /api/uploads` devolve o **caminho** (`/uploads/ficheiro.png`) e não o endereço completo. A
primeira versão devolvia o endereço completo e isso partia-se assim que a aplicação saía do
computador: o endereço gravado era `http://localhost:3000/...`, e aberto no telemóvel o
`localhost` passava a ser o próprio telemóvel — a imagem desaparecia. Guardando o caminho, é quem
mostra a imagem que lhe junta o servidor, e a mesma imagem funciona em localhost, na rede local e
na versão publicada.

No plano gratuito do Render, porém, o disco é **efémero**: é recriado a cada publicação e a cada
despertar do serviço, por isso uma fotografia carregada por um produtor desaparece mais tarde ou
mais cedo. Os dados de demonstração não dependem disto: as imagens do `seed.js` são SVG em *data
URI*, guardados dentro dos próprios documentos.

Ficou de fora por decisão de âmbito. O custo dessa decisão é pequeno e está localizado: o upload
está isolado em `api/src/middleware/upload.js`, com cerca de vinte linhas. Trocar o `diskStorage`
do Multer pelo cliente do fornecedor é mudar esse ficheiro e mais nada — o resto da aplicação
continua a receber um URL e não sabe de onde vem.



# 11. Dificuldades encontradas

**Licitações simultâneas.** Foi a parte que obrigou a mais cuidado. A primeira versão lia o
leilão, comparava o valor em JavaScript e só depois gravava — o que abre uma janela em que duas
licitações leem o mesmo valor antigo e ambas são aceites. Passar toda a validação para dentro do
filtro do `findOneAndUpdate`, com `$expr`, resolveu o problema sem transações nem bloqueios.

**Carrinho com vários produtores.** Como é o produtor que muda o estado da encomenda, uma
encomenda com produtos de três produtores não teria um estado que fizesse sentido. A solução foi
agrupar as linhas por produtor no `POST /api/orders` e criar uma encomenda por cada um. O
carrinho avisa o comprador quando isso vai acontecer.

**Stock em concorrência.** Dois compradores a levar a última unidade ao mesmo tempo tinham o
mesmo problema dos leilões. A retirada do stock é feita com
`findOneAndUpdate({ _id, stock: { $gte: quantidade } }, { $inc: { stock: -quantidade } })`, que só
grava se ainda houver stock.

Isso resolvia uma linha de cada vez, mas não o carrinho inteiro: o stock é retirado produto a
produto, e numa encomenda com **vários produtos** a segunda linha podia falhar depois de a
primeira já ter sido descontada. Nenhuma encomenda era criada e as unidades da primeira linha
desapareciam da plataforma. Agora as retiradas vão sendo registadas e, se alguma linha falhar —
ou se a criação da encomenda falhar —, são **devolvidas** com um `$inc` positivo antes de
responder, por isso ou a encomenda se faz toda ou o stock fica como estava. É a alternativa
simples às transações do MongoDB, que obrigariam a sessões e a um *replica set*. Comprovado com
dois compradores a enviar ao mesmo tempo um carrinho com dois produtos em que o segundo tinha só
uma unidade: antes da correção, o primeiro produto descia **duas** unidades e só se vendia uma.

**Duas ligações WebSocket por utilizador.** Na primeira versão, o hook `useLeilao` abria uma
ligação própria, além da do contexto global — o que fazia o utilizador entrar duas vezes na sala
pessoal e receber cada notificação a dobrar. Passou a existir **uma só ligação**, criada no
`SocketContext` e usada pelo hook.

**Fugas de memória nos ouvintes.** Mudar de sala de leilão sem remover os ouvintes do socket
acumulava *handlers* e atualizava estado de componentes já desmontados. Todos os `useEffect` que
registam ouvintes devolvem agora uma função de limpeza com os `socket.off` correspondentes.

**Erros do Multer a darem 500.** Um ficheiro com formato inválido fazia o middleware atirar um
erro que chegava ao tratamento central como erro interno. Passou a ser apanhado no *callback* do
`upload.single` e convertido em `400` com a mensagem certa.

# 12. Conclusão

Os oito passos do enunciado estão cumpridos: interface Mobile First com SASS e três breakpoints,
SPA em React com componentes reutilizáveis e estado partilhado, API REST documentada em OpenAPI,
MongoDB com embedding e linking justificados e índices medidos, segurança com JWT e papéis,
tempo real com Socket.io, e deployment em PaaS com a base de dados em BaaS.

O que o trabalho me obrigou a perceber, e que não estava à partida no enunciado, foi que **a
consistência não se garante no cliente nem em JavaScript do lado do servidor**. Tanto nas
licitações como no stock, a solução acabou por ser a mesma: pôr a condição dentro do filtro da
operação de escrita e deixar a base de dados decidir. É uma linha de código a mais e um problema
de concorrência a menos.

Fica por fazer o armazenamento das imagens num serviço de objetos (secção 10.5), que é a única
sugestão do enunciado deliberadamente não implementada, e está isolada num ficheiro de vinte
linhas.

# 13. Utilização de ferramentas de IA

Conforme permitido pelo enunciado, foi usado um assistente de IA (Claude) no apoio à escrita de
código repetitivo (schemas Mongoose, formulários, especificação OpenAPI), na revisão da lógica de
concorrência dos leilões e na redacção deste relatório. Todas as decisões de arquitetura,
modelação de dados e segurança foram revistas e validadas por mim, e o código foi testado ponta a
ponta antes da entrega.

**Bibliotecas de terceiros usadas** (todas declaradas em `api/package.json` e `web/package.json`):
Express, Mongoose, Socket.io, jsonwebtoken, bcryptjs, cors, helmet, express-rate-limit, dotenv,
swagger-ui-express, yamljs, multer, React, React Router, Bootstrap, SASS, Leaflet e
socket.io-client.
