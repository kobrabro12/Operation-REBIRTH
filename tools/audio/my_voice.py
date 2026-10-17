"""Use your own recordings as the announcer.
Run:  python3 tools/audio/my_voice.py <folder with your recordings> [--arena] [--pixel]
Needs ffmpeg.

Name each recording after the line it replaces (any format ffmpeg can read: .wav .mp3 .m4a .ogg .webm ...):
  fighters:  soul-summoner   mr-wake   hero-knight   random
  stages:    sky-sanctum   verdant-spires   gravemoon-bridge   neon-arcade   elderwood-hollow
  other:     unlock   (played on the results screen when a new costume unlocks)
e.g. "soul-summoner.m4a" saying "Soul Summoner!". You don't need all of them: any line you haven't
recorded keeps the computer voice from tools/audio/announcer.py.

Each recording is cleaned up the same way: silence trimmed from both ends, rumble cut, compressed so
every word comes through evenly, and made loud and even with the other lines. With --arena it also gets
the stadium treatment the computer voice has (a little deeper, bass lifted, arena echo). With --pixel it's
made a bit retro: bit-crushed and sample-rate-reduced like an old console's voice chip, mixed with
the clean voice so every word stays clear.
Writes public/assets/audio/voice/<id>.ogg and .mp3 (the game loads these).
"""
import os, subprocess, sys

IDS = ['soul-summoner', 'mr-wake', 'hero-knight', 'random', 'unlock',
       'sky-sanctum', 'verdant-spires', 'gravemoon-bridge', 'neon-arcade', 'elderwood-hollow']
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'audio', 'voice')
src, arena, pixel = sys.argv[1], '--arena' in sys.argv, '--pixel' in sys.argv
trim = 'silenceremove=start_periods=1:start_duration=0.06:start_threshold=-38dB:detection=rms:window=0.02,areverse,silenceremove=start_periods=1:start_duration=0.06:start_threshold=-38dB:detection=rms:window=0.02,areverse,afade=t=in:d=0.02'   # mic hiss and button clicks below -38 dB are cut
clean = 'highpass=f=80,acompressor=threshold=-22dB:ratio=4:attack=5:release=150:makeup=4'
stadium = 'asetrate=44100*0.94,aresample=44100,equalizer=f=140:t=q:w=1:g=4,aecho=0.85:0.6:70|140|230:0.3|0.18|0.1' if arena else 'anull'
crunch = 'aresample=44100,acrusher=bits=7:samples=4:mix=0.55:mode=log:aa=0.6,lowpass=f=7000' if pixel else 'anull'
FILTER = ','.join([trim, clean, crunch, stadium, 'apad=pad_dur=0.25', 'loudnorm=I=-12:TP=-1:LRA=7'])

done = []
for name in sorted(os.listdir(src)):
    fid, ext = os.path.splitext(name)
    if fid not in IDS: continue
    for out_ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '128k'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(src, name), '-af', FILTER, '-ac', '1', '-ar', '44100', *codec,
                        os.path.join(OUT, fid + '.' + out_ext)], check=True)
    done.append(fid)
print('your voice now plays for:', ', '.join(done) or 'nothing (no files named after a line - see the list at the top of this script)')
missing = [i for i in IDS if i not in done]
if missing: print('still the computer voice:', ', '.join(missing))
