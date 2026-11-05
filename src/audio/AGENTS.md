# src/audio/ — audio and voice lines

Sound effects, music, announcer and Mason's own voice lines.
The root `AGENTS.md` (rules, stack, map) applies too. Keep this file up to date when you change what it describes.

## Voice lines
Files: `src/data/voiceLines.js` (the list), `src/audio/voiceLines.js` (`voiceLine(scene, fighterId, event)`), files `public/assets/audio/voice/custom/`

Mason's own lines, made in the VOICE STUDIO artifact (source `tools/audio/voice_studio.html`: drop a recording, 28-band vocoder robot voice snapped to a key, SEND TO GAME -> artifact db collection `lines` {name, fighter, event, asset, seconds, preset, created} + a JSON asset {format: 'wav-base64', data}). "Add my voice lines" = ArtifactData list `lines`, Artifact read each `asset` id into a folder as `<id>.json`, then `python3 tools/audio/import_voice_lines.py rows.json folder` (rewrites the list, ogg+mp3). Recording: claude.ai pages can't use a microphone, so the same page is also served from the game site at `/voice-studio/` (`public/voice-studio/index.html` = `voice_studio.html` wrapped in a document - re-copy it after editing); there `HOSTED` is true: RECORD works and SAVE FOR THE GAME downloads `<fighter>__<event>__<name>.wav`; when Mason attaches those, `python3 tools/audio/import_voice_lines.py --wav FILES` adds them. The artifact copy's RECORD MY VOICE button links there. Events: pick (select screen, replaces the announcer) / taunt / limit / ko (gets KO'd) / win (results screen).
