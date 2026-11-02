#!/usr/bin/env bash
# GitHub Codespaces dotfiles bootstrap — Spec Kit
# Official project: https://github.com/github/spec-kit
# Release pinned for reproducible installation.
set -Eeuo pipefail

SPEC_KIT_TAG="v1.2.6"
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

echo "[Spec Kit] Setting up ${SPEC_KIT_TAG} for this Codespace..."

if ! command -v git >/dev/null 2>&1; then
  echo "[Spec Kit] Git is required. Installation skipped." >&2
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "[Spec Kit] Neither uv nor curl is available. Install uv manually." >&2
    exit 1
  fi
  echo "[Spec Kit] Installing uv using its official Astral installer..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "[Spec Kit] uv was not found after installation." >&2
  exit 1
fi

# Python 3.11 is supported and can be fetched by uv if absent.
uv tool install --force --python 3.11 specify-cli \
  --from "git+https://github.com/github/spec-kit.git@${SPEC_KIT_TAG}"

if ! command -v specify >/dev/null 2>&1; then
  echo "[Spec Kit] Install completed, but specify is not on PATH." >&2
  echo "Add $HOME/.local/bin to your PATH and run: specify version" >&2
  exit 1
fi

echo "[Spec Kit] Installed:"
specify version
echo "[Spec Kit] Ready in every new Codespace that uses these dotfiles."
echo "[Spec Kit] To configure a project, run specify init in that project's directory."
