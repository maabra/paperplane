from playwright.sync_api import sync_playwright
from pathlib import Path
import json

root = Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script("localStorage.setItem('paperplane-editor-mode','advanced')")
    response = page.goto('http://127.0.0.1:4173', wait_until='networkidle')
    assert response.status == 200
    assert page.locator('#categories .category:visible').count() == 6
    page.screenshot(path=str(root / 'preview-desktop.png'), full_page=True)
    page.locator('#brief').fill('Bakery discount on bagels, new price is 2,99')
    page.locator('#briefForm button').click()
    assert 'food & business' in page.locator('#directionTitle').inner_text().lower()
    assert page.locator('#directions .category').count() == 6
    page.locator('[data-direction="1"]').click()
    assert page.locator('#headline').input_value() == 'Bagels'
    assert page.locator('#price').input_value() == '2,99'
    assert page.locator('#currency').input_value() == ''
    assert page.locator('#looks .look').count() == 12
    page.locator('#footer').fill('Visit us on Baker Street • Open daily')
    page.locator('[data-look="3"]').click()
    page.locator('[data-tab="artwork"]').click()
    page.locator('#artSearch').fill('dog')
    assert page.locator('[data-art="dog"]').is_visible()
    page.locator('#artSearch').fill('')
    assert page.locator('#artGrid button').count() >= 45
    page.locator('[data-tab="details"]').click()
    page.locator('#paper').select_option('square')
    assert page.locator('#poster svg').get_attribute('viewBox') == '0 0 600 600'
    page.locator('#paper').select_option('a4')
    with page.expect_download() as download:
        page.locator('#download').click()
    download.value.save_as(str(root / 'test-poster.svg'))
    assert '<svg' in (root / 'test-poster.svg').read_text(encoding='utf-8')
    page.locator('#exportType').select_option('png')
    with page.expect_download() as download:
        page.locator('#download').click()
    download.value.save_as(str(root / 'test-poster.png'))
    assert (root / 'test-poster.png').stat().st_size > 10000
    page.screenshot(path=str(root / 'preview-editor.png'), full_page=True)
    page.reload(wait_until='networkidle')
    assert page.locator('#headline').input_value() == 'Bagels'
    assert page.locator('#footer').input_value() == 'Visit us on Baker Street • Open daily'
    page.locator('#startOver').click()
    page.locator('#brief').fill('Lost dog named Milo')
    page.locator('#briefForm button').click()
    assert 'lost & found' in page.locator('#directionTitle').inner_text().lower()
    page.locator('[data-direction="0"]').click()
    assert 'Milo' in page.locator('#headline').input_value()
    page.locator('[data-tab="artwork"]').click()
    page.locator('#upload').set_input_files(str(root / 'test-poster.png'))
    page.wait_for_function("JSON.parse(localStorage.getItem('paperplane-draft')).photo !== null")
    assert 'data:image/png' in page.locator('#poster').inner_html()
    page.locator('#exportType').select_option('png')
    with page.expect_download():
        page.locator('#download').click()
    page.set_viewport_size({"width":390,"height":844})
    page.locator('[data-step="1"]').click()
    page.screenshot(path=str(root / 'preview-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    for cat in ['food','music','lost','sale','community','celebration']:
        page.locator(f'[data-category="{cat}"]').click()
        assert page.locator('#directions .category').count() == 6
        page.locator('[data-direction="2"]').click()
        assert page.locator('#poster svg').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.locator('[data-step="1"]').click()
    assert not errors, errors
    print(json.dumps({"result":"PASS", "checks":["six categories and 36 directions", "keyword ranking and decimal price parsing", "twelve editable layouts", "artwork search", "paper sizes", "SVG and high-resolution PNG exports", "draft restoration", "lost pet name extraction", "photo upload and PNG export", "mobile overflow", "no browser errors"]}))
    browser.close()
