FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Facultatif : préremplit le mot de passe des comptes de démonstration sur la page de connexion
ARG VITE_MDP_DEMO=
ENV VITE_MDP_DEMO=$VITE_MDP_DEMO
RUN npm run build

FROM nginx:1.27-alpine
# nginx remplace ${PORT}, ${BACKEND_URL} et ${ASSISTANT_URL} dans ce modèle au démarrage
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV PORT=80 BACKEND_URL=http://backend:8080 ASSISTANT_URL=http://assistant:8090
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
