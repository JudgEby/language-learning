# Production image for the Language Learning SPA.
# Build context is the repository root: the Vite `content-sync-build` plugin
# bakes `content/` into the bundle at build time, so both `app/` and
# `content/` must be visible inside the builder (as `CONTEN_SRC=../content`).
#
# Build:  docker build -f app/Dockerfile -t language-learning .
# Run:    docker run --rm -p 8080:80 language-learning

# ---- Builder: npm deps + static bundle (dist/) ----
FROM node:20-alpine AS builder

WORKDIR /src
COPY app/package.json app/package-lock.json ./app/
WORKDIR /src/app
RUN npm ci

WORKDIR /src
COPY app ./app
COPY content ./content

WORKDIR /src/app
RUN npm run build

# ---- Runtime: static files over nginx with SPA fallback ----
FROM nginx:alpine

COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/app/dist/ /usr/share/nginx/html/

EXPOSE 80
