from pathlib import Path
import urllib.request
import base64
import json

assets=Path(__file__).parent/'dist'/'assets'
photos={
 'bakery':'1499636136210-6f4ee915583e',
 'bagels':'1701252714101-498aa919c898',
 'bread':'1509440159596-0249088772ff',
 'dog':'1552053831-71594a27632d',
 'concert':'1470229722913-7c0e2dbbafd3',
 'portrait':'1534528741775-53994a69daeb',
 'community':'1522071820081-009f0129c71c',
 'flowers':'1490750967868-88aa4486c946'
 ,'sports':'1461896836934-ffe607ba8211'
 ,'property':'1600596542815-ffad4c1539a9'
 ,'hiring':'1521737711867-e3b97375f902'
 ,'wellness':'1544367567-0f2fcb009e0b'
 ,'education':'1503676260728-1c00da094a0b'
 ,'charity':'1559027615-cd4628902d4a'
 ,'cinema':'1489599849927-2ee91cede3ba'
 ,'art':'1579783902614-a3fb3927b6a5'
 ,'travel':'1464822759023-fed622ff2c3b'
 ,'services':'1621905251189-08b45d6a269e'
 ,'menu':'1546069901-ba9599a7e63c'
 ,'cat':'1514888286974-6c03e2ca1dba'
 ,'coffee':'1442512595331-e89e73853f31'
 ,'pizza':'1513104890138-7c749659a591'
 ,'cake':'1578985545062-69928b1d9587'
 ,'croissant':'1555507036-ab1f4038808a'
 ,'burger':'1568901346375-23c9450c58cd'
}
for name,photo in photos.items():
    target=assets/f'{name}.jpg'
    if not target.exists():
        url=f'https://images.unsplash.com/photo-{photo}?w=1000&q=78&fit=crop'
        urllib.request.urlretrieve(url,target)
    print(f'{name}: {target.stat().st_size} bytes')
data={name:'data:image/jpeg;base64,'+base64.b64encode((assets/f'{name}.jpg').read_bytes()).decode() for name in photos}
(assets.parent/'photos.js').write_text('/* Bundled sample photography from Unsplash. See ASSETS.md. */\nconst POSTER_PHOTOS='+json.dumps(data)+';\n',encoding='utf-8')
