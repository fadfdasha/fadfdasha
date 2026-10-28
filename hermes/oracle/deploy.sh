#!/usr/bin/env bash
# Run on the provisioned Oracle ARM64 VM AFTER interactive setup.
set -euo pipefail
[[ "$(uname -m)" == "aarch64" ]] || { echo "Oracle ARM64 host required" >&2; exit 2; }
HERMES_DATA_DIR="${HERMES_DATA_DIR:-$HOME/.hermes}"
HERMES_IMAGE="${HERMES_IMAGE:-nousresearch/hermes-agent:stable}"
HERMES_UID="$(id -u)"
HERMES_GID="$(id -g)"
export HERMES_DATA_DIR HERMES_IMAGE HERMES_UID HERMES_GID

[[ "$HERMES_DATA_DIR" == /* ]] || { echo "HERMES_DATA_DIR must be an absolute path" >&2; exit 2; }
[[ -s "$HERMES_DATA_DIR/.env" && -s "$HERMES_DATA_DIR/config.yaml" ]] ||
  { echo "Hermes is not configured. Run setup-hermes.sh interactively." >&2; exit 2; }
if grep -Eiq '^[[:space:]]*TELEGRAM_ALLOW_ALL_USERS[[:space:]]*=[[:space:]]*(true|yes|1)[[:space:]]*$' "$HERMES_DATA_DIR/.env"; then
  echo "Unsafe Telegram allow-all detected. Refusing to deploy." >&2; exit 2
fi
chmod 700 "$HERMES_DATA_DIR"
chmod 600 "$HERMES_DATA_DIR/.env"
DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
sudo --preserve-env=HERMES_DATA_DIR,HERMES_IMAGE,HERMES_UID,HERMES_GID \
  docker compose -p hermes-oracle -f "$DIR/compose.yaml" config --quiet
sudo --preserve-env=HERMES_DATA_DIR,HERMES_IMAGE,HERMES_UID,HERMES_GID \
  docker compose -p hermes-oracle -f "$DIR/compose.yaml" pull
sudo --preserve-env=HERMES_DATA_DIR,HERMES_IMAGE,HERMES_UID,HERMES_GID \
  docker compose -p hermes-oracle -f "$DIR/compose.yaml" up -d --remove-orphans
[[ "$(sudo docker inspect --format '{{.State.Running}}' hermes-oracle-gateway)" == "true" ]] ||
  { echo "Container not running; check sudo docker logs hermes-oracle-gateway" >&2; exit 1; }
echo "Container started. This does not yet confirm model or Telegram access."
echo "Next: bash hermes/oracle/verify.sh"
