"""Pack Meta Knight's move sheet losslessly, retaining Lacy's frame indexes and pivots."""
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
    before,after=report['originalBytes'],report['packedBytes'];key='hk_meta_moves'
    if key in manifest:
        old=manifest[key];o=old['original'];before-=o['width']*o['height']*4
        with Image.open(ROOT/'public'/old['image']) as im:after-=im.width*im.height*4
    manifest[key],raw,packed=pack(key,'',ROOT/'public/assets/fighters/hero-knight/metaknight/moves_sheet.png',(180,140))
    before+=raw;after+=packed
    path.write_text('// Generated lossless sprite atlas registrations.\nexport const MOBILE_ATLASES='+json.dumps(manifest,separators=(',',':'))+';\n')
    report_path.write_text(json.dumps({'sheets':len(manifest),'originalBytes':before,'packedBytes':after,'savedPercent':round((1-after/before)*100,1)}))
    print('Packed Meta Knight moves; all Lacy cel indexes and pivots retained.')


if __name__=='__main__':
    main()
