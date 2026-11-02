from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1500,'height':1100})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("localStorage.setItem('paperplane-editor-mode','advanced')")
    page.goto('http://127.0.0.1:4173',wait_until='networkidle')
    assert page.locator('#categories .category:visible').count()==6
    page.locator('#catalogMore').click()
    assert page.locator('#categories .category:visible').count()==18
    page.locator('#catalogSearch').fill('hiring')
    assert page.locator('#categories .category:visible').count()==1
    assert page.locator('[data-category="hiring"]').is_visible()
    page.locator('#catalogSearch').fill('')
    for cat in ['sports','property','hiring','wellness','education','charity','cinema','art','travel','services','notice','menu']:
        page.locator(f'[data-category="{cat}"]').click()
        assert page.locator('#directions .direction-preview svg').count()==6
        page.locator('[data-direction="0"]').click()
        assert page.locator('#poster [data-node]').count()>=8
        page.locator('[data-step="1"]').click()
    page.locator('#brief').fill('We are hiring a plumber for our bakery')
    page.locator('#briefForm button').click()
    assert page.evaluate('state.category')=='hiring'
    assert page.locator('#matchAlternatives button').count()>=1
    page.locator('[data-direction="0"]').click()

    # Multiple selection through actual Shift-clicks on the canvas.
    page.locator('[data-add="rect"]').click()
    first=page.evaluate('canvasEditor.node().id')
    page.locator('[data-prop="x"]').fill('60')
    page.locator('[data-prop="y"]').fill('370')
    page.locator('[data-add="ellipse"]').click()
    second=page.evaluate('canvasEditor.node().id')
    page.locator('[data-prop="x"]').fill('350')
    page.locator('[data-prop="y"]').fill('370')
    page.locator(f'#poster [data-node="{first}"]').click(modifiers=['Shift'])
    assert page.evaluate('canvasEditor.selection.size')==2
    before=page.evaluate('canvasEditor.selectedNodes().map(n=>({id:n.id,x:n.x,y:n.y}))')
    box=page.locator(f'#poster [data-node="{first}"]').bounding_box()
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+16,y+12,steps=5);page.mouse.up()
    after=page.evaluate('canvasEditor.selectedNodes().map(n=>({id:n.id,x:n.x,y:n.y}))')
    assert all(a['x']>b['x'] and a['y']>b['y'] for a,b in zip(after,before))
    assert abs((after[0]['x']-before[0]['x'])-(after[1]['x']-before[1]['x']))<.01
    page.locator('[data-command="selection-align"][data-align="top"]').click()
    assert page.evaluate('new Set(canvasEditor.selectedNodes().map(n=>n.y)).size')==1
    page.locator('.studio-tools [data-command="group"]').click()
    assert page.evaluate('canvasEditor.node().type')=='group'
    assert page.evaluate('canvasEditor.node().groupChildren.length')==2
    page.locator('[data-prop="rotation"]').fill('18')
    page.locator('[data-prop="width"]').fill('420')
    assert page.evaluate('canvasEditor.node().rotation')==18
    page.locator('[data-action="ungroup"]').click()
    assert page.evaluate('canvasEditor.selection.size')==2
    page.locator('#poster').focus()
    count=page.evaluate('canvasEditor.doc().nodes.length')
    page.keyboard.press('Control+d')
    assert page.evaluate('canvasEditor.doc().nodes.length')==count+2
    page.keyboard.press('Control+z')
    assert page.evaluate('canvasEditor.doc().nodes.length')==count

    # Grid guides are editor-only; zoom changes display size, not world coordinates.
    page.locator('#gridToggle').check()
    assert page.locator('#poster .editor-grid').count()==1
    assert 'editor-grid' not in page.evaluate('posterSvg()')
    width=page.locator('#poster').bounding_box()['width']
    page.locator('#canvasZoom').select_option('200')
    assert page.locator('#poster').bounding_box()['width']>width*1.9
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#canvasZoom').select_option('100')

    # Snapping reaches page-center guides while preserving pointer behavior.
    page.locator('[data-add="rect"]').click()
    page.locator('[data-prop="x"]').fill('208')
    page.locator('#snapToggle').check()
    ident=page.evaluate('canvasEditor.node().id')
    box=page.locator(f'#poster [data-node="{ident}"]').bounding_box()
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+1,y,steps=2)
    guide=page.evaluate('canvasEditor.guides.x')
    assert guide is not None
    edges=page.evaluate('(()=>{const n=canvasEditor.node();return[n.x,n.x+n.width/2,n.x+n.width]})()')
    assert min(abs(edge-guide) for edge in edges)<.01
    page.mouse.up()
    page.locator('#snapToggle').uncheck()

    # Custom paper and high-resolution JPEG use the physical dimensions.
    page.locator('[data-tab="details"]').click()
    page.locator('#paper').select_option('story')
    assert page.locator('#poster svg').first.get_attribute('viewBox')=='0 0 600 1067'
    page.locator('#paper').select_option('custom')
    page.locator('#customWidth').fill('180')
    page.locator('#customHeight').fill('240')
    assert page.locator('#poster svg').first.get_attribute('viewBox')=='0 0 600 800'
    assert '180 × 240 mm' in page.locator('#sizeCaption').inner_text()
    page.locator('#exportType').select_option('jpeg')
    page.locator('#exportQuality').select_option('150')
    with page.expect_download() as dl:page.locator('#download').click()
    dl.value.save_as(str(root/'studio-test.jpg'))
    from PIL import Image
    with Image.open(root/'studio-test.jpg') as image:assert image.size==(1063,1417)

    # Filtered, paginated artwork and persistent favorites.
    page.locator('[data-tab="artwork"]').click()
    count=page.evaluate('Object.keys(artwork).length')
    assert count>=150
    assert page.locator('#artGrid [data-art]').count()==48
    page.locator('#moreArt').click()
    assert page.locator('#artGrid [data-art]').count()==96
    page.locator('#artSearch').fill('trophy')
    assert page.locator('[data-art="trophy"]').is_visible()
    page.locator('[data-favorite="trophy"]').click()
    page.locator('#artCollection').select_option('favorites')
    assert page.locator('#artGrid [data-art]').count()==1
    page.locator('[data-art="trophy"]').click()
    assert page.evaluate('canvasEditor.node().artId')=='trophy'

    # Named project storage, portable file, and a clean reload.
    page.locator('[data-command="projects"]').click()
    page.locator('#projectName').fill('My hiring poster')
    page.locator('[data-command="save-project"]').click()
    page.wait_for_function("document.querySelectorAll('.project-row').length===1")
    page.locator('[data-command="save-copy"]').click()
    page.wait_for_function("document.querySelectorAll('.project-row').length===2")
    with page.expect_download() as dl:page.locator('[data-command="export-project"]').click()
    project=root/'studio-test.paperplane.json'
    dl.value.save_as(str(project))
    value=json.loads(project.read_text(encoding='utf-8'))
    assert value['format']=='paperplane'
    page.locator('[data-command="close-dialog"]').click()
    page.locator('[data-step="1"]').click()
    page.locator('[data-command="blank"]').click()
    assert page.evaluate('canvasEditor.doc().nodes.length')==1
    page.reload(wait_until='networkidle')
    assert page.locator('#editorPane').is_visible()
    assert page.evaluate('canvasEditor.doc().nodes.length')==1
    page.locator('[data-command="projects"]').click()
    page.locator('[data-command="load-project"]').first.click()
    assert page.evaluate('state.category')=='hiring'
    assert page.evaluate('state.customWidth')==180
    page.locator('[data-command="projects"]').click()
    page.locator('#projectImport').set_input_files(str(project))
    page.wait_for_function("!document.querySelector('#projectDialog').open")
    assert page.evaluate('state.category')=='hiring'
    assert page.evaluate('state.customHeight')==240

    # Import rejects active SVG content without changing the open project.
    value['state']['scenes']['0']['nodes'][0]['source']='<svg onload="window.intruded=true"><script>window.intruded=true</script></svg>'
    bad=root/'studio-test-unsafe.json';bad.write_text(json.dumps(value),encoding='utf-8')
    page.locator('[data-command="projects"]').click()
    page.locator('#projectImport').set_input_files(str(bad))
    page.wait_for_function("document.querySelector('#toast').textContent.includes('Active SVG')||document.querySelector('#toast').textContent.includes('Unsupported content')")
    assert not page.evaluate('Boolean(window.intruded)')
    assert page.evaluate('state.category')=='hiring'
    page.locator('[data-command="close-dialog"]').click()
    page.locator('[data-tab="artwork"]').click()
    svg_file=root/'studio-test-import.svg'
    svg_file.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff99dd"/><path d="M20 50h60" stroke="#7744aa"/></svg>',encoding='utf-8')
    page.locator('#svgImport').set_input_files(str(svg_file))
    page.wait_for_function("canvasEditor.node()?.name==='studio-test-import.svg'")
    assert page.evaluate('canvasEditor.node().width')>100
    page.locator('[data-tab="object"]').click()
    page.locator('[data-action="delete"]').first.click()

    # Grouped text keeps its details binding, and can be edited before ungrouping.
    ids=page.evaluate("canvasEditor.doc().nodes.filter(n=>['headline','kicker'].includes(n.binding)).map(n=>n.id)")
    page.locator('[data-tab="layers"]').click()
    page.locator(f'[data-layer="{ids[0]}"]').click()
    page.locator(f'[data-layer="{ids[1]}"]').click(modifiers=['Shift'])
    page.locator('.studio-tools [data-command="group"]').click()
    page.locator('[data-tab="details"]').click()
    page.locator('#headline').fill('A fresh opportunity')
    assert page.evaluate("canvasEditor.node().source.includes('A fresh')")
    page.locator('#font').select_option('mono')
    assert page.evaluate("canvasEditor.node().groupChildren.every(n=>n.source.includes('Courier New'))")
    page.locator('[data-tab="object"]').click()
    page.locator('[data-action="ungroup"]').click()
    assert page.evaluate("canvasEditor.selectedNodes().some(n=>n.source.includes('A fresh'))")

    # Print / PDF exposes a vector sheet with the requested physical page size.
    page.evaluate('window.print=()=>window.printRequested=true')
    page.locator('[data-command="print"]').click()
    assert page.evaluate('window.printRequested')
    assert page.locator('#printSheet svg').count()==1
    assert '180mm 240mm' in page.locator('#printPageStyle').text_content()
    page.locator('[data-tab="details"]').click()
    page.locator('#poster').focus()
    page.keyboard.press('Escape')
    page.evaluate("document.querySelector('#toast').classList.remove('show')")
    page.screenshot(path=str(root/'preview-expanded-editor.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/'preview-expanded-mobile.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({'result':'PASS','categories':18,'presets':216,'svg_assets':count,'checks':['catalog search','intent ranking','multi-select dragging','selection alignment','group resize and rotation','ungroup and undo','grid and zoom','snap guides','custom sizes','JPEG physical resolution','paginated artwork','favorites','IndexedDB projects and copies','editable project roundtrip','blank poster restoration','unsafe SVG rejection','custom SVG import','grouped text and font bindings','vector print sheet','mobile layout','no browser errors']}))
    browser.close()
