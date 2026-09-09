# Synthetic media fixtures

These files contain only generated colors and tones, never family content.
They exercise Workers-compatible actual-byte inspection and duration limits.

Generated with FFmpeg lavfi:
- note.png: one 80 × 60 coral frame.
- voice.webm: one second of a 440 Hz tone, Opus.
- video.mp4: one second of blue 80 × 60 video, H.264.
- too-long.mp4: 121 seconds of blue 16 × 16 video at 1 fps.
- too-long.webm: 301 seconds of mono silence, Opus.

The last two must be rejected by the Messages upload validator.
