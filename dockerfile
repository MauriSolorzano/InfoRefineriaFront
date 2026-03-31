FROM nginx:alpine

# Copiamos tus archivos de la web
COPY . /usr/share/nginx/html

# Copiamos nuestra configuración personalizada de arriba
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]