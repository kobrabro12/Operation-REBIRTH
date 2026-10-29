"""Bring Mason's voice lines from the VOICE STUDIO page into the game.

The page (a claude.ai artifact) keeps one row per line in its `lines` collection -
  { name, fighter, event, asset, seconds, preset, volume? }
and stores each processed line as a JSON asset: { "format": "wav-base64", "sampleRate": 44100, "data": "<base64 WAV>" }.

Claude fetches both (ArtifactData list of `lines`, Artifact read of each asset id), then runs:
  python3 tools/audio/import_voice_lines.py ROWS.json ASSET_DIR
ROWS.json  = a JSON list of rows, each with its document `id` added
ASSET_DIR  = a folder holding <asset id>.json for every row

It writes public/assets/audio/voice/custom/<id>.ogg + .mp3 for every line and rewrites src/data/voiceLines.js
(the page is the list: a line deleted there disappears from the game on the next import).

Lines recorded on the game site's copy of the studio (kobrabro12.github.io/Operation-REBIRTH/voice-studio/) arrive as
WAV files named <fighter>__<event>__<name>.wav (attached in chat). Those are ADDED to the list:
  python3 tools/audio/import_voice_lines.py --wav FILE.wav [FILE.wav ...]
"""
import base64, json, os, re, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'voice', 'custom')
DATA = os.path.join(ROOT, 'src', 'data', 'voiceLines.js')
FIGHTERS = {'any', 'soul-summoner', 'mr-wake', 'hero-knight', 'nu', 'aero', 'what-once-was', 'last-seen'}
EVENTS = {'pick', 'taunt', 'limit', 'ko', 'win'}


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:24] or 'line'


def main(rows_path, asset_dir):
    rows = json.load(open(rows_path))
    os.makedirs(OUT, exist_ok=True)
    lines = []
    for r in sorted(rows, key=lambda r: r.get('created', 0)):
        if r.get('fighter') not in FIGHTERS or r.get('event') not in EVENTS:
            print('skipping (unknown fighter/event):', r.get('name')); continue
        blob = json.load(open(os.path.join(asset_dir, r['asset'] + '.json')))
        lid = slug(r.get('name', 'line')) + '-' + re.sub(r'[^a-z0-9]', '', r['id'].lower())[:6]
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(base64.b64decode(blob['data'])); wav = f.name
        for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '128k'])):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, *args, os.path.join(OUT, lid + '.' + ext)], check=True)
        os.unlink(wav)
        lines.append({'id': lid, 'name': r.get('name', ''), 'fighter': r['fighter'], 'event': r['event'], **({'volume': r['volume']} if r.get('volume') else {})})
        print('added', lid, r['fighter'], r['event'])
    keep = {l['id'] for l in lines}
    for f in os.listdir(OUT):                      # lines deleted on the page leave the game too
        if not f.startswith('.') and os.path.splitext(f)[0] not in keep: os.unlink(os.path.join(OUT, f))
    write_list(lines)
    print(len(lines), 'voice lines in the game')


def current_lines():
    src = open(DATA).read()
    body = src[src.index('export const VOICE_LINES'):]
    out = []
    for m in re.finditer(r'^  (\{.*\}),$', body, re.M):
        out.append(json.loads(re.sub(r'(\{|, )(\w+): ', r'\1"\2": ', m.group(1))))
    return out


def write_list(lines):
    src = open(DATA).read()
    head = src[:src.index('export const VOICE_LINES')]
    body = ''.join('  ' + re.sub(r'"(\w+)": ', r'\1: ', json.dumps(l, ensure_ascii=True)) + ',\n' for l in lines)
    open(DATA, 'w').write(head + 'export const VOICE_LINES = [\n' + body + '];\n')


def add_wavs(paths):
    os.makedirs(OUT, exist_ok=True)
    lines = current_lines()
    for p in paths:
        parts = os.path.splitext(os.path.basename(p))[0].split('__')
        if len(parts) < 3 or parts[0] not in FIGHTERS or parts[1] not in EVENTS:
            print('skipping (name is not fighter__event__name.wav):', p); continue
        name = parts[2].replace('-', ' ').upper()
        lid = slug(name) + '-' + parts[0][:4] + '-' + parts[1]
        n = 2
        while any(l['id'] == lid for l in lines): lid = slug(name) + '-' + parts[0][:4] + '-' + parts[1] + str(n); n += 1
        for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '128k'])):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, '-ac', '1', *args, os.path.join(OUT, lid + '.' + ext)], check=True)
        lines.append({'id': lid, 'name': name, 'fighter': parts[0], 'event': parts[1]})
        print('added', lid, parts[0], parts[1])
    write_list(lines)
    print(len(lines), 'voice lines in the game')


if __name__ == '__main__':
    if sys.argv[1] == '--wav': add_wavs(sys.argv[2:])
    else: main(sys.argv[1], sys.argv[2])
