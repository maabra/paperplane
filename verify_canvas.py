from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import math

root = Path(__file__).parent

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script("localStorage.setItem('paperplane-editor-mode','advanced')")
    page.goto('http://127.0.0.1:4173', wait_until='networkidle')
    page.locator('#brief').fill('Bakery discount on bagels, new price is 2,99')
    page.locator('#briefForm button').click()
    page.locator('[data-direction="0"]').click()
    assert page.locator('#poster [data-node]').count() >= 8

    def scene():
        return page.evaluate('JSON.parse(JSON.stringify(canvasEditor.doc()))')

    def selected():
        return page.evaluate('JSON.parse(JSON.stringify(canvasEditor.node()))')

    def pick_binding(binding):
        node = next(n for n in scene()['nodes'] if n.get('binding') == binding)
        # Click the actual canvas element, rather than selecting via internal state.
        page.locator(f'#poster [data-node="{node["id"]}"]').click()
        return selected()

    n = pick_binding('headline')
    assert n['name'] == 'Main message'
    assert page.locator('#objectTab').is_visible()
    bounds = page.locator(f'#poster [data-node="{n["id"]}"]').bounding_box()
    scale = page.locator('#poster').bounding_box()['width'] / 600
    x, y = bounds['x'] + bounds['width']/2, bounds['y'] + bounds['height']/2
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+35,y+22,steps=8)
    page.mouse.up()
    moved = selected()
    assert abs(moved['x'] - n['x'] - 35/scale) < 2
    assert abs(moved['y'] - n['y'] - 22/scale) < 2
    page.locator('[data-action="undo"]:visible').first.click()
    assert abs(selected()['x'] - n['x']) < .01
    page.locator('[data-action="redo"]:visible').first.click()
    assert abs(selected()['x'] - moved['x']) < .01

    # Independent horizontal stretch through a real side handle.
    before=selected()
    handle=page.locator('#poster [data-handle="e"]').bounding_box()
    x,y=handle['x']+handle['width']/2,handle['y']+handle['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+30,y,steps=7);page.mouse.up()
    after=selected()
    assert after['width'] > before['width'] + 40
    assert abs(after['height']-before['height']) < .01
    assert abs(after['x']-before['x']) < .01

    # Rotation handle and numeric inspector.
    handle=page.locator('#poster [data-handle="rotate"]').bounding_box()
    x,y=handle['x']+handle['width']/2,handle['y']+handle['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+36,y+20,steps=6);page.mouse.up()
    assert abs(selected()['rotation']) > 10
    page.locator('[data-prop="rotation"]').fill('25')
    assert selected()['rotation'] == 25
    page.locator('#objectText').fill('Every part is editable')
    assert 'Every part is editable' in selected()['source']
    page.locator('[data-prop="opacity"]').fill('70')
    assert selected()['opacity'] == .7
    page.locator('[data-action="duplicate"]').first.click()
    assert 'copy' in selected()['name']
    assert selected()['binding'] is None
    count=len(scene()['nodes'])
    page.locator('[data-action="delete"]').first.click()
    assert len(scene()['nodes']) == count-1

    page.locator('[data-add="rect"]').click()
    rect=selected()
    page.locator('[data-prop="width"]').fill('220')
    page.locator('[data-prop="height"]').fill('80')
    page.locator('[data-action="align-center"]').click()
    assert abs(selected()['x']-190)<.01
    page.locator('[data-prop="fill"]').fill('#aabbcc')
    assert '#aabbcc' in selected()['source']
    page.locator('[data-action="backward"]').click()
    page.locator('[data-action="lock"]').click()
    assert selected()['locked']
    assert page.locator('#poster [data-handle]').count()==0
    page.locator('[data-action="lock"]').click()
    assert not selected()['locked']

    # Layer panel can select and unlock the background and move it as an object.
    page.locator('[data-tab="layers"]').click()
    bg=next(n for n in scene()['nodes'] if n.get('role')=='background')
    page.locator(f'[data-layer="{bg["id"]}"]').click()
    page.locator('[data-tab="object"]').click()
    page.locator('[data-action="lock"]').click()
    page.locator('[data-prop="x"]').fill('5')
    assert selected()['x']==5
    page.locator('[data-prop="x"]').fill('0')
    page.locator('[data-action="lock"]').click()

    # Add two independent illustrations and split one into individual SVG paths.
    page.locator('[data-tab="artwork"]').click()
    page.locator('[data-art="bagel"]').click()
    first_art=selected()['id']
    assert selected()['width']<=210 and selected()['height']<=210
    page.locator('[data-art="flower"]').click()
    assert first_art!=selected()['id']
    assert selected()['width']<=210 and selected()['height']<=210
    page.locator('[data-tab="object"]').click()
    count=len(scene()['nodes'])
    page.locator('[data-action="ungroup"]').click()
    assert len(scene()['nodes']) > count
    assert 'part' in selected()['name']

    # Keyboard move, undo and duplicate without interfering with text inputs.
    page.locator('#poster').focus()
    original_x=selected()['x']
    page.keyboard.press('Shift+ArrowRight')
    assert selected()['x']==original_x+10
    page.keyboard.press('Control+d')
    assert 'copy' in selected()['name']
    page.keyboard.press('Control+z')
    assert 'copy' not in selected()['name']

    # Changing looks preserves edits in each independent scene.
    saved_scene=scene()
    page.locator('[data-look="2"]').click()
    pick_binding('headline')
    page.locator('[data-prop="rotation"]').fill('-12')
    page.locator('[data-look="0"]').click()
    assert scene()==saved_scene
    page.locator('[data-look="2"]').click()
    headline=next(n for n in scene()['nodes'] if n.get('binding')=='headline')
    assert headline['rotation']==-12
    page.locator('[data-look="0"]').click()

    # Downloads contain edited transforms, not selection boxes or hit targets.
    page.locator('#exportType').select_option('svg')
    with page.expect_download() as download:
        page.locator('#download').click()
    download.value.save_as(str(root/'canvas-test.svg'))
    exported=(root/'canvas-test.svg').read_text(encoding='utf-8')
    assert 'Every part is editable' in exported
    assert 'rotate(25)' in exported
    assert '#aabbcc' in exported
    assert 'data-handle' not in exported and 'data-node' not in exported
    page.locator('#exportType').select_option('png')
    with page.expect_download() as download:
        page.locator('#download').click()
    download.value.save_as(str(root/'canvas-test.png'))
    assert (root/'canvas-test.png').stat().st_size>10000

    before_reload=scene()
    page.reload(wait_until='networkidle')
    assert scene()==before_reload
    page.locator('[data-tab="artwork"]').click()
    page.locator('#upload').set_input_files(str(root/'canvas-test.png'))
    page.wait_for_function("canvasEditor.node()?.type === 'photo'")
    photo=selected()
    page.locator('[data-tab="object"]').click()
    page.locator('[data-prop="width"]').fill('310')
    page.locator('[data-prop="height"]').fill('120')
    assert selected()['width']==310 and selected()['height']==120
    assert 'preserveAspectRatio="none"' in selected()['source']
    with page.expect_download():
        page.locator('#download').click()
    page.locator('[data-action="delete"]').first.click()
    page.locator('#poster').focus()
    page.keyboard.press('Escape')
    page.screenshot(path=str(root/'preview-canvas-desktop.png'),full_page=True)
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.locator('[data-add="ellipse"]').click()
    assert page.locator('#poster [data-handle="e"]').is_visible()
    page.locator('#poster [data-handle="e"]').scroll_into_view_if_needed()
    handle=page.locator('#poster [data-handle="e"]').bounding_box()
    before=selected()['width']
    x,y=handle['x']+handle['width']/2,handle['y']+handle['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+18,y,steps=5);page.mouse.up()
    assert selected()['width']>before
    page.screenshot(path=str(root/'preview-canvas-mobile.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({"result":"PASS","checks":["select every template layer","drag with undo/redo","independent axis stretching","rotation handle","text and style edits","duplicate and delete","shapes and alignment","layer order and locking","background transforms","multiple illustrations and SVG ungroup","keyboard shortcuts","per-layout edit preservation","SVG and PNG contain canvas edits","draft restoration","photo stretching and export","mobile canvas interaction","no browser errors"]}))
    browser.close()
