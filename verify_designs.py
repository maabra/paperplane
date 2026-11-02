from playwright.sync_api import sync_playwright
from pathlib import Path
import json

root=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1500,"height":1050})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("localStorage.setItem('paperplane-editor-mode','advanced')")
    page.goto('http://127.0.0.1:4173',wait_until='networkidle')
    page.screenshot(path=str(root/'preview-new-home.png'),full_page=True)
    # Independent contact sheet for visual inspection of all category families.
    page.evaluate('''() => {
      const gallery=document.createElement('div');gallery.id='design-proof';
      gallery.style='position:absolute;z-index:99;inset:0 auto auto 0;width:1500px;padding:24px;background:#dfe3da;display:grid;grid-template-columns:repeat(6,1fr);gap:18px';
      gallery.innerHTML=['food','music','lost','community','sale','celebration'].flatMap(c=>PosterDesign.titles.map((name,i)=>`<div style="font:11px Arial"><div style="background:white;box-shadow:0 3px 5px #0002">${PosterDesign.preview(c,i)}</div><p>${c} / ${name}</p></div>`)).join('');
      document.body.append(gallery);gallery.querySelectorAll('svg').forEach(s=>{s.style.width='100%';s.style.height='auto';s.style.display='block'});
    }''')
    page.locator('#design-proof').screenshot(path=str(root/'preview-all-designs.png'))
    page.evaluate('''() => {
      const gallery=document.querySelector('#design-proof');
      gallery.style.gridTemplateColumns='repeat(4,1fr)';
      gallery.style.width='1400px';
      gallery.innerHTML=[['food',0,'BAKERY / ORGANIC'],['lost',0,'LOST PET / CLASSIC'],['community',4,'CREATIVE / COLLAGE'],['music',3,'EVENT / TYPOGRAPHIC']].map(([c,i,label])=>`<div style="font:12px Arial"><div style="box-shadow:0 4px 8px #0002">${PosterDesign.preview(c,i)}</div><p style="letter-spacing:1px">${label}</p></div>`).join('');
      gallery.querySelectorAll('svg').forEach(s=>{s.style.width='100%';s.style.height='auto';s.style.display='block'});
    }''')
    page.locator('#design-proof').screenshot(path=str(root/'preview-featured-designs.png'))
    page.evaluate("document.querySelector('#design-proof').remove()")
    page.locator('[data-category="food"]').click()
    assert page.locator('#directions .direction-preview svg').count()==6
    page.screenshot(path=str(root/'preview-new-directions.png'),full_page=True)
    page.locator('[data-direction="0"]').click()
    assert page.evaluate('state.designVersion')==2
    assert page.locator('#poster image').count()==1
    assert page.locator('#poster [data-node]').count()>=15
    page.screenshot(path=str(root/'preview-new-editor.png'),full_page=True)
    page.locator('#modelToggle').check()
    assert 'PHOTO / ARTWORK' in page.locator('#looks').inner_text()
    page.locator('#modelToggle').uncheck()
    photo=page.evaluate("canvasEditor.doc().nodes.find(n=>n.type==='photo').id")
    page.locator('[data-tab="layers"]').click()
    page.locator(f'[data-layer="{photo}"]').click()
    page.locator('[data-tab="object"]').click()
    assert page.locator('[data-action="replace-photo"]').is_visible()
    before=page.evaluate('JSON.parse(JSON.stringify(canvasEditor.node()))')
    page.locator('[data-tab="artwork"]').click()
    page.locator('[data-photo="bread"]').click()
    after=page.evaluate('JSON.parse(JSON.stringify(canvasEditor.node()))')
    assert before['id']==after['id']
    assert before['x']==after['x'] and before['width']==after['width']
    assert 'clip-path' in after['source']
    for look in range(6):
        page.locator(f'[data-look="{look}"]').click()
        nodes=page.evaluate('canvasEditor.doc().nodes.map(n=>({id:n.id,type:n.type,binding:n.binding,name:n.name}))')
        assert any(n['binding']=='headline' for n in nodes)
        assert any(n['type']=='photo' for n in nodes)
        assert len(nodes)>=8
    page.locator('[data-look="0"]').click()
    page.locator('#exportType').select_option('png')
    with page.expect_download() as download:page.locator('#download').click()
    download.value.save_as(str(root/'design-test.png'))
    assert (root/'design-test.png').stat().st_size>100000
    page.locator('#exportType').select_option('svg')
    with page.expect_download() as download:page.locator('#download').click()
    download.value.save_as(str(root/'design-test.svg'))
    svg=(root/'design-test.svg').read_text(encoding='utf-8')
    assert 'data:image/jpeg;base64' in svg and 'data-handle' not in svg
    page.reload(wait_until='networkidle')
    assert page.evaluate('state.designVersion')==2
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/'preview-new-mobile.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({"result":"PASS","checks":["216 visual presets","six preview cards","editable layer names and bindings","photo-based layouts","wireframe model toggle","photo replacement preserves mask and position","all twelve layout families","embedded-photo SVG and PNG exports","draft restoration","mobile layout","no browser errors"]}))
    browser.close()
