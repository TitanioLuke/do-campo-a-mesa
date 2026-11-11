/**
 * Povoa a base de dados com dados de demonstração.
 *
 *   npm run seed
 *
 * ATENÇÃO: apaga tudo o que estiver na base de dados e volta a criar de raiz.
 * Só é preciso correr uma vez. Os leilões ativos duram vários dias, por isso
 * não é preciso estar sempre a repor os dados.
 *
 * Este ficheiro é quase todo uma lista de dados: a lógica resume-se aos três
 * utilitários do topo (datas, inserção com data e geração das imagens).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Auction = require('./models/Auction');
const Bid = require('./models/Bid');
const Review = require('./models/Review');

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const DIA = 24 * 60 * 60 * 1000;
const haDias = (n) => new Date(Date.now() - n * DIA);
const daquiA = (n) => new Date(Date.now() + n * DIA);
const daquiAMinutos = (n) => new Date(Date.now() + n * 60 * 1000);

/**
 * Grava documentos com uma data de criação escolhida por nós.
 * O Mongoose põe sempre `createdAt` igual a agora; com `timestamps: false`
 * passamos a controlar a data, para as encomendas e avaliações ficarem
 * espalhadas pelas últimas semanas em vez de aparecerem todas no mesmo minuto.
 */
function inserir(Modelo, documentos) {
  const comDatas = documentos.map(({ data, ...doc }) => ({
    ...doc,
    createdAt: data,
    updatedAt: data,
  }));
  return Modelo.insertMany(comDatas, { timestamps: false });
}

const CORES = {
  'Hortícolas': ['#2F5D3A', '#5C9A6B'],
  Fruta: ['#A94A26', '#D9833F'],
  Mel: ['#B8860B', '#E8B931'],
  Vinho: ['#6B2737', '#A4455C'],
  Queijo: ['#8A6D3B', '#D6B86A'],
  Outros: ['#3F4A55', '#6F7D8C'],
};

/**
 * Gera a imagem do produto como um SVG embebido num `data:` URI.
 *
 * Guardar o próprio desenho no campo `imagem`, em vez de um ficheiro, faz com
 * que os dados de demonstração funcionem em qualquer sítio — local ou na Cloud
 * — sem depender da internet nem de um serviço de storage. As fotografias que
 * os produtores carregam seguem outro caminho (ver `middleware/upload.js`).
 */
function criarImagem(nome, categoria) {
  const [c1, c2] = CORES[categoria] || CORES.Outros;

  // Parte o nome em linhas de ~16 caracteres, para caber na largura da imagem
  const linhas = [];
  let linha = '';
  for (const palavra of nome.split(' ')) {
    if (`${linha} ${palavra}`.trim().length > 16 && linha) {
      linhas.push(linha.trim());
      linha = palavra;
    } else {
      linha = `${linha} ${palavra}`;
    }
  }
  if (linha.trim()) linhas.push(linha.trim());

  const primeiraLinha = 250 - (linhas.length - 1) * 26;
  const texto = linhas
    .map((l, i) => `<text x="300" y="${primeiraLinha + i * 52}" font-size="44" font-family="Georgia, serif" fill="#ffffff" text-anchor="middle">${l}</text>`)
    .join('\n  ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="600" height="420" fill="url(#g)"/>
  <text x="300" y="132" font-size="21" letter-spacing="5" font-family="Helvetica, Arial, sans-serif" fill="#ffffff" fill-opacity="0.7" text-anchor="middle">${categoria.toUpperCase()}</text>
  <line x1="250" y1="168" x2="350" y2="168" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/>
  ${texto}
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ---------------------------------------------------------------------------

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/do-campo-a-mesa');
  console.log('Ligado ao MongoDB. A limpar as coleções...');

  await Promise.all([
    User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}),
    Auction.deleteMany({}), Bid.deleteMany({}), Review.deleteMany({}),
  ]);
  const hash = await bcrypt.hash('123456', 12);
  const conta = (extra) => ({ passwordHash: hash, ...extra });

  // ========================= UTILIZADORES =========================

  await inserir(User, [conta({
    nome: 'Administrador', email: 'admin@dcm.pt', papel: 'admin', data: haDias(240),
  })]);

  const [quinta, horta, apiario, queijaria, adega, pomar] = await inserir(User, [
    conta({
      nome: 'Quinta do Vale', email: 'quinta@dcm.pt', papel: 'produtor',
      localidade: 'Ponte de Lima', telefone: '258 900 100', aprovado: 'aprovado',
      descricao: 'Produção familiar de hortícolas e fruta em modo biológico desde 1987. '
        + 'Trabalhamos 4 hectares de terra em Arcozelo e entregamos duas vezes por semana em Ponte de Lima e Viana.',
      latitude: 41.7574, longitude: -8.5875, data: haDias(230),
    }),
    conta({
      nome: 'Horta da Serra', email: 'horta@dcm.pt', papel: 'produtor',
      localidade: 'Viana do Castelo', telefone: '258 900 200', aprovado: 'aprovado',
      descricao: 'Legumes da época colhidos no próprio dia da entrega. '
        + 'Fornecemos várias cantinas escolares e restaurantes do concelho.',
      latitude: 41.717, longitude: -8.7594, data: haDias(205),
    }),
    conta({
      nome: 'Apiário do Minho', email: 'apiario@dcm.pt', papel: 'produtor',
      localidade: 'Arcos de Valdevez', telefone: '258 900 300', aprovado: 'aprovado',
      descricao: 'Mel de urze, rosmaninho e castanheiro colhido na Serra da Peneda. '
        + '120 colmeias em apiários acima dos 700 metros.',
      latitude: 41.9029, longitude: -8.3645, data: haDias(180),
    }),
    conta({
      nome: 'Queijaria do Lima', email: 'queijaria@dcm.pt', papel: 'produtor',
      localidade: 'Ponte da Barca', telefone: '258 900 400', aprovado: 'aprovado',
      descricao: 'Queijos de cabra e de ovelha de fabrico artesanal, com cura em cave de pedra. '
        + 'Três gerações a fazer o mesmo queijo.',
      latitude: 41.8067, longitude: -8.3098, data: haDias(150),
    }),
    conta({
      nome: 'Adega do Alvarinho', email: 'adega@dcm.pt', papel: 'produtor',
      localidade: 'Monção', telefone: '251 900 500', aprovado: 'aprovado',
      descricao: 'Pequena adega familiar na sub-região de Monção e Melgaço. '
        + 'Vinhos verdes de Alvarinho e Loureiro, vindima manual.',
      latitude: 42.0272, longitude: -8.4264, data: haDias(120),
    }),
    conta({
      nome: 'Pomar das Caldas', email: 'pomar@dcm.pt', papel: 'produtor',
      localidade: 'Vizela', telefone: '253 900 600', aprovado: 'pendente',
      descricao: 'Pomar de cereja e ameixa à espera de validação para começar a vender.',
      latitude: 41.3733, longitude: -8.2956, data: haDias(3),
    }),
  ]);

  const [ana, bruno, carla, diogo, lagar] = await inserir(User, [
    conta({ nome: 'Ana Silva', email: 'ana@dcm.pt', papel: 'comprador', data: haDias(190) }),
    conta({ nome: 'Bruno Costa', email: 'bruno@dcm.pt', papel: 'comprador', data: haDias(165) }),
    conta({ nome: 'Carla Mendes', email: 'carla@dcm.pt', papel: 'comprador', data: haDias(95) }),
    conta({ nome: 'Diogo Pereira', email: 'diogo@dcm.pt', papel: 'comprador', data: haDias(60) }),
    conta({ nome: 'Restaurante O Lagar', email: 'lagar@dcm.pt', papel: 'comprador', data: haDias(45) }),
  ]);

  // ========================= PRODUTOS =========================

  const prod = (produtor, nome, categoria, preco, unidade, stock, bio, epoca, dias, descricao) => ({
    produtor: produtor._id, nome, categoria, preco, unidade, stock,
    biologico: bio, epoca, descricao, imagem: criarImagem(nome, categoria),
    data: haDias(dias),
  });

  const p = await inserir(Product, [
    // --- Quinta do Vale ---
    prod(quinta, 'Kiwi Hayward', 'Fruta', 2.40, 'kg', 40, true, 'Outono', 120, 'Kiwi de polpa firme, colhido na quinta e guardado em câmara.'),
    prod(quinta, 'Maçã Bravo de Esmolfe', 'Fruta', 3.10, 'kg', 25, true, 'Outono', 118, 'Variedade DOP, muito aromática e de calibre pequeno.'),
    prod(quinta, 'Couve Portuguesa', 'Hortícolas', 1.20, 'un', 60, true, 'Todo o ano', 110, 'Couve tenra, cortada à mão para caldo verde.'),
    prod(quinta, 'Abóbora Manteiga', 'Hortícolas', 1.80, 'kg', 3, false, 'Outono', 95, 'Doce e cremosa, ideal para sopas e assados.'),
    prod(quinta, 'Nabo da Terra', 'Hortícolas', 1.30, 'kg', 35, true, 'Inverno', 70, 'Nabo de raiz branca, com as rama incluída.'),
    prod(quinta, 'Pera Rocha', 'Fruta', 2.20, 'kg', 48, false, 'Outono', 55, 'Pera Rocha do Oeste, crocante e sumarenta.'),

    // --- Horta da Serra ---
    prod(horta, 'Tomate Coração de Boi', 'Hortícolas', 2.90, 'kg', 30, false, 'Verão', 115, 'Tomate de polpa carnuda e pouca semente.'),
    prod(horta, 'Batata de Trás-os-Montes', 'Hortícolas', 1.10, 'kg', 120, false, 'Todo o ano', 112, 'Batata de terra fria, boa para assar e para cozer.'),
    prod(horta, 'Cebola Roxa', 'Hortícolas', 1.40, 'kg', 50, true, 'Todo o ano', 100, 'Cebola roxa doce, excelente em saladas.'),
    prod(horta, 'Alface Frisada', 'Hortícolas', 0.90, 'un', 4, true, 'Primavera', 80, 'Colhida no próprio dia da entrega.'),
    prod(horta, 'Curgete', 'Hortícolas', 1.60, 'kg', 28, false, 'Verão', 75, 'Curgete tenra de casca fina, colhida pequena.'),
    prod(horta, 'Feijão Verde', 'Hortícolas', 2.40, 'kg', 18, true, 'Verão', 65, 'Feijão verde largo, apanhado à mão.'),
    prod(horta, 'Cenoura', 'Hortícolas', 1.25, 'kg', 65, false, 'Todo o ano', 50, 'Cenoura de areia, doce e estaladiça.'),

    // --- Apiário do Minho ---
    prod(apiario, 'Mel de Urze', 'Mel', 7.50, 'un', 18, true, 'Todo o ano', 170, 'Frasco de 500 g. Mel escuro, denso e de sabor intenso.'),
    prod(apiario, 'Mel de Rosmaninho', 'Mel', 6.80, 'un', 22, true, 'Todo o ano', 168, 'Frasco de 500 g. Suave, floral e de cor clara.'),
    prod(apiario, 'Mel de Castanheiro', 'Mel', 8.20, 'un', 12, true, 'Todo o ano', 140, 'Frasco de 500 g. Amargo no fim, muito aromático.'),
    prod(apiario, 'Pólen Fresco', 'Outros', 9.00, 'un', 10, true, 'Primavera', 90, 'Pólen apanhado na Serra da Peneda e congelado no dia.'),
    prod(apiario, 'Própolis', 'Outros', 11.50, 'un', 6, true, 'Todo o ano', 40, 'Frasco de 30 ml de tintura de própolis.'),

    // --- Queijaria do Lima ---
    prod(queijaria, 'Queijo de Cabra Curado', 'Queijo', 12.50, 'kg', 8, false, 'Todo o ano', 145, 'Cura mínima de 60 dias em cave de pedra.'),
    prod(queijaria, 'Queijo Fresco de Vaca', 'Queijo', 4.20, 'un', 20, false, 'Todo o ano', 130, 'Feito de manhã, para comer no próprio dia.'),
    prod(queijaria, 'Requeijão', 'Queijo', 3.10, 'un', 14, false, 'Todo o ano', 85, 'Requeijão de ovelha, para comer com doce de abóbora.'),
    prod(queijaria, 'Queijo de Ovelha Amanteigado', 'Queijo', 15.90, 'kg', 5, false, 'Inverno', 45, 'Pasta mole e amanteigada, cura de 45 dias.'),

    // --- Adega do Alvarinho ---
    prod(adega, 'Alvarinho Reserva 2023', 'Vinho', 14.50, 'un', 60, false, 'Todo o ano', 105, 'Garrafa de 750 ml. Estágio de 6 meses sobre borras finas.'),
    prod(adega, 'Vinho Verde Loureiro 2024', 'Vinho', 5.90, 'un', 36, false, 'Todo o ano', 100, 'Garrafa de 750 ml. Fresco, cítrico e leve.'),
    prod(adega, 'Vinho Tinto da Casa', 'Vinho', 6.40, 'un', 42, false, 'Todo o ano', 72, 'Garrafa de 750 ml. Tinto jovem de vinhas velhas.'),
    prod(adega, 'Espumante Bruto', 'Vinho', 11.80, 'un', 24, false, 'Todo o ano', 35, 'Garrafa de 750 ml. Método clássico, 18 meses de cave.'),

    // --- Pomar das Caldas (produtor PENDENTE: não aparece no catálogo) ---
    prod(pomar, 'Cereja da Cova da Beira', 'Fruta', 5.50, 'kg', 30, false, 'Primavera', 2, 'Cereja de calibre grande, apanhada à mão.'),
    prod(pomar, 'Ameixa Rainha Cláudia', 'Fruta', 3.80, 'kg', 25, false, 'Verão', 2, 'Ameixa verde muito doce, da variedade Rainha Cláudia.'),
  ]);

  // Atalhos por nome, para as encomendas ficarem legíveis
  const prd = Object.fromEntries(p.map((x) => [x.nome, x]));

  // ========================= ENCOMENDAS =========================

  const enc = (comprador, produtor, linhas, estado, dias, tipo, morada = '') => ({
    comprador: comprador._id,
    produtor: produtor._id,
    linhas: linhas.map(([produto, quantidade]) => ({
      produto: produto._id, nome: produto.nome, precoUnit: produto.preco, quantidade,
    })),
    total: Number(linhas.reduce((soma, [x, q]) => soma + x.preco * q, 0).toFixed(2)),
    estado,
    entrega: { tipo, morada },
    data: haDias(dias),
  });

  const MORADA_ANA = 'Rua das Flores 12, Viana do Castelo';
  const MORADA_LAGAR = 'Largo do Lagar 4, Ponte de Lima';

  await inserir(Order, [
    // --- entregues (histórico) ---
    enc(ana, quinta, [[prd['Kiwi Hayward'], 3], [prd['Couve Portuguesa'], 2]], 'entregue', 42, 'entrega', MORADA_ANA),
    enc(ana, apiario, [[prd['Mel de Urze'], 2]], 'entregue', 35, 'levantamento'),
    enc(bruno, horta, [[prd['Batata de Trás-os-Montes'], 10], [prd['Cenoura'], 3]], 'entregue', 33, 'levantamento'),
    enc(bruno, queijaria, [[prd['Queijo de Cabra Curado'], 1], [prd['Requeijão'], 2]], 'entregue', 28, 'levantamento'),
    enc(carla, adega, [[prd['Alvarinho Reserva 2023'], 2], [prd['Vinho Verde Loureiro 2024'], 3]], 'entregue', 26, 'entrega', 'Av. Central 88, Braga'),
    enc(lagar, horta, [[prd['Tomate Coração de Boi'], 8], [prd['Cebola Roxa'], 5], [prd['Curgete'], 6]], 'entregue', 21, 'entrega', MORADA_LAGAR),
    enc(ana, quinta, [[prd['Maçã Bravo de Esmolfe'], 2], [prd['Pera Rocha'], 2]], 'entregue', 18, 'entrega', MORADA_ANA),
    enc(diogo, apiario, [[prd['Mel de Castanheiro'], 1], [prd['Pólen Fresco'], 1]], 'entregue', 14, 'levantamento'),
    enc(lagar, queijaria, [[prd['Queijo Fresco de Vaca'], 10]], 'entregue', 11, 'entrega', MORADA_LAGAR),
    enc(carla, quinta, [[prd['Nabo da Terra'], 3]], 'entregue', 9, 'levantamento'),

    // --- a decorrer (para a demonstração) ---
    enc(diogo, adega, [[prd['Espumante Bruto'], 2]], 'pronta', 4, 'levantamento'),
    enc(ana, horta, [[prd['Feijão Verde'], 2], [prd['Alface Frisada'], 3]], 'pronta', 3, 'entrega', MORADA_ANA),
    enc(lagar, quinta, [[prd['Couve Portuguesa'], 12], [prd['Abóbora Manteiga'], 4]], 'confirmada', 2, 'entrega', MORADA_LAGAR),
    enc(carla, queijaria, [[prd['Queijo de Ovelha Amanteigado'], 1]], 'confirmada', 1, 'levantamento'),
    enc(bruno, apiario, [[prd['Mel de Rosmaninho'], 2], [prd['Própolis'], 1]], 'pendente', 0, 'levantamento'),
    enc(diogo, horta, [[prd['Cenoura'], 4]], 'pendente', 0, 'entrega', 'Rua do Souto 3, Barcelos'),
  ]);

  // ========================= AVALIAÇÕES =========================
  // Só de quem tem encomendas entregues: com `produto` são ao produto,
  // com `produto: null` são ao produtor.

  const av = (comprador, produtor, produto, nota, comentario, dias) => ({
    produto: produto ? produto._id : null,
    produtor: produtor._id,
    comprador: comprador._id,
    nome: comprador.nome,
    nota, comentario, data: haDias(dias),
  });

  const avaliacoes = await inserir(Review, [
    // --- a produtos ---
    av(ana, quinta, prd['Kiwi Hayward'], 5, 'Kiwis excelentes, muito doces e sem fios.', 40),
    av(ana, quinta, prd['Couve Portuguesa'], 4, 'Couve muito fresca, deu para dois caldos.', 40),
    av(ana, apiario, prd['Mel de Urze'], 5, 'O melhor mel de urze que já comprei. Vale o preço.', 33),
    av(bruno, horta, prd['Batata de Trás-os-Montes'], 4, 'Batata boa para assar, veio bem limpa.', 31),
    av(bruno, queijaria, prd['Queijo de Cabra Curado'], 5, 'Cura no ponto certo, muito saboroso.', 26),
    av(carla, adega, prd['Alvarinho Reserva 2023'], 5, 'Fresco e mineral, acompanhou bem um peixe grelhado.', 24),
    av(carla, adega, prd['Vinho Verde Loureiro 2024'], 4, 'Muito agradável e com bom preço.', 24),
    av(lagar, horta, prd['Tomate Coração de Boi'], 5, 'Usamos na cozinha todas as semanas. Qualidade constante.', 19),
    av(lagar, horta, prd['Curgete'], 3, 'Boas, mas duas vieram com a casca marcada.', 19),
    av(ana, quinta, prd['Maçã Bravo de Esmolfe'], 5, 'Perfumadas como as da minha avó.', 16),
    av(diogo, apiario, prd['Mel de Castanheiro'], 4, 'Sabor forte, não é para todos, mas eu gosto.', 12),
    av(lagar, queijaria, prd['Queijo Fresco de Vaca'], 5, 'Chegou no próprio dia, como combinado.', 9),
    av(carla, quinta, prd['Nabo da Terra'], 4, 'Rama ainda verde, sinal de ter sido colhido de fresco.', 7),

    // --- ao produtor ---
    av(ana, quinta, null, 5, 'Entrega sempre à hora combinada e muito simpáticos ao telefone.', 39),
    av(bruno, horta, null, 5, 'Levantamento rápido e os legumes vêm sempre bem acondicionados.', 30),
    av(carla, adega, null, 4, 'Bom atendimento. A entrega demorou um dia mais do que o previsto.', 23),
    av(lagar, horta, null, 5, 'Fornecem o nosso restaurante há meses, nunca falharam uma entrega.', 18),
    av(diogo, apiario, null, 5, 'Explicaram-me a diferença entre os méis todos. Recomendo.', 11),
  ]);

  // Recalcular a média de cada produto a partir das avaliações criadas
  for (const produto of p) {
    const suas = avaliacoes.filter((a) => String(a.produto) === String(produto._id));
    if (!suas.length) continue;
    await Product.findByIdAndUpdate(produto._id, {
      notaMedia: Number((suas.reduce((s, a) => s + a.nota, 0) / suas.length).toFixed(1)),
      numAvaliacoes: suas.length,
    });
  }

  // ========================= LEILÕES =========================
  // Os ativos duram vários dias, para não ser preciso repor os dados. Há ainda
  // um agendado, que abre sozinho daqui a poucos minutos — serve para mostrar
  // na demonstração a sala a abrir em direto.

  const [kiwi, mel, alvarinho, batata, queijo] = await inserir(Auction, [
    {
      produtor: quinta._id, lote: 'Lote de 50 kg de Kiwi Hayward',
      descricao: 'Excedente da colheita de outubro. Levantamento na quinta, em Arcozelo.',
      imagem: criarImagem('Lote de Kiwi', 'Fruta'),
      precoBase: 60, incremento: 5,
      licitacaoAtual: { valor: 75, comprador: carla._id, nome: carla.nome },
      comecaEm: haDias(1), terminaEm: daquiA(3), estado: 'ativo', data: haDias(1),
    },
    {
      produtor: apiario._id, lote: 'Lote de 30 frascos de Mel de Urze',
      descricao: 'Mel de urze de 500 g, colheita deste ano. Ideal para revenda.',
      imagem: criarImagem('Lote de Mel', 'Mel'),
      precoBase: 150, incremento: 10,
      licitacaoAtual: { valor: 180, comprador: lagar._id, nome: lagar.nome },
      comecaEm: haDias(2), terminaEm: daquiA(5), estado: 'ativo', data: haDias(2),
    },
    {
      produtor: adega._id, lote: 'Lote de 12 garrafas de Alvarinho Reserva',
      descricao: 'Caixa de madeira com 12 garrafas da reserva de 2023.',
      imagem: criarImagem('Lote de Alvarinho', 'Vinho'),
      precoBase: 120, incremento: 10,
      licitacaoAtual: { valor: 120, comprador: null, nome: '' },
      comecaEm: haDias(0), terminaEm: daquiA(6), estado: 'ativo', data: haDias(0),
    },
    {
      produtor: horta._id, lote: 'Lote de 80 kg de Batata de Trás-os-Montes',
      descricao: 'Saldo de armazém. Levantamento em Viana do Castelo.',
      imagem: criarImagem('Lote de Batata', 'Hortícolas'),
      precoBase: 70, incremento: 5,
      licitacaoAtual: { valor: 110, comprador: lagar._id, nome: lagar.nome },
      comecaEm: haDias(9), terminaEm: haDias(4), estado: 'terminado', data: haDias(9),
    },
    {
      produtor: queijaria._id, lote: 'Lote de 20 queijos de cabra curados',
      descricao: 'Queijos de 400 g com cura de 60 dias.',
      imagem: criarImagem('Lote de Queijo', 'Queijo'),
      precoBase: 200, incremento: 10,
      licitacaoAtual: { valor: 260, comprador: carla._id, nome: carla.nome },
      comecaEm: haDias(16), terminaEm: haDias(9), estado: 'terminado', data: haDias(16),
    },
    {
      produtor: horta._id, lote: 'Lote de 40 kg de Cebola Roxa',
      descricao: 'Excedente da apanha desta semana. Abre daqui a poucos minutos.',
      imagem: criarImagem('Lote de Cebola', 'Hortícolas'),
      precoBase: 40, incremento: 5,
      licitacaoAtual: { valor: 40, comprador: null, nome: '' },
      comecaEm: daquiAMinutos(6), terminaEm: daquiAMinutos(6 + 60),
      estado: 'agendado', data: haDias(0),
    },
  ]);

  // Histórico de licitações, coerente com a licitação atual de cada leilão
  const lic = (leilao, comprador, valor, horasAtras) => ({
    leilao: leilao._id, comprador: comprador._id, nome: comprador.nome, valor,
    data: new Date(Date.now() - horasAtras * 60 * 60 * 1000),
  });

  await inserir(Bid, [
    lic(kiwi, bruno, 65, 20), lic(kiwi, carla, 70, 14), lic(kiwi, bruno, 72, 9), lic(kiwi, carla, 75, 5),
    lic(mel, diogo, 160, 30), lic(mel, lagar, 170, 22), lic(mel, diogo, 175, 16), lic(mel, lagar, 180, 6),
    lic(batata, ana, 75, 120), lic(batata, lagar, 85, 116), lic(batata, ana, 95, 110), lic(batata, lagar, 110, 98),
    lic(queijo, bruno, 210, 240), lic(queijo, carla, 230, 232), lic(queijo, bruno, 250, 225), lic(queijo, carla, 260, 220),
  ]);

  const contar = async (M) => String(await M.countDocuments()).padStart(3);
  console.log(`
Base de dados preenchida.

  ${await contar(User)} utilizadores     ${await contar(Product)} produtos
  ${await contar(Order)} encomendas      ${await contar(Review)} avaliações
  ${await contar(Auction)} leilões        ${await contar(Bid)} licitações

  Contas (password de todas: 123456)
  ----------------------------------
  Administrador   admin@dcm.pt
  Produtores      quinta@dcm.pt · horta@dcm.pt · apiario@dcm.pt
                  queijaria@dcm.pt · adega@dcm.pt
                  pomar@dcm.pt  (pendente de validação)
  Compradores     ana@dcm.pt · bruno@dcm.pt · carla@dcm.pt
                  diogo@dcm.pt · lagar@dcm.pt
`);
  await mongoose.disconnect();
}

seed().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
