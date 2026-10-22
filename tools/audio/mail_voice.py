"""INFECTED.EXE's "You've got mail!" voice, played when ILOVEYOU's love letters start falling.
Run:  python3 tools/audio/mail_voice.py <kokoro-v1.0.onnx> <voices-v1.0.bin>
Needs:  pip install kokoro-onnx soundfile   and ffmpeg (model files: see announcer.py).
Writes public/assets/audio/sfx/mail_voice.ogg and .mp3.

A cheerful, slightly slow male voice (Kokoro 'am_michael'), then made to sound like it's coming out of an
old PC speaker: band-limited to a tinny 300-3400 Hz, a little crunch, a short room echo, normalised loud.
"""
import os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'audio', 'sfx')
k = Kokoro(sys.argv[1], sys.argv[2])
samples, sr = k.create("You've got mail!", voice='am_michael', speed=0.95, lang='en-us')
FILTER = ','.join(['highpass=f=300', 'lowpass=f=3400', 'acrusher=bits=10:mode=log:aa=1', 'equalizer=f=1800:t=q:w=1:g=4',
                   'aecho=0.8:0.5:40:0.2', 'apad=pad_dur=0.15', 'loudnorm=I=-12:TP=-1'])
with tempfile.TemporaryDirectory() as d:
    raw = os.path.join(d, 'raw.wav'); sf.write(raw, samples, sr)
    for ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-q:a', '3'])):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', FILTER, '-ar', '44100', *codec, os.path.join(OUT, 'mail_voice.' + ext)], check=True)
print('mail_voice written')
