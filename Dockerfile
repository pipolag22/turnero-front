# ---- Etapa 1: Construcción (El Motor) ----
FROM node:20-alpine AS build
WORKDIR /app

# Define los argumentos que se pueden pasar desde afuera
ARG VITE_API_URL
ARG VITE_WS_URL

# Hace que esos argumentos estén disponibles para el resto de los comandos
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: Servidor (El Auto Completo) ----
FROM nginx:alpine

# Copia los archivos construidos de la etapa anterior al servidor Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la configuración de Nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]