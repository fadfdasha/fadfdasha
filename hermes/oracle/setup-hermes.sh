#!/usr/bin/env bash
# First-time Hermes wizard; model, Telegram, and GitHub tokens must never go into CI.
set -euo pipefail
[[ -t 0 && -t 1 ]] || { echo "Use a real interactive SSH terminal (not GitHub Actions)." >&2; exit 2; }
[[ "$(uname -m)" == "aarch64" ]] || { echo "This setup requires the Oracle ARM64 VM" >&2; exit 2; }
command -v docker >/dev/null 2>&1 || { echo "Install Docker with bootstrap-ubuntu-arm64.sh first" >&2; exit 2; }

HERMES_DATA_DIR="${HERMES_DATA_DIR:-$HOME/.hermes}"
HERMES_IMAGE="${HERMES_IMAGE:-nousresearch/hermes-agent:stable}"
[[ "$HERMES_DATA_DIR" == /* ]] || { echo "HERMES_DATA_DIR must be absolute" >&2; exit 2; }
mkdir -p "$HERMES_DATA_DIR"
chmod 700 "$HERMES_DATA_DIR"

echo "Pulling official Hermes ARM64 image..."
sudo docker pull --platform linux/arm64 "$HERMES_IMAGE"
arch="$(sudo docker image inspect --format '{{.Architecture}}' "$HERMES_IMAGE")"
[[ "$arch" == "arm64" ]] || { echo "Downloaded image is not ARM64: $arch" >&2; exit 3; }

docker_hermes() {
  sudo docker run --platform linux/arm64 --rm -it \
    -v "$HERMES_DATA_DIR:/opt/data" \
    -e "HERMES_UID=$(id -u)" \
    -e "HERMES_GID=$(id -g)" \
    "$HERMES_IMAGE" "$@"
}

echo "Start interactive setup. Configure your model credentials and Telegram allowed users privately."
docker_hermes setup

[[ -s "$HERMES_DATA_DIR/.env" && -s "$HERMES_DATA_DIR/config.yaml" ]] ||
  { echo "Configuration incomplete; rerun setup." >&2; exit 4; }
chmod 600 "$HERMES_DATA_DIR/.env"
if grep -Eiq '^[[:space:]]*TELEGRAM_ALLOW_ALL_USERS[[:space:]]*=[[:space:]]*(true|yes|1)[[:space:]]*$' "$HERMES_DATA_DIR/.env"; then
  echo "Disable TELEGRAM_ALLOW_ALL_USERS in the private .env before deploying." >&2
  exit 4
fi

echo "Installing account-wide skills (review community security warnings)."
docker_hermes skills tap add fadfdasha/fadfdasha
for skill in github-project-engineer android-apk-engineer remotion-video-engineer mobile-code-editor-engineer; do
  docker_hermes skills install "fadfdasha/fadfdasha/$skill"
done
docker_hermes skills list
echo "Configuration saved locally at $HERMES_DATA_DIR; not uploaded to GitHub."
echo "Next: bash hermes/oracle/deploy.sh"
