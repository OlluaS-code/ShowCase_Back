# OlluaS ShowCase - Server

API backend do OlluaS ShowCase. O servidor fornece autenticação, publicações, interações, notificações em tempo real, especialidades e operações administrativas.

## Stack

- Node.js 22+
- TypeScript
- Fastify 5
- TypeORM + PostgreSQL 15
- Redis 7
- TypeBox para schemas e validação
- JWT, Argon2 e rate limiting
- Vitest para testes

## Arquitetura

A aplicação segue uma separação por responsabilidades:

- `src/index.ts`: bootstrap, conexão com o banco, registro de rotas e graceful shutdown.
- `src/server.ts`: instância Fastify, CORS, plugins de segurança, Redis, validação, rate limit e tratamento global de erros.
- `src/api/routes`: definição dos endpoints e seus schemas.
- `src/api/controller`: adaptação entre HTTP e os serviços.
- `src/api/services`: regras de negócio.
- `src/api/repositories`: acesso a dados.
- `src/core`: modelos, segurança, busca, e-mail e erros de domínio.
- `src/database/migrations`: entidades TypeORM.
- `tests`: testes unitários e de integração.

## Pré-requisitos

- Node.js 22 ou superior
- Yarn
- PostgreSQL 15 ou compatível
- Redis 7 ou compatível

O `docker-compose.yml` oferece containers para PostgreSQL, Redis, backend e Caddy. Para desenvolvimento local, também é possível executar apenas PostgreSQL e Redis e iniciar a API com `yarn dev`.

## Configuração

1. Instale as dependências:

   ```bash
   yarn install
   ```

2. Crie `Server/.env` a partir de `Server/.env.example`.

3. Preencha, no mínimo, as variáveis exigidas fora do ambiente de teste:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgres://admin_portal_service:secure_dev_password@localhost:5432/portal_alta_criticidade
   JWT_SECRET=uma-chave-com-pelo-menos-16-caracteres
   ADMIN_PANEL_HASH=uma-hash-de-acesso
   REDIS_HOST=localhost
   REDIS_PORT=6379
   APP_FRONTEND_URL=http://localhost:5500
   ```

   `DATABASE_URL`, `JWT_SECRET` (com pelo menos 16 caracteres) e `ADMIN_PANEL_HASH` são validados no bootstrap. SMTP e Abstract API são necessários apenas para os fluxos que usam e-mail/verificação.

4. Suba as dependências locais, se necessário:

   ```bash
   docker compose up -d db redis
   ```

5. Em desenvolvimento, as tabelas podem ser sincronizadas e os dados de exemplo carregados:

   ```bash
   yarn db:sync
   yarn db:seed
   ```

   Use sincronização automática apenas em desenvolvimento; em produção, prefira migrações controladas.

## Comandos

Execute os comandos a partir de `Server/`:

| Comando           | Objetivo                                            |
| ----------------- | --------------------------------------------------- |
| `yarn dev`        | Inicia a API com `tsx watch`                        |
| `yarn check`      | Executa a verificação de tipos TypeScript           |
| `yarn build`      | Compila para `dist/`                                |
| `yarn start`      | Inicia a versão compilada em produção               |
| `yarn lint`       | Verifica o código com Biome                         |
| `yarn lint:fix`   | Corrige problemas reportados pelo Biome             |
| `yarn format`     | Formata os arquivos TypeScript                      |
| `yarn test`       | Executa os testes uma vez                           |
| `yarn test:watch` | Executa os testes em modo observação                |
| `yarn db:sync`    | Sincroniza entidades com o banco em desenvolvimento |
| `yarn db:seed`    | Carrega dados mockados                              |

A API fica disponível por padrão em `http://localhost:3000`.

## Endpoints

Todos os endpoints abaixo usam o prefixo indicado em `src/index.ts`.

| Grupo          | Rotas principais                                                                               | Acesso                            |
| -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| Health         | `GET /`                                                                                        | Público                           |
| Usuários       | `POST /api/users/register`, `POST /api/users/login`                                            | Público                           |
| Usuários       | `GET /api/users/`, `DELETE /api/users/:id`, `POST /api/users/:id/suspend`                      | Autenticado/admin conforme a rota |
| Publicações    | `GET /api/publications/feed`, `GET /api/publications/search`, `GET /api/publications/trending` | Público                           |
| Publicações    | `POST /api/publications/`, `PUT /api/publications/:id`, `DELETE /api/publications/:id`         | Admin                             |
| Interações     | `POST /api/interactions/like`, `POST /api/interactions/share`                                  | Autenticado                       |
| Auditoria      | `GET /api/interactions/audit/:userId`, `GET /api/interactions/audit/global`                    | Admin                             |
| Notificações   | `GET /api/notifications/`, `PATCH /api/notifications/read`, `DELETE /api/notifications/:id`    | Autenticado                       |
| Notificações   | `GET /api/notifications/live`                                                                  | Autenticado, SSE                  |
| Admin          | `GET /api/admin/verify/:hash`                                                                  | Hash administrativa               |
| Especialidades | `GET /api/specifications/`                                                                     | Público                           |
| Especialidades | `POST /api/specifications/`, `PUT /api/specifications/:id`, `DELETE /api/specifications/:id`   | Admin                             |

As requisições protegidas usam `Authorization: Bearer <accessToken>`. O cadastro tem limite de 5 requisições por IP a cada 5 minutos; há também rate limit global configurado no servidor.

## Fluxo principal

```mermaid
flowchart TD
    A[Cliente] --> B[Fastify]
    B --> C{Endpoint público ou protegido?}
    C -->|Público| D[Controller]
    C -->|Protegido| E[JWT e guardas de autorização]
    E -->|Autorizado| D
    E -->|Negado| F[Erro HTTP]
    D --> G[Service]
    G --> H[Repository / TypeORM]
    H --> I[(PostgreSQL)]
    G --> J[(Redis: cache e limites)]
    G --> K[Notificações]
    K --> L[SSE /api/notifications/live]
    D --> M[Resposta JSON]
```

## Testes

Os testes de integração usam PostgreSQL e Redis de teste configurados pelas variáveis `TEST_PG_*` e `TEST_REDIS_*`. Os testes unitários cobrem, entre outros pontos, hashing de senha, assinatura de URL e comportamento de requisições encaminhadas.

## Segurança e operação

- O acesso ao painel administrativo começa pela validação de `ADMIN_PANEL_HASH` e gera um token de barreira para o login administrativo.
- Senhas são tratadas com Argon2 e sessões usam JWT.
- CORS, rate limit, validação TypeBox, headers de segurança e tratamento global de erros são registrados no bootstrap do Fastify.
- O encerramento por `SIGINT` ou `SIGTERM` fecha o Fastify e destrói a conexão TypeORM.

> Atenção: o `docker-compose.yml` usa variáveis separadas de banco (`DB_HOST`, `DB_NAME` etc.), enquanto a configuração da aplicação exige `DATABASE_URL` e `ADMIN_PANEL_HASH`. Revise o ambiente do serviço `backend` antes de usar o compose como implantação completa.

## Licença

Este projeto está disponível sob a licença MIT. Consulte o arquivo `LICENSE` na raiz do repositório.
