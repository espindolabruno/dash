# Usar a imagem oficial e ultra-leve do Nginx baseada em Alpine Linux
FROM nginx:alpine

# Copiar os arquivos estáticos do projeto para o diretório raiz do Nginx
COPY . /usr/share/nginx/html

# Expor a porta 80 do container
EXPOSE 80

# Iniciar o servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
