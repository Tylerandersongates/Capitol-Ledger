#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERCEL_VERSION="${CAPITOL_LEDGER_VERCEL_VERSION:-54.14.1}"
VERCEL_CLI_DIR="${CAPITOL_LEDGER_VERCEL_CLI_DIR:-/private/tmp/capitol-ledger-vercel-cli}"
NODE_BIN="${CAPITOL_LEDGER_NODE_BIN:-$ROOT_DIR/.tools/node-v22.22.3-darwin-arm64/bin/node}"
PNPM_BIN="${CAPITOL_LEDGER_PNPM_BIN:-$ROOT_DIR/.tools/pnpm-v11/bin/pnpm.mjs}"

if [ ! -x "$NODE_BIN" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  else
    echo "Node was not found. Expected $NODE_BIN or a node binary on PATH." >&2
    exit 1
  fi
fi

PNPM_CMD=()
if [ -f "$PNPM_BIN" ]; then
  PNPM_CMD=("$NODE_BIN" "$PNPM_BIN")
elif command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=("$(command -v pnpm)")
else
  echo "pnpm was not found. Expected $PNPM_BIN or a pnpm binary on PATH." >&2
  exit 1
fi

NODE_DIR="$(dirname "$NODE_BIN")"
VERCEL_BIN="$VERCEL_CLI_DIR/node_modules/.bin/vercel"

installed_version=""
if [ -x "$VERCEL_BIN" ]; then
  installed_version="$(PATH="$NODE_DIR:$PATH" "$VERCEL_BIN" --version 2>/dev/null | sed -nE 's/^Vercel CLI ([0-9]+[.][0-9]+[.][0-9]+).*$/\1/p; s/^([0-9]+[.][0-9]+[.][0-9]+).*$/\1/p' | head -n 1 || true)"
fi

if [ "$installed_version" != "$VERCEL_VERSION" ]; then
  mkdir -p "$VERCEL_CLI_DIR"
  if [ ! -f "$VERCEL_CLI_DIR/package.json" ]; then
    cat > "$VERCEL_CLI_DIR/package.json" <<'JSON'
{
  "private": true,
  "dependencies": {}
}
JSON
  fi

  (
    cd "$VERCEL_CLI_DIR"
    CI=true PATH="$NODE_DIR:$PATH" "${PNPM_CMD[@]}" add "vercel@$VERCEL_VERSION" --allow-build=esbuild
  )
fi

exec env CI="${CI:-true}" PATH="$NODE_DIR:$PATH" "$VERCEL_BIN" "$@"
