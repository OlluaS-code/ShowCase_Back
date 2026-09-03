import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from './src/utils/settings/config';

const JWT_SECRET = config.JWT_SECRET || 'default_secret';
const adminToken = jwt.sign(
  { sub: 'admin-id-123', role: 'ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const NUM_CLIENTS = 100;
const clients: http.ClientRequest[] = [];

console.log(`[SSE-TEST] Abrindo ${NUM_CLIENTS} conexões simultâneas...`);

for (let i = 0; i < NUM_CLIENTS; i++) {
  const req = http.request('http://localhost:3000/notifications/live', {
    headers: {
      Authorization: `Bearer ${adminToken}` 
    }
  }, (res) => {
    res.on('data', (chunk) => {
      // Consome dados recebidos
    });
  });

  req.on('error', () => {});
  req.end();
  clients.push(req);
}

setTimeout(() => {
  console.log(`[SSE-TEST] Forçando desconexão de todos os ${NUM_CLIENTS} clientes de forma abrupta...`);
  clients.forEach((client) => {
    client.destroy(); // Fecha fisicamente o socket TCP no Windows
  });
  console.log(`[SSE-TEST] Sockets encerrados. Aguardando processamento de Cleanup no servidor...`);
}, 10000);
