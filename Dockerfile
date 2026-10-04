# Tavoleero on Render — Bun standalone.
# The action bundle and client are prebuilt by sync.sh; only the tiny
# drizzle-orm driver is installed here (the @hatch/space-sdk file: dependency
# of the dev workspace is not needed at runtime).
FROM oven/bun:1.3
WORKDIR /app
COPY package.json ./
RUN bun install
COPY standalone.ts ./
COPY seo/ ./seo/
COPY vendor/ ./vendor/
COPY migrations/ ./migrations/
COPY public/ ./public/
ENV PORT=3000
EXPOSE 3000
# Render mounts no disk on the free plan: the DB lives in the container and
# is ephemeral (see README). DB_PATH can point at a persistent disk instead.
CMD ["bun", "./standalone.ts"]
