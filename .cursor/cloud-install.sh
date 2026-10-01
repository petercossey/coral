#!/usr/bin/env bash
# Idempotent Cloud Agent install for Coral.
# Stencil CLI 10 requires Node.js 24. Cloud Agent shells put /exec-daemon/node
# (Node 22) ahead of nvm, so this script selects Node 24 explicitly.
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm is required to install Node.js 24 for Stencil CLI." >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 24
nvm alias default 24
nvm use 24
export PATH="${NVM_BIN}:$PATH"
hash -r

node -v
npm -v

cd "$(dirname "$0")/.."
npm ci
npm install -g @bigcommerce/stencil-cli
npm run build
stencil --version
