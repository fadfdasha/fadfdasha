#!/usr/bin/env python3
"""Minimal dependency-free preflight for a public Hermes SKILL.md collection.

This is a structural check, not a full YAML parser or security audit.
Hermes performs an additional community-skill security scan at install time.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
REQUIRED = {"name", "description", "version"}
SLUG = re.compile(r"^[a-z][a-z0-9-]*$")
SUSPECT_SECRETS = (
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"sk-[A-Za-z0-9_-]{24,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)


def validate(file: Path) -> list[str]:
    errors: list[str] = []
    text = file.read_text(encoding="utf-8")
    lines = text.splitlines()
    if len(lines) < 5 or lines[0].strip() != "---":
        return [f"{file}: frontmatter is missing"]

    try:
        end = lines.index("---", 1)
    except ValueError:
        return [f"{file}: no closing frontmatter delimiter"]

    fields: dict[str, str] = {}
    for line in lines[1:end]:
        match = re.match(r"^([a-z][a-z0-9_-]*):\s*(.+)\s*$", line)
        if match:
            fields[match.group(1)] = match.group(2).strip()
    for key in REQUIRED:
        if not fields.get(key):
            errors.append(f"{file}: missing {key}")

    name = fields.get("name", "")
    if name and not SLUG.fullmatch(name):
        errors.append(f"{file}: invalid name {name!r}")
    if name and name != file.parent.name:
        errors.append(f"{file}: name differs from folder {name!r}")
    if not any(line.startswith("# ") for line in lines[end + 1 :]):
        errors.append(f"{file}: missing heading")
    for pattern in SUSPECT_SECRETS:
        if pattern.search(text):
            errors.append(f"{file}: possible hard-coded credential detected")
            break
    return errors


def main() -> int:
    files = sorted(SKILLS.glob("*/SKILL.md"))
    if not files:
        print("No skills found.", file=sys.stderr)
        return 1
    errors: list[str] = []
    for file in files:
        errors.extend(validate(file))
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(files)} Hermes skills: " + ", ".join(p.parent.name for p in files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
