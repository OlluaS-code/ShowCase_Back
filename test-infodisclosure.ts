import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from './src/utils/settings/config';

async function testInformationDisclosure() {
  console.log("=== Teste 4: Information Disclosure (Unique Constraint Violation) ===");
  try {
    const res = await axios.post('http://localhost:3000/users/register', {
      name: "Usuario",
      email: "test.admin@admin.com", // Assumindo que já existe no DB
      passwordPlain: "Valid!2Password",
      role: "ADMIN"
    });
    console.log("Response:", res.data);
  } catch (e: any) {
    if (e.response) {
      console.log("Status Code:", e.response.status);
      console.log("Body do Erro recebido:", e.response.data);
    } else {
      console.error("Erro desconhecido:", e.message);
    }
  }
}

testInformationDisclosure();
