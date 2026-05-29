# Voice Assistant — capabilities, limits, and the path forward

_Last updated: 2026-05-29_

## TL;DR

The browser-based voice assistant **cannot do wake-word / always-listening on
iPad**, and on iOS/iPadOS it can't do speech recognition at all. This is a hard
platform limitation, not a bug in our code. We've decided to **document the
limitation and defer** the bigger investment; the in-app mic now shows a
friendly "not available on this device" message instead of silently failing.

## Why browser voice doesn't work on iPad

The assistant uses the **Web Speech API**:

- `SpeechRecognition` (speech-to-text) — for the wake phrase and commands
- `speechSynthesis` (text-to-speech) — for spoken replies

Two independent walls block the iPad experience:

1. **No `SpeechRecognition` on iOS/iPadOS.** WebKit (which *every* iOS browser
   is built on, including "Chrome" and "Edge" for iOS) does not implement the
   `SpeechRecognition` / `webkitSpeechRecognition` interface. Our provider
   detection (`getSpeechRecognitionCtor()` in
   `src/lib/voice-providers/web-speech-provider.ts`) returns `null`, so the
   session reports `isSupported = false` and falls back to the unsupported-device
   button. So even **tap-to-talk** recognition is unavailable on iPad — not just
   wake word.

2. **Browsers can't listen in the background.** A wake word ("Hey Family")
   requires a continuously-open microphone. Browser tabs can't hold the mic open
   in the background, can't run when the screen locks or the tab is
   backgrounded, and re-prompt for mic permission in ways that break a
   hands-free experience. This is true even on desktop Chrome, where wake word
   only works while the tab is focused and foregrounded.

### Where it *does* work today

- **Desktop Chrome / Edge (Chromium):** full experience — wake word (tab must be
  focused), tap-to-talk, and spoken replies.
- Other desktop browsers vary; Firefox has no `SpeechRecognition`.

## Options considered

| Option | Wake word? | Works on iPad? | Effort | Notes |
| --- | --- | --- | --- | --- |
| **A. Native iOS app** | ✅ Yes | ✅ Yes | High | On-device `SFSpeechRecognizer` + `AVSpeechSynthesizer`; can keep listening while foregrounded. Talks to the existing Next.js API (`/api/ai/chat`). Separate project/repo. |
| **B. Server-side STT (interim)** | ❌ No | ✅ Tap-to-talk | Medium | Record mic audio with `MediaRecorder` (works on iOS) → POST to a transcription endpoint (e.g. local Whisper via the LM stack) → feed text to `/api/ai/chat`. Provider-agnostic, no wake word. |
| **C. Document & defer (chosen)** | ❌ No | ❌ (graceful msg) | Low | Keep voice working on desktop Chrome; show clear messaging elsewhere; revisit later. |

> Note: even a true "wake word everywhere" goal on iPad is only reliably solvable
> by a native app — and even native apps can't wake from a fully-killed state the
> way Siri can (that requires a system-level always-on assistant). A native app
> *can* listen continuously while open/foregrounded, which is the realistic bar.

## Decision (2026-05-29)

**Chose Option C — document & defer.** Implemented:

- The floating mic shows a `mic_off` icon and, on tap, a friendly toast
  ("Voice chat isn't available on this device yet") instead of a dead button.
  See `src/components/VoiceAssistant.tsx` (the `effectiveMode === 'text'` branch).

When we're ready to invest, **Option A (native iOS app)** is the recommended
direction for real hands-free use on iPad. **Option B** is a good interim if we
want *some* working voice on iPad sooner without committing to a native app.

## If/when we build the native app (Option A) — sketch

- SwiftUI shell; on-device `SFSpeechRecognizer` for STT, `AVSpeechSynthesizer`
  (or ElevenLabs) for TTS.
- Reuse the existing backend: POST transcribed text to `/api/ai/chat` with the
  same `kidContext` payload the web `VoiceAssistant` sends today; the AI tools
  (`completeChore`, `addSavingsGoal`) already live server-side.
- Continuous recognition while the app is foregrounded approximates wake word.
- Keep the web app's text/desktop-voice experience as-is.
