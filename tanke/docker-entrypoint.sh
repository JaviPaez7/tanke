#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  # Directo al binario local: npx podria intentar descargar y el usuario node
  # no tiene cache de npm escribible.
  node_modules/.bin/prisma migrate deploy
fi
exec node server.js
