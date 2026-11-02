from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1500,'height':1100})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173',wait_until='networkidle')
    assert page.evaluate('PromptEngine.count')>=380
    cases={
        'Bakrey bagels discount':'food',
        'Live consert indie band':'music',
        'We are hiring a plumber for our bakery':'hiring',
        'Dog grooming appointment':'services',
        'Puppy training workshop':'community',
        'Missing kitten named Luna':'lost',
        'Animal shelter fundraiser volunteers needed':'charity',
        'Open house apartment for rent':'property',
        'Obavijest radno vrijeme':'notice',
    }
    for text,expected in cases.items():
        result=page.evaluate('(text)=>PromptEngine.rank(text)[0].c.id',text)
        assert result==expected,(text,result)
    fields=page.evaluate("PromptEngine.extract('Bakery old price 5,99 new price 2,99 EUR on Friday. Venue: Main Street, contact hello@example.com')")
    assert fields['price']=='2,99' and fields['currency']=='€'
    assert fields['date']=='Friday' and fields['email']=='hello@example.com'
    assert page.evaluate("PromptEngine.extract('Only 25% off').discount")=='25%'
    assert page.evaluate("PromptEngine.extract('Concert on 12.06').price===undefined")
    assert page.evaluate("PromptEngine.extract('Missing dog. Call +385 91 123 4567').phone")=='+385 91 123 4567'
    assert page.evaluate("TextLayout.fit('Your next chapter.',{width:215,height:234,fontSize:62,weight:'700'}).lines.every(s=>s!=='.')")
    clean=page.evaluate("PromptEngine.clean('<script>window.intruded=1</script><b>Bakery</b>\\u202e')")
    assert '<' not in clean and 'window.intruded' not in clean and '\u202e' not in clean

    page.locator('#brief').fill('We are hiring a plumber. Title: A fresh opportunity for talented people')
    page.wait_for_selector('#promptSuggestions button')
    assert page.locator('#promptSuggestions [data-prompt-category="hiring"]').is_visible()
    page.locator('#promptSuggestions [data-prompt-category="hiring"]').click()
    page.locator('[data-direction="0"]').click()
    assert page.evaluate('canvasEditor.mode')=='basic'
    assert not page.locator('.studio-tools').is_visible()
    assert not page.locator('.controls .tabs').is_visible()
    assert page.locator('#looks .look').count()==12
    assert page.locator('#poster image').count()==1

    def overflow():
        return page.evaluate('''() => {
          const svg=document.querySelector('#poster>svg'),b=svg.getBoundingClientRect();
          return [...svg.querySelectorAll('[data-node]')].filter(g=>g.querySelector('text[data-binding]')).map(g=>{const r=g.getBoundingClientRect();return{label:g.querySelector('text').getAttribute('data-binding'),left:r.left-b.left,right:r.right-b.right,top:r.top-b.top,bottom:r.bottom-b.bottom}}).filter(r=>r.left< -1||r.right>1||r.top< -1||r.bottom>1);
        }''')

    assert not overflow(),overflow()
    page.locator('#headline').fill('')
    page.locator('#headline').press_sequentially('A fresh opportunity',delay=5)
    assert page.locator('#headline').input_value()=='A fresh opportunity'
    page.locator('#headline').fill('A fresh opportunity for talented people who want to make something remarkable together in our community')
    page.locator('#subtitle').fill('We are looking for curious and thoughtful people who enjoy solving problems together. Bring your experience, your perspective, and your ideas. Get in touch and tell us what you would like to work on next.')
    assert not overflow(),overflow()
    text=page.evaluate("canvasEditor.doc().nodes.find(n=>n.binding==='headline').source")
    assert text.count('<tspan')>=2
    page.locator('#headline').fill('<img src=x onerror="window.intruded=true">A safe headline')
    assert page.locator('#headline').input_value()=='A safe headline'
    assert not page.evaluate('Boolean(window.intruded)')
    page.locator('#headline').fill('A fresh opportunity\nfor talented people')
    page.locator('#footer').fill('Apply at hello@example.com')
    page.locator('#kicker').fill('')
    assert page.evaluate("canvasEditor.doc().nodes.find(n=>n.binding==='kicker').source.includes('GOOD WORK')") is False

    # The simple download flow offers understandable choices and exports immediately.
    page.locator('#download').click()
    assert page.locator('#easyExport').is_visible()
    page.locator('#easyFormat').select_option('png')
    with page.expect_download() as dl:page.locator('[data-easy="download"]').click()
    dl.value.save_as(str(root/'refinement-test.png'))
    assert (root/'refinement-test.png').stat().st_size>100000

    # Advanced edits retain wrapping, including very long unbroken strings and monospace.
    page.locator('[data-easy="mode-advanced"]').click()
    assert page.locator('.studio-tools').is_visible()
    page.locator('#font').select_option('mono')
    assert not overflow(),overflow()
    headline_id=page.evaluate("canvasEditor.doc().nodes.find(n=>n.binding==='headline').id")
    page.locator(f'#poster [data-node="{headline_id}"]').click()
    page.locator('#objectText').fill('SUPERLONGUNBROKENHEADLINETHATNEEDSTOBREAKINTOMORETHANONELINEANDSTAYINSIDETHEPOSTER')
    assert not overflow(),overflow()
    page.locator('[data-tab="details"]').click()
    page.locator('#headline').fill('A fresh opportunity\nfor talented people')
    page.locator('#font').select_option('sans')
    page.locator('[data-easy="mode-basic"]').click()
    page.locator('[data-easy="reset"]').click()
    assert not overflow(),overflow()
    assert page.locator('#headline').input_value()=='A fresh opportunity\nfor talented people'

    # Every layout, in every category, is valid and keeps its bound text inside the page.
    result=page.evaluate('''() => {
      const holder=document.createElement('div');holder.style='position:fixed;left:-20000px;width:600px';document.body.append(holder);const bad=[];
      for(const c of categories)for(let look=0;look<PosterDesign.titles.length;look++){
        holder.innerHTML=PosterDesign.preview(c.id,look);
        const svg=holder.querySelector('svg'),bounds=svg.getBoundingClientRect();
        for(const text of svg.querySelectorAll('text[data-binding]')){const r=text.getBoundingClientRect();if(r.left<bounds.left-2||r.right>bounds.right+2||r.top<bounds.top-2||r.bottom>bounds.bottom+2)bad.push({category:c.id,look,binding:text.getAttribute('data-binding')});}
      }holder.remove();return bad;
    }''')
    assert not result,result

    # New looks and the portable project validator support all twelve layouts.
    page.locator('[data-look="10"]').click()
    assert page.evaluate('state.look')==10
    assert page.evaluate('StudioStorage.validate(StudioStorage.unpack(StudioStorage.pack(state))).look')==10
    page.locator('[data-look="6"]').click()
    page.screenshot(path=str(root/'preview-refined-simple.png'),full_page=True)
    page.locator('[data-easy="mode-advanced"]').click()
    page.screenshot(path=str(root/'preview-refined-advanced.png'),full_page=True)
    page.locator('[data-easy="mode-basic"]').click()
    for width in [390,700,820,1024,1500]:
        page.set_viewport_size({'width':width,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(root/'preview-refined-mobile.png'),full_page=True)
    page.reload(wait_until='networkidle')
    assert page.evaluate('canvasEditor.mode')=='basic'
    assert not overflow(),overflow()
    assert not errors,errors
    print(json.dumps({'result':'PASS','variants':216,'phrases':page.evaluate('PromptEngine.count'),'checks':['intent and typo matching','structured details and new-price priority','input sanitization','live suggestions','simple and advanced modes','spaces preserved while typing','long text and unbroken-word wrapping','monospace editing','clearing optional text','beginner download flow','reset layout','all 216 presets bounded','new layout project validation','five responsive widths','draft restoration','no browser errors']}))
    browser.close()
