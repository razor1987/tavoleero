# Tavoleero on Render — Bun standalone.
# The action bundle and client are prebuilt by sync.sh; only the tiny
# drizzle-orm driver is installed here (the @hatch/space-sdk file: dependency
# of the dev workspace is not needed at runtime).
FROM oven/bun:1.3
WORKDIR /app
COPY package.json ./
RUN bun install
COPY standalone.ts ./
COPY db.ts ./
COPY mp.ts ./
COPY seo/ ./seo/
COPY vendor/ ./vendor/
COPY migrations/ ./migrations/
COPY migrations-pg/ ./migrations-pg/
COPY public/ ./public/
ENV PORT=3000
EXPOSE 3000
# Il DB è Postgres (Supabase) quando DATABASE_URL è impostata, altrimenti
# SQLite locale (effimero su Render free). DB_PATH resta per lo sviluppo locale.
CMD ["bun", "./standalone.ts"]
