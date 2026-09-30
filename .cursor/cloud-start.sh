#!/usr/bin/env bash
# Start the Stencil storefront on port 3000.
# Uses gitignored config.stencil.json and secrets.stencil.json, or copies them
# from ~/.config/coral when a snapshot kept that config outside the checkout.
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm is required to run Node.js 24 for Stencil CLI." >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24
export PATH="${NVM_BIN}:$PATH"
hash -r

cd "$(dirname "$0")/.."

# Stencil credentials live in gitignored config.stencil.json and secrets.stencil.json.
# A copy outside the repo survives checkout on a snapshotted environment.
CONFIG_HOME="${HOME}/.config/coral"
mkdir -p "$CONFIG_HOME"
if [[ -f config.stencil.json && -f secrets.stencil.json ]]; then
  cp config.stencil.json secrets.stencil.json "$CONFIG_HOME/"
elif [[ -f "$CONFIG_HOME/config.stencil.json" && -f "$CONFIG_HOME/secrets.stencil.json" ]]; then
  cp "$CONFIG_HOME/config.stencil.json" "$CONFIG_HOME/secrets.stencil.json" .
elif [[ -n "${STENCIL_STORE_URL:-}" && -n "${STENCIL_ACCESS_TOKEN:-}" ]]; then
  stencil init \
    --url "$STENCIL_STORE_URL" \
    --token "$STENCIL_ACCESS_TOKEN" \
    --port 3000 \
    --packageManager npm \
    --skipInstall
  cp config.stencil.json secrets.stencil.json "$CONFIG_HOME/"
else
  echo "Missing config.stencil.json and secrets.stencil.json." >&2
  exit 1
fi

exec stencil start
