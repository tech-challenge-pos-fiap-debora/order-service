# =========================
# Development
# =========================
FROM node:22-bookworm AS development

WORKDIR /order

ENV NODE_ENV=development

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn", "start:dev"]


# =========================
# Build
# =========================
FROM node:22-bookworm AS build

WORKDIR /usr/src/order

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build


# =========================
# Production dependencies
# =========================
FROM build AS prod-deps

ENV NODE_ENV=production

RUN yarn install --frozen-lockfile --production


# =========================
# Seed (K8s Job) — catálogo demo no MongoDB
# =========================
FROM prod-deps AS seed

WORKDIR /usr/src/order

CMD ["node", "scripts/seed-mongo.mjs"]


# =========================
# Production
# =========================
FROM node:22-bookworm-slim AS production

WORKDIR /usr/src/order

ENV NODE_ENV=production

COPY --chown=node:node package.json yarn.lock newrelic.js ./

COPY --chown=node:node --from=prod-deps /usr/src/order/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/order/dist ./dist

USER node

EXPOSE 3000

# O agente precisa ser carregado antes da aplicação para instrumentar http.
CMD ["node", "-r", "newrelic", "dist/main.js"]
