#!/usr/bin/env bash
# Safely clone one user-selected GitHub repository into a local workspace.
# Does not authenticate, change repository permissions, or push code.
set -euo pipefail

usage() {
  echo "Usage: bash termonster/connect_github_repo.sh OWNER/REPO [DESTINATION]" >&2
  exit 2
}

[[ $# -ge 1 && $# -le 2 ]] || usage
repository="$1"
[[ "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || {
  echo "Invalid repository; expected OWNER/REPO." >&2
  exit 2
}

command -v git >/dev/null 2>&1 || {
  echo "Git is missing. Install it from its official distribution." >&2
  exit 1
}
command -v gh >/dev/null 2>&1 || {
  echo "GitHub CLI (gh) is missing. Install it from https://cli.github.com/." >&2
  exit 1
}
if ! gh auth status >/dev/null 2>&1; then
  echo "Not signed in to GitHub CLI. Run gh auth login yourself." >&2
  exit 1
fi
if ! gh repo view "$repository" --json nameWithOwner --jq '.nameWithOwner' >/dev/null; then
  echo "Repository not accessible. Check its name and GitHub permissions." >&2
  exit 1
fi

destination="${2:-${repository#*/}}"
if [[ -e "$destination" ]]; then
  if [[ ! -d "$destination/.git" ]]; then
    echo "Destination exists and is not a Git working copy: $destination" >&2
    exit 1
  fi
  origin="$(git -C "$destination" remote get-url origin 2>/dev/null || true)"
  case "$origin" in
    "https://github.com/$repository"|"https://github.com/$repository.git"|"git@github.com:$repository.git"|"ssh://git@github.com/$repository.git")
      echo "Existing workspace matches selected repository: $destination"
      ;;
    *)
      echo "Existing origin does not match requested repository. No changes made." >&2
      exit 1
      ;;
  esac
else
  gh repo clone "$repository" "$destination"
  echo "Cloned to: $destination"
fi

echo "Review the repository instructions before running or modifying anything."
echo "No push, deployment, billing, or permission change was performed."
