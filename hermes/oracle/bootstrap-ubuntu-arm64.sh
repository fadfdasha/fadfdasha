#!/usr/bin/env bash
# Run once over SSH on an Oracle Always Free ARM64 Ubuntu VM.
# Does not create OCI resources, open firewall ports, or enroll in paid services.
set -euo pipefail

[[ "$(id -u)" -ne 0 ]] || { echo "Run as the normal ubuntu SSH user, not root" >&2; exit 2; }
command -v sudo >/dev/null || { echo "sudo is required" >&2; exit 2; }
[[ "$(uname -m)" == "aarch64" ]] || { echo "Expected Oracle Ampere ARM64 (aarch64)" >&2; exit 2; }
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || { echo "Only Ubuntu ARM64 is supported" >&2; exit 2; }
[[ "${VERSION_CODENAME:-}" =~ ^[a-z]+$ ]] || { echo "Unexpected Ubuntu codename" >&2; exit 2; }

if command -v docker >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
  echo "Docker Engine and Compose already installed. No changes made."
  exit 0
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git unattended-upgrades
sudo install -m 0755 -d /etc/apt/keyrings
keyfile="$(mktemp)"
trap 'rm -f "$keyfile"' EXIT
curl --fail --silent --show-error --location https://download.docker.com/linux/ubuntu/gpg -o "$keyfile"
fingerprint="$(gpg --show-keys --with-colons "$keyfile" | awk -F: '$1=="fpr" {print $10; exit}')"
if [[ "$fingerprint" != "9DC858229FC7DD38854AE2D88D81803C0EBFCD88" ]]; then
  echo "Docker apt signing key fingerprint verification failed." >&2
  exit 3
fi
sudo install -m 0644 "$keyfile" /etc/apt/keyrings/docker.asc
printf 'deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' "$VERSION_CODENAME" |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version --format '{{.Server.Arch}}'
sudo docker compose version
echo "Docker ready. IMPORTANT: allow SSH only from your own IP in Oracle NSG; do not open port 8642."
