---
name: video-export-qa
description: Validate and deliver professional MP4 video exports for Instagram Reels, TikTok and YouTube Shorts; use for FFmpeg encoding, quality control, A/V synchronization, audible clarity and mobile preview checks.
---

# Video Export & QA

1. Identify target platform and source constraints. Default recommendation for typical vertical social video: 1080x1920, square pixels, H.264 in MP4, AAC audio and a constant target frame rate (often 30 fps) when no conflicting source/editor constraint exists. These are starting parameters, not rigid platform guarantees.
2. Preserve the audio/video timebase and verify duration, frame rate, dimensions, pixel aspect ratio, codec profiles and file size using ffprobe.
3. Confirm no accidental black frames, broken transitions, over-cropped faces, out-of-safe-area captions, clipping, missing audio or muted sections.
4. Assess speech audibility and avoid clipping; measure integrated loudness and peaks with an appropriate tool. Do not apply arbitrary normalization without listening.
5. Open the final output and inspect start, middle, ending, captions and audio on a phone-sized preview, where possible. Compare a handful of representative points with the approved storyboard.
6. Report source file, output path, technical specs, checks actually run, any known skipped checks and risks. Never claim successful testing or rendering without executing it.

Never execute shell commands or install any renderer just because this instruction file mentions them; follow the active environment's security and execution policies.
