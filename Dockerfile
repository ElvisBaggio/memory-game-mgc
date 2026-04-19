FROM node:20-alpine

WORKDIR /app

# Copiar package files e instalar dependências
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código da aplicação
COPY server.js ./
COPY public/ ./public/

# Criar diretório de uploads (persistido via volume)
RUN mkdir -p /app/uploads

ARG VERSION=dev
ENV APP_VERSION=$VERSION
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
