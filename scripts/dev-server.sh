#!/usr/bin/env bash
# Idempotent, persistent dev-server launcher.
#
# `npm run dev` (plain `vite`) is fine for an interactive terminal, but
# whoever/whatever starts it is tied to that shell's lifetime — killing the
# shell, or an agent tearing down after a task, takes the server with it.
# This script instead:
#   1. Reuses an already-running server on PORT if one responds (never
#      spawns a duplicate Vite process).
#   2. Otherwise starts one fully detached (nohup + disown) from the
#      invoking shell/session, so it keeps running after this script exits.
#
# vite.config.ts already sets `server.host = true` and `strictPort = true`,
# so whenever this DOES start a fresh server, it always binds 0.0.0.0:5173
# (reachable through the Codespaces forwarded URL) and never silently
# drifts to a different port.
set -euo pipefail

PORT="${PORT:-5173}"
LOG_FILE="${LOG_FILE:-/tmp/vite-dev-server.log}"
cd "$(dirname "$0")/.."

if curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; then
  echo "Dev server already running and responding on port ${PORT} — reusing it."
  exit 0
fi

echo "No dev server responding on port ${PORT}; starting one (detached)..."
nohup npm run dev >"${LOG_FILE}" 2>&1 &
disown

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; then
    echo "Dev server is up on port ${PORT} (log: ${LOG_FILE})."
    exit 0
  fi
  sleep 0.5
done

echo "Dev server did not respond on port ${PORT} within 15s — check ${LOG_FILE}." >&2
exit 1
