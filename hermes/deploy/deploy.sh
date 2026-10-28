#!/usr/bin/env bash
# Run on the provisioned VPS after first-setup.sh has completed.
# Safe to rerun; keeps the persistent ~/.hermes directory unchanged.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HERMES_DATA_DIR="${HERMES_DATA_DIR:-$HOME/.hermes}"
HERMES_IMAGE="${HERMES_IMAGE:-nousresearch/hermes-agent:stable}"
HERMES_UID="$(id -u)"
HERMES_GID="$(id -g)"
export HERMES_DATA_DIR HERMES_IMAGE HERMES_UID HERMES_GID

case "$HERMES_DATA_DIR" in
  /*) ;;
  *) echo "ERROR: HERMES_DATA_DIR must be absolute." >&2; exit 2 ;;
esac
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed. See https://docs.docker.com/engine/install/" >&2
  exit 2
fi
if ! docker info >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker daemon or Compose plugin is unavailable to this SSH user." >&2
  exit 2
fi
if [[ ! -s "$HERMES_DATA_DIR/.env" || ! -s "$HERMES_DATA_DIR/config.yaml" ]]; then
  echo "ERROR: Hermes setup is incomplete at $HERMES_DATA_DIR." >&2
  echo "Run hermes/deploy/first-setup.sh on your VPS first (interactively)." >&2
  exit 2
fi

# The host user owns the credentials; do not copy them into GitHub Actions.
chmod 700 "$HERMES_DATA_DIR"
docker compose -p hermes-agent -f "$SCRIPT_DIR/compose.yaml" config --quiet
docker compose -p hermes-agent -f "$SCRIPT_DIR/compose.yaml" pull
docker compose -p hermes-agent -f "$SCRIPT_DIR/compose.yaml" up -d --remove-orphans

state="$(docker inspect --format '{{.State.Running}}' hermes-agent-gateway 2>/dev/null || true)"
if [[ "$state" != "true" ]]; then
  echo "ERROR: Hermes container is not running." >&2
  docker compose -p hermes-agent -f "$SCRIPT_DIR/compose.yaml" ps
  exit 1
fi
echo "Container is running (not proof of model/Telegram readiness)."
docker compose -p hermes-agent -f "$SCRIPT_DIR/compose.yaml" ps
echo "Inspect logs on VPS: docker logs --tail 100 hermes-agent-gateway"
