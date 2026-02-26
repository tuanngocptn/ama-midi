FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends bash curl python3 make g++ && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8787

ENTRYPOINT ["/entrypoint.sh"]
