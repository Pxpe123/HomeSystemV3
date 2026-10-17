# Production UI image. Nginx serves the touch-first SPA and proxies realtime
# traffic, so displays only need one public address: http://<host>:8088.
FROM node:22-alpine AS build
WORKDIR /workspace/apps/web-ui
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG HOMESYSTEM_BUILD_VERSION
ARG HOMESYSTEM_BUILD_ID
ARG HOMESYSTEM_BUILD_COMMIT
ARG HOMESYSTEM_BUILD_TIME_UTC
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/Deployments/web-ui /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
