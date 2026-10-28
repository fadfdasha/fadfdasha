---
name: remotion-video-engineer
description: Improve React/TypeScript/Remotion editors using measured rendering, safe media processing, timeline editing and video-export regression checks.
version: 1.0.0
author: fadfdasha
metadata:
  hermes:
    tags: [remotion, react, typescript, ffmpeg, video-editor]
    category: development
---

# Remotion Video Engineer

## When to use
For modern browser-based video editing, short-form reels, motion graphics, Arabic/RTL infographics, subtitles, timing and export workflows.

## Procedure
1. Inspect the authorized project's exact version, dependencies and existing editor architecture. Continue the current project; do not replace it with a new app or earlier version.
2. Identify timeline state, tracks, media assets, preview renderer, export pipeline and current bug reports. Build a dependency map.
3. Plan changes as independently testable work: media ingestion, trimming/splitting, timeline zoom, drag/drop, undo/redo, compositing, captions, text/RTL and exports.
4. Validate licenses of fonts, stock footage, transitions, effects, music and source repositories before bundling.
5. Integrate Remotion only where suitable: separate preview composition, timeline UI state and rendering pipeline. Use FFmpeg for jobs that require media transcoding or metadata extraction; verify browser/backend capabilities.
6. Avoid loading untrusted user media as executable content. Escape template text and sanitize paths. Handle interrupted rendering and clean up temporary files.
7. Validate project import/export, playback synchronization, audio/video alignment, fps/resolution, subtitles and memory usage. Test a short sample render and compare output dimensions/duration with expected values.
8. Run available lint, TypeScript and test/build commands. Add focused regression tests without skipping existing failing tests.
9. Submit a scoped pull request plus before/after behavior, rendering metrics, feature limitations and rollback plan. Never claim CapCut parity without measured comparisons.

## Safety
- Don't use copyrighted media as test fixtures without authorization.
- Don't write tokens into repo files or browser bundles.
- Ask before modifying published releases or media libraries.

## Definition of done
Reproducible build and render commands, actual verification results, and a recorded limitations matrix.