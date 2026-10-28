#!/usr/bin/env bash
# Run once in an interactive SSH shell on the user's VPS.
# This is deliberately NOT a GitHub Action: never send model/Telegram secrets to CI.
set -euo pipefail
HERMES_DATA_DIR="${HERMES_DATA_DIR:-$HOME/.hermes}"
HERMES_IMAGE="${HERMES_IMAGE:-nousresearch/hermes-agent:stable}"
case "$HERMES_DATA_DIR" in
  /*) ;;
  *) echo "ERROR: HERMES_DATA_DIR must be absolute." >&2; exit 2 ;;
esac
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "ERROR: Install and start Docker; grant this user Docker access first." >&2
  exit 2
fi
if [[ ! -t 0 ]]; then
  echo "ERROR: First-time credential setup requires a real interactive SSH terminal." >&2
  exit 2
fi

mkdir -p "$HERMES_DATA_DIR"
chmod 700 "$HERMES_DATA_DIR"
echo "Starting official Hermes setup. Credentials stay on this VPS."
docker run --rm -it \
  -v "$HERMES_DATA_DIR:/opt/data" \
  -e "HERMES_UID=$(id -u)" -e "HERMES_GID=$(id -g)" \
  "$HERMES_IMAGE" setup

if [[ ! -s "$HERMES_DATA_DIR/.env" || ! -s "$HERMES_DATA_DIR/config.yaml" ]]; then
  echo "ERROR: Hermes did not create expected configuration files." >&2
  exit 1
fi
chmod 600 "$HERMES_DATA_DIR/.env"
echo "Hermes configured. Installing account-wide GitHub skills in the data volume."

# Community skills are third-party code/knowledge. Review any interactive scanner prompts.
tap="fadfdasha/fadfdasha"
docker run --rm -it -v "$HERMES_DATA_DIR:/opt/data" \
  -e "HERMES_UID=$(id -u)" -e "HERMES_GID=$(id -g)" \
  "$HERMES_IMAGE" skills tap add "$tap"
for skill in github-project-engineer android-apk-engineer remotion-video-engineer mobile-code-editor-engineer; do
  docker run --rm -it -v "$HERMES_DATA_DIR:/opt/data" \
    -e "HERMES_UID=$(id -u)" -e "HERMES_GID=$(id -g)" \
    "$HERMES_IMAGE" skills install "$tap/$skill"
done

echo "Initial setup complete. Deploy with: bash ~/hermes-agent-deployment/deploy.sh"
