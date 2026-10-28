---
name: arabic-captions-pro
description: Create accurate and readable Arabic or bilingual captions for Reels and Shorts; use for Arabic transcription review, timed subtitles, right-to-left text and animated caption overlays.
---

# Arabic Captions Pro

1. Extract audio from the original with a non-destructive FFmpeg command. Keep source timestamps correct.
2. Use a local transcription tool such as whisper.cpp only if installed and supported; record tool/model/language confidence and manually review names, numbers, dialect, negation and Qur'anic/religious quotations rather than fabricating a transcript.
3. Align captions to real spoken phrases or words; avoid long, dense on-screen blocks. Verify start/end timestamps and avoid overlaps. For multilingual material, keep language/direction per segment.
4. Pay special attention to RTL shaping and mixed Arabic/English/numbers; do not assume every video renderer handles bidirectional text correctly. Visually inspect rendered frames on a phone-sized preview.
5. Ensure captions have strong contrast, safe margins clear of Instagram/TikTok UI, and readable font size. Avoid distracting word-highlighting when it harms legibility.
6. Produce editable SRT/VTT plus a styled render plan. Burn in captions only if requested; retain sidecar files for revisions.
7. Run explicit QA checks for missing segments, excessive speed, clipped glyphs and text obscuring faces or key visuals.

Use local, cost-free tools only: whisper.cpp (MIT), FFmpeg/FFprobe (LGPL/GPL depending on build), Motion Canvas (MIT) or HyperFrames (Apache-2.0) for styled overlays if available. Do not send media to paid transcription APIs or claim accurate transcription without reviewing the source.
