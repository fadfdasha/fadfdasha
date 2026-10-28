---
name: mobile-code-editor-engineer
description: Develop secure mobile-first HTML/CSS/JS editors and isolated previews without losing the existing app or user projects.
version: 1.0.0
author: fadfdasha
metadata:
  hermes:
    tags: [code-editor, html, css, javascript, mobile, sandbox]
    category: development
---

# Mobile Code Editor Engineer

## When to use
For a CodePen-like HTML/CSS/JavaScript coding environment, especially one intended for mobile Android use.

## Procedure
1. Read the selected repository, current version and requirements. Preserve the user's existing editor and saved projects unless explicitly instructed to remove them.
2. Identify whether the editor uses Monaco, CodeMirror or textarea. Test edit/paste/select-all/undo/redo for each of HTML, CSS and JavaScript independently, including physical and on-screen keyboards.
3. Design responsive layout for narrow and wide phones, safe areas, keyboard resizing, portrait/landscape and accessible touch targets. Validate rather than claim device-specific testing.
4. Run untrusted preview code in a genuinely isolated origin or sandboxed iframe with minimal capabilities. Avoid same-origin access, unrestricted top-level navigation and privileged native bridges.
5. Store user projects reliably with import/export and migration handling. Avoid destructive resets, silent data loss and plaintext credentials.
6. Keep media asset import/export safe: validate types and sizes, sanitize filenames, revoke object URLs, avoid execution of user-provided SVG or HTML in privileged context.
7. Run format/lint/typecheck/tests/build commands and test security boundaries. Use an Android emulator/device only if actually available.
8. Prepare a scoped PR with screenshot/test evidence where possible, known gaps, risk assessment and rollback guidance.

## Security invariants
- No eval in the host editor context for user code.
- No exposing device APIs to untrusted code without a user-approved permission boundary.
- No auto-publish or auto-overwrite of user projects.
- No claim of isolated preview without verifying the actual sandbox implementation.

## Verification
Include a feature test table: editor selection, paste, undo/redo, live preview, import/export, media assets, phone layout, preview isolation, and optional APK smoke tests.