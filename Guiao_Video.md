# Guião do vídeo de demonstração

Máximo **5 minutos**. O objetivo não é mostrar tudo — é mostrar o que distingue este
trabalho: o tempo real e a consistência dos leilões.

---

## Antes de gravar

| | |
| --- | --- |
| **Repor os dados** | `cd api && npm run seed` — põe os leilões a contar e as encomendas nos estados certos |
| **Arrancar** | `cd api && npm run dev` e `cd web && npm run dev` em dois terminais |
| **Aquecer** | Abrir a aplicação e o Swagger uma vez antes de gravar |
| **Duas janelas** | Uma normal e uma anónima, lado a lado. É o que permite mostrar o tempo real |
| **Esconder** | Barra de favoritos, notificações do sistema, separadores pessoais |
| **Zoom do browser** | 110–125%, para o texto ler-se no vídeo |

Contas (password `123456` em todas): `ana@dcm.pt` · `quinta@dcm.pt` · `admin@dcm.pt`

---

## 0:00 — 0:20 · Abertura

Ecrã: página inicial, catálogo visível.

> "Do Campo à Mesa é um mercado digital que liga pequenos produtores da região a
> compradores e à restauração local. Tem catálogo, encomendas e leilões em direto.
> Vou mostrar os quatro perfis, e deixo o leilão para o fim porque é a parte mais
> interessante."

---

## 0:20 — 1:00 · Visitante

1. Escrever **"mel"** na pesquisa → os resultados filtram enquanto escreves
2. Abrir a **Localidade** → mostrar que são os 308 concelhos de Portugal
3. Escolher **Bragança** → aparece *"Ainda não há produtores em Bragança"*
4. Voltar a todas e abrir a página de um produtor → **mapa**, produtos e avaliações

> "Os filtros são todos feitos no servidor, com `$regex` na pesquisa e `$gte` e `$lte`
> no preço. A localidade sai de uma lista fixa dos concelhos, o que faz o nome gravado
> e o nome filtrado serem sempre o mesmo — e dá ao mapa as coordenadas."

---

## 1:00 — 1:40 · Comprador

1. Entrar como **ana@dcm.pt** (botão de demonstração)
2. Juntar dois produtos de **produtores diferentes** ao carrinho
3. Abrir o carrinho → ler em voz alta: *"Serão criadas 2 encomendas, uma por produtor"*
4. Em **Entrega**, escolher *Entrega na morada* → a morada que a Ana guardou no registo
   aparece já escolhida; apontar para a opção *Entregar noutra morada*
5. Finalizar → vai para "As minhas encomendas"

> "O carrinho pode ter produtos de vários produtores, mas é o produtor que muda o estado
> da encomenda. Por isso o servidor divide em uma encomenda por produtor. A morada vem do
> perfil, mas é copiada para dentro da encomenda — se a Ana se mudar amanhã, as encomendas
> antigas continuam a dizer para onde foram."

**Deixa esta janela nas encomendas.** Vais precisar dela a seguir.

---

## 1:40 — 2:20 · Tempo real nas encomendas

Na **segunda janela** (anónima), entrar como **quinta@dcm.pt** → Painel → Encomendas.

1. Pôr as duas janelas lado a lado
2. Carregar em **"Marcar como confirmada"**
3. **Apontar para a outra janela**: o aviso aparece e o estado muda sozinho

> "Não recarreguei nada. O produtor muda o estado pela API, e a API usa o Socket.io para
> avisar o comprador na sala pessoal dele."

---

## 2:20 — 3:30 · Leilões (a parte mais importante)

**Primeiro, o leilão agendado:**

1. Ir a **Leilões → Por começar** → mostrar a contagem decrescente
2. Entrar na sala → *"Este leilão ainda não abriu"*

> "Quem cria o leilão escolhe a que horas abre, à hora e ao minuto, entre as 8 e as 18. É o
> servidor que o abre, não o cliente."

**Depois, o leilão a decorrer, com as duas janelas lado a lado:**

3. Janela 1 (Ana) e janela 2 (outra conta de comprador) na mesma sala
4. Licitar na janela 1 → **apontar para a janela 2**: o valor, o histórico e o nome mudam
5. Mostrar o número de participantes a dizer 2
6. Na janela 2, tentar licitar **abaixo do mínimo** → aparece o aviso de recusa

> "Quando duas licitações chegam quase ao mesmo tempo, só uma pode ser aceite. A
> validação está dentro do filtro de um `findOneAndUpdate`, por isso é o MongoDB que a
> aplica de forma atómica. A segunda já não encontra o documento como esperava e é
> recusada — sem nunca escrever."

7. **Opcional, se sobrar tempo:** abrir uma terceira janela na lista de leilões, sem
   sessão, e mostrar que o valor também muda lá

---

## 3:30 — 4:10 · Administrador

Entrar como **admin@dcm.pt**.

1. **Resumo** → os indicadores e o estado dos serviços
2. **Validar produtores** → aprovar o *Pomar das Caldas*
3. **Moderar avaliações** → mostrar as opções manter / esconder / apagar

> "O produtor fica pendente até ser validado, e os produtos dele não aparecem no
> catálogo até lá."

---

## 4:10 — 4:40 · API e telemóvel

1. Abrir **localhost:3000/api-docs** → mostrar os endpoints agrupados e o botão *Authorize*
2. Expandir um `POST` → mostrar o `201` e o cabeçalho `Location`
3. Voltar à aplicação e **encolher a janela** até à largura de um telemóvel → a grelha
   passa a uma coluna e o menu vira hambúrguer

---

## 4:40 — 5:00 · Fecho

> "A aplicação está toda em funcionamento: catálogo, encomendas, avaliações, leilões em
> tempo real e o painel de administração. O código, o relatório e as instruções de
> instalação estão no repositório. Obrigado."

---

## O que **não** mostrar

- Código no editor — isso é para a defesa, não para o vídeo
- Ecrãs de registo passo a passo — demoram e não acrescentam
- O `npm run dev` a arrancar
- Erros a serem corrigidos ao vivo

## Se ficar acima dos 5 minutos

Corta por esta ordem: o Swagger (4:10), o administrador (3:30), o leilão agendado (2:20).
**Nunca cortes a parte das duas janelas a licitar** — é o ponto alto do trabalho.
