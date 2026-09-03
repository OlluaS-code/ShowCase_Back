import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from './src/utils/settings/config';

const JWT_SECRET = config.JWT_SECRET || 'default_secret';

const adminToken = jwt.sign(
  { sub: 'admin-id-123', role: 'ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function runTests() {
  console.log("=== Teste A: Payload com Propriedades Adicionais ===");
  try {
    const res = await axios.post('http://localhost:3000/publications', {
      title: "Publicação de Testes",
      content: "Conteúdo rico de validação de dados.",
      category: "Backend",
      media: [],
      hackAttempt: "DROP TABLE users;"
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("Response:", res.data);
    console.log("hackAttempt present?", 'hackAttempt' in res.data);
  } catch (e: any) {
    console.error("Erro Teste A:", e.response?.data || e.message);
  }

  console.log("\n=== Teste B: Payload Inválido no Modo Dry-Run ===");
  try {
    const res = await axios.post('http://localhost:3000/publications', {
      title: 123, // Invalido: deve ser string
      content: "Curto",
      category: "InvalidCategory",
      media: []
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("Status code:", res.status);
    console.log("Response:", res.data);
  } catch (e: any) {
    console.error("Erro Teste B:", e.response?.data || e.message);
  }
}

runTests();
