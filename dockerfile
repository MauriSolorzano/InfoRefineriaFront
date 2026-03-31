FROM nginx:alpine
# Copia tus archivos al directorio que sirve Nginx
COPY . /usr/share/nginx/html
EXPOSE 80