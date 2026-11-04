require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = require('./app');
const configurarSockets = require('./sockets/leiloes');
const origensPermitidas = require('./origens');

const PORTA = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/do-campo-a-mesa';

async function arrancar() {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB ligado');

  const servidor = http.createServer(app);

  // Socket.io no mesmo servidor HTTP da API, com as mesmas origens da REST
  const io = new Server(servidor, { cors: { origin: origensPermitidas() } });
  configurarSockets(io);

  // Disponibiliza o `io` às rotas REST (req.app.get('io')) para enviar notificações
  app.set('io', io);

  servidor.listen(PORTA, () => {
    console.log(`API      http://localhost:${PORTA}/api`);
    console.log(`Swagger  http://localhost:${PORTA}/api-docs`);
  });
}

arrancar().catch((erro) => {
  console.error('Falha ao arrancar:', erro.message);
  process.exit(1);
});
