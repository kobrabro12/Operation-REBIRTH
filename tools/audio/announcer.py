"""Announcer voice lines: a deep, proud male voice calling each fighter's name on the select screen.
Run:  python3 tools/audio/announcer.py <kokoro-v1.0.onnx> <voices-v1.0.bin>
Needs:  pip install kokoro-onnx soundfile   and ffmpeg.  The model files (Apache-2.0) come from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
Writes public/assets/audio/voice/<fighter id>.ogg and .mp3

The voice is a blend of Kokoro's 'am_fenrir' and 'am_michael' voices, read a little slowly, then
made into an arena announcer with ffmpeg: pitched down two semitones for weight, bass lifted,
compressed hard so every syllable hits, a short stadium echo, and normalised loud.
"""
import os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'audio', 'voice')
LINES = {
    'soul-summoner': 'Soul Summoner!',
    'mr-wake': 'Mister Wake!',
    'hero-knight': 'Lacy!',
    'random': 'Random!',
}
FILTER = ','.join([
    'asetrate=24000*0.891', 'aresample=24000', 'atempo=1.06',          # two semitones deeper, a touch slower
    'highpass=f=70', 'equalizer=f=140:t=q:w=1:g=5', 'equalizer=f=3000:t=q:w=1.2:g=3',
    'acompressor=threshold=-24dB:ratio=6:attack=5:release=120:makeup=8',
    'aecho=0.85:0.6:70|140|230:0.32|0.2|0.12',                          # arena reflections
    'apad=pad_dur=0.3', 'loudnorm=I=-11:TP=-1:LRA=7',
])

k = Kokoro(sys.argv[1], sys.argv[2])
voice = k.get_voice_style('am_fenrir') * 0.6 + k.get_voice_style('am_michael') * 0.4
os.makedirs(OUT, exist_ok=True)
for fid, text in LINES.items():
    audio, sr = k.create(text, voice=voice, speed=0.82, lang='en-us')
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, audio, sr)
        for ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '128k'])):
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', FILTER, '-ar', '44100', *codec,
                            os.path.join(OUT, fid + '.' + ext)], check=True)
    print('saved', fid, '-', text)
