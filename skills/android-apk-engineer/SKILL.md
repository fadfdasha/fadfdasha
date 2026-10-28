---
name: android-apk-engineer
description: Turn a user-authorized Android or web-to-Android project into a verified debug APK with reproducible build checks and safe testing.
version: 1.0.0
author: fadfdasha
metadata:
  hermes:
    tags: [android, apk, gradle, capacitor, quality-assurance]
    category: development
---

# Android APK Engineer

## When to use
When building, repairing or testing an Android application or converting an existing web application to a real Android package.

## Procedure
1. Confirm repository, source revision, desired package/application ID and whether a native Android project already exists. Never replace an existing application with a new scaffold without authorization.
2. Detect the actual stack (Gradle/Kotlin/Java, Capacitor, React Native, Flutter, or web only). Document versions and support constraints before making changes.
3. Determine the appropriate packaging path. For a web-only app, explicitly state the limits of a WebView/Capacitor wrapper versus genuine Android APIs.
4. Preserve app data, assets and functionality. Validate safe file handling, WebView navigation policy, network access and Android permissions; minimize permissions.
5. Run dependency installation and formatting/lint/typecheck/unit tests when supported by the project. Check the SDK and Gradle compatibility. Do not suppress failing checks merely to produce an APK.
6. Build a DEBUG artifact using project-supported Gradle tooling such as ./gradlew assembleDebug, or the framework's documented equivalent. A debug APK is NOT a release-signed production app.
7. Find the actual output APK; record full path, size and SHA-256, and verify package metadata if Android build-tools are installed.
8. Run emulator/device smoke tests only when one is actually accessible; check install, launch, rotation, permissions, offline behavior, media import/export, keyboard/selection, and crashes. Report missing test hardware honestly.
9. Create a branch and PR with changed files, build log summary, artifact path, known defects and reproducible commands. Ask before signing, publishing or merging.

## Important
- Never commit keystores, signing passwords, API keys, Play Console credentials or personal files.
- Do not upload private APKs or project content to third-party services unless authorized.
- Never claim an APK is installable based solely on a successful web build.
- If Android SDK or emulator is missing, record the blocker; do not invent test results.

## Acceptance checklist
The exact source revision, build command, build result, APK hash, tested Android target and tested/not-tested feature matrix are included in the final report.