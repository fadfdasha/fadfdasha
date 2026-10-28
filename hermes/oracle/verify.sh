#!/usr/bin/env bash
# Reports only non-secret information. Does not send messages or modify the agent.
set -euo pipefail
echo "Host architecture: $(uname -m)"
[[ "$(uname -m)" == "aarch64" ]] || { echo "ERROR: not ARM64" >&2; exit 2; }
echo "CPU cores: $(nproc)"
free -h | sed -n '1,2p'
echo "Root disk:"
df -h / | tail -1
echo "Docker architecture:"
sudo docker info --format '{{.Architecture}}'
state="$(sudo docker inspect --format '{{.State.Running}}' hermes-oracle-gateway 2>/dev/null || true)"
echo "Hermes container running: $state"
[[ "$state" == "true" ]] || exit 1
image="$(sudo docker inspect --format '{{.Config.Image}}' hermes-oracle-gateway)"
echo "Hermes image: $image"
net="$(sudo docker inspect --format '{{json .HostConfig.PortBindings}}' hermes-oracle-gateway)"
echo "Published container ports: $net"
[[ "$net" == "null" || "$net" == "{}" ]] || { echo "ERROR: public ports exposed" >&2; exit 1; }
echo "Container restart policy:"
sudo docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' hermes-oracle-gateway
echo "For credential-safe gateway checks, inspect logs privately on your VM."
echo "Next: send an authorized test message to your Telegram bot; check model response."
