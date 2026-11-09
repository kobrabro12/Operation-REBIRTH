"""Pack Darth Vader's custom moves losslessly, retaining numeric cel indexes and foot pivots."""
from pathlib import Path
from PIL import Image
import json
import re
from afton_mobile_atlases import pack

ROOT=Path(__file__).resolve().parents[2]


def main():
    """Replace one atlas registration and account for its logical and packed memory."""
    path=ROOT/'src/mobileAtlasManifest.js';text=path.read_text()
    manifest=json.loads(re.search(r'export const MOBILE_ATLASES\s*=\s*([^;]+);',text).group(1))
    report_path=ROOT/'public/assets/mobile/report.json';report=json.loads(report_path.read_text())
    # Retire replaced registration/assets; then account from the completed manifest.
    for key in [key for key in manifest if key.startswith('hk_meta_')]:
        old=manifest.pop(key)
        for asset in [old['image'],old['json']]:
            retired_path=ROOT/'public'/asset
            if retired_path.exists():retired_path.unlink()
    for key,file in [('hk_vader_moves','moves_sheet.png'),('hk_vader_bare_moves','bare_moves_sheet.png'),('hk_vader_specials','specials_sheet.png')]:
        manifest[key],_,_=pack(key,'',ROOT/'public/assets/fighters/hero-knight/vader'/file,(180,140))
    before=sum(v['original']['width']*v['original']['height']*4 for v in manifest.values())
    after=0
    for spec in manifest.values():
        with Image.open(ROOT/'public'/spec['image']) as image:after+=image.width*image.height*4
    path.write_text('// Generated lossless sprite atlas registrations.\nexport const MOBILE_ATLASES='+json.dumps(manifest,separators=(',',':'))+';\n')
    report_path.write_text(json.dumps({'sheets':len(manifest),'originalBytes':before,'packedBytes':after,'savedPercent':round((1-after/before)*100,1)}))
    print('Packed Darth Vader custom moves; numeric cel indexes and pivots retained.')


if __name__=='__main__':
    main()
