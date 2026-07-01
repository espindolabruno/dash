# Usar a imagem leve oficial do Node.js
FROM node:18-alpine

# Definir diretório de trabalho no container
WORKDIR /app

# Copiar os arquivos de definição de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm install --production

# Copiar todo o código-fonte para o container
COPY . .

# Expor a porta que o Express está configurado para escutar
EXPOSE 3000

# Variáveis padrão de produção
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
