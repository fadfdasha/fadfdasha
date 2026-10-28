---
name: local-silence-cut
description: Remove long silences, assemble shorts, and prepare reversible cut lists for short-form videos using only free local processing tools.
---

# Local Silence Cut — free and reversible

1. Inspect input media streams and duration with ffprobe. Do not change the source file.
2. Detect silence with Auto-Editor (Unlicense) if installed or FFmpeg silencedetect. Use conservative thresholds and never remove meaningful pauses, breaths, or sentence context blindly.
3. Present a reversible edit-decision list with source timestamps and confidence; protect the intro, closing, music and transitions. For interviews, preserve coherent questions and answers.
4. Apply cuts with a local open-source encoder/editor and export a draft, not an overwrite of the source.
5. Check audio sync, hard cuts and captions against the draft. Record actual commands and tests performed.
6. Never use a paid speech API, subscription service, or upload footage without explicit user instruction. If not installed, supply setup steps and an executable plan rather than pretending output exists.

Tooling: https://github.com/WyattBlue/auto-editor (Unlicense) and https://github.com/FFmpeg/FFmpeg (LGPL/GPL build-dependent).
