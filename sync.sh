#!/bin/bash
# Sync the current Tavoleero (party-hub) artifact source into this deploy repo
# and rebuild everything. Run from this directory.
set -euo pipefail

SRC="$HOME/workspace/ts-spaces/party-hub"
DST="$(cd "$(dirname "$0")" && pwd)"

echo "== building server actions =="
cd "$SRC"
# NOTE: the client bundle (client/dist) is built only by the artifact builder
# via artifact.edit (manual builds are blocked by the SDK); dist is always
# current after an edit, so we ship it as-is.
bun run build:server
# The privileged email handlers (server/src/privileged.ts) are bundled
# separately: the standalone server routes ctx.executePrivileged() to them.
cd "$SRC/server" && bun build ./src/privileged.ts --target=bun --outfile=./dist/privileged.js && cd "$SRC"

echo "== syncing files =="
mkdir -p "$DST/vendor" "$DST/migrations" "$DST/public"
cp "$SRC/server/dist/actions.js" "$DST/vendor/actions.js"
cp "$SRC/server/dist/privileged.js" "$DST/vendor/privileged.js"
# NOTE: package.json here is the minimal standalone one (drizzle-orm only),
# maintained by hand — never overwritten from the artifact source.
rm -rf "$DST/migrations"
mkdir -p "$DST/migrations"
cp "$SRC"/drizzle/0*.sql "$DST/migrations/"
rm -rf "$DST/public"
mkdir -p "$DST/public"
cp -r "$SRC/client/dist/." "$DST/public/"

echo "== done =="
ls "$DST/vendor" "$DST/migrations" | head -20
du -sh "$DST"
