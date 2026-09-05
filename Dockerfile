# Estágio de Compilação
FROM node:22-alpine AS builder

WORKDIR /app

# Instala ferramentas necessárias para compilação nativa (argon2)
RUN apk add --no-cache python3 make g++

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Estágio de Execução (Produção)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instala apenas dependências de produção
COPY package.json yarn.lock ./
RUN apk add --no-cache python3 make g++ && \
    yarn install --production --frozen-lockfile && \
    apk del python3 make g++

# Copia os arquivos compilados em dist
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]