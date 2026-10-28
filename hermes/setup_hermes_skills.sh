#!/usr/bin/env bash
# Set up the account's reusable Hermes skills on a machine where Hermes is installed.
# No secrets or destructive operations are performed.
set -euo pipefail

TAP="fadfdasha/fadfdasha"
SKILLS=(
  github-project-engineer
  android-apk-engineer
  remotion-video-engineer
  mobile-code-editor-engineer
)

if [[ "${1:-}" == "--dry-run" ]]; then
  printf 'hermes skills tap add %s\n' "$TAP"
  for skill in "${SKILLS[@]}"; do
    printf 'hermes skills install %s/%s\n' "$TAP" "$skill"
  done
  exit 0
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes CLI not found. See https://hermes-agent.nousresearch.com/docs/getting-started/installation"
  exit 1
fi

echo "Registering reusable source: $TAP"
if ! hermes skills tap list 2>/dev/null | grep -Fq "$TAP"; then
  hermes skills tap add "$TAP"
fi

for skill in "${SKILLS[@]}"; do
  echo "Reviewing/installing: $skill"
  # Hermes performs its own security review for community GitHub skills.
  if ! hermes skills list 2>/dev/null | grep -Fq "$skill"; then
    hermes skills install "$TAP/$skill"
  else
    echo "Already present: $skill"
  fi
done

echo "Installed skill status:"
hermes skills list
echo "Next: hermes model ; hermes doctor ; hermes chat --oneshot -q 'Describe installed skills'"
