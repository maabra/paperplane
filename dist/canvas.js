/* Editable SVG scene graph. All coordinates are in poster units, independent of screen zoom. */
class PosterCanvas {
  constructor() {
    this.selected = null;
    this.undoStack = [];
    this.redoStack = [];
    this.sequence = 0;
    this.drag = null;
    this.lastCheckpoint = 0;
    this.lastCheckpointKey = null;
    this.showModels = false;
    this.replacingPhoto = false;
    this.host = document.querySelector('#poster');
    this.host.addEventListener('pointerdown', e => this.pointerDown(e));
    this.host.addEventListener('pointermove', e => this.pointerMove(e));
    this.host.addEventListener('pointerup', e => this.pointerEnd(e));
    this.host.addEventListener('pointercancel', e => this.pointerEnd(e, true));
    this.host.addEventListener('lostpointercapture', e => { if (this.drag) this.pointerEnd(e, true); });
    this.host.addEventListener('dblclick', e => {
      const node = this.node();
      if (node?.type === 'text') { this.openTab('object'); document.querySelector('#objectText')?.focus(); }
    });
    document.addEventListener('click', e => this.click(e), true);
    document.addEventListener('input', e => this.input(e), true);
    document.addEventListener('change', e => this.change(e), true);
    document.addEventListener('keydown', e => this.keydown(e));
    document.querySelector('#upload').addEventListener('change', e => this.upload(e), true);
    document.querySelector('#modelToggle').addEventListener('change', e=>{this.showModels=e.target.checked;renderEditor();});
    document.querySelector('#refreshTemplates').addEventListener('click', ()=>initializeDesign(state.direction||0));
    document.querySelector('#photoLibrary').innerHTML=Object.keys(POSTER_PHOTOS).map(key=>`<button data-photo="${key}" title="${key}"><img src="assets/${key}.jpg" alt="${key} sample photo" loading="lazy"></button>`).join('');
  }

  id() { return `element-${Date.now().toString(36)}-${++this.sequence}`; }
  dimensions() { return { width: 600, height: state.paper === 'square' ? 600 : 849 }; }
  colors() { const p=state.designVersion===2?PosterDesign.colorsFor(state):palettes[state.palette];return [state.customBg || p[0], state.customInk || p[1]]; }
  parse(source) { return new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${source}</svg>`, 'image/svg+xml').documentElement; }
  serialize(node) { return new XMLSerializer().serializeToString(node); }
  measure(source) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;height:849px;visibility:hidden;pointer-events:none';
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.innerHTML = source;
    svg.append(g);
    document.body.append(svg);
    let b = g.getBBox();
    const text = g.querySelector('text');
    const fallback = Number(text?.getAttribute('font-size')) || 20;
    const anchor=text?.getAttribute('text-anchor');
    const emptyX=(Number(text?.getAttribute('x'))||0)-(anchor==='middle'?60:anchor==='end'?120:0);
    const box = { x: b.width ? b.x : emptyX, y: b.height ? b.y : (Number(text?.getAttribute('y')) || 0) - fallback, width: Math.max(1, b.width || 120), height: Math.max(1, b.height || fallback * 1.2) };
    svg.remove();
    return box;
  }
  makeNode(source, name, extra = {}) {
    const box = this.measure(source);
    const root = this.parse(source);
    const text = root.querySelector('text');
    return { id: this.id(), name, source, base: box, x: box.x, y: box.y, width: box.width, height: box.height, rotation: 0, opacity: 1, locked: false, hidden: false, flipX: false, flipY: false, type: text ? 'text' : root.querySelector('image') ? 'photo' : 'shape', ...extra };
  }
  seed(look) {
    const root = new DOMParser().parseFromString(templateSvg(look), 'image/svg+xml').documentElement;
    const doc = { height: this.dimensions().height, nodes: [] };
    const bg = root.firstElementChild;
    doc.nodes.push(this.makeNode(this.serialize(bg), 'Background', { locked: true, role: 'background' }));
    const group = root.children[1];
    const textKeys = look === 2 ? ['kicker', 'headline', 'price', 'subtitle', 'footer'] : ['kicker', 'headline', 'subtitle', 'price', 'footer'];
    const names = { kicker: 'Small heading', headline: 'Main message', subtitle: 'Supporting text', price: 'Price / highlight', footer: 'Contact / location' };
    let ti = 0, decoration = 0;
    for (const element of group.children) {
      const isText = element.tagName === 'text';
      const isArt = element.tagName === 'g';
      const modern=root.getAttribute('data-design-version')==='2';
      const binding = modern ? element.getAttribute('data-binding') : isText ? textKeys[ti++] : null;
      const wrapper = group.cloneNode(false), content = element.cloneNode(true);
      const opacity = Number(content.getAttribute('opacity') ?? content.getAttribute('stroke-opacity') ?? 1);
      content.removeAttribute('opacity');content.removeAttribute('stroke-opacity');
      wrapper.append(content);
      const name=element.getAttribute('data-layer-name')||(isText ? names[binding] : isArt ? (state.photo ? 'Photo' : 'Illustration') : `Decoration ${++decoration}`);
      doc.nodes.push(this.makeNode(this.serialize(wrapper), name, { binding, opacity, role: modern?null:isArt ? 'illustration' : null }));
    }
    return doc;
  }
  doc(look = state.look) {
    state.scenes ||= {};
    state.scenes[look] ||= this.seed(look);
    const doc = state.scenes[look], height = this.dimensions().height;
    if (doc.height !== height) {
      const ratio = height / doc.height;
      doc.nodes.forEach(n => { n.y *= ratio; n.height *= ratio; });
      doc.height = height;
    }
    return doc;
  }
  node() { return this.doc().nodes.find(n => n.id === this.selected); }
  transform(n) {
    return `translate(${n.x + n.width / 2} ${n.y + n.height / 2}) rotate(${n.rotation}) scale(${n.width / n.base.width * (n.flipX ? -1 : 1)} ${n.height / n.base.height * (n.flipY ? -1 : 1)}) translate(${-n.base.x - n.base.width / 2} ${-n.base.y - n.base.height / 2})`;
  }
  nodeSvg(n, interactive = false) {
    if (n.hidden) return '';
    const hit = interactive && !n.locked && ['text','photo'].includes(n.type) ? `<rect x="${n.base.x}" y="${n.base.y}" width="${n.base.width}" height="${n.base.height}" fill="transparent" stroke="none" pointer-events="all"/>` : '';
    return `<g ${interactive ? `data-node="${n.id}" class="canvas-node ${n.locked ? 'is-locked' : ''}"` : ''} transform="${this.transform(n)}" opacity="${n.opacity}" ${interactive && n.locked ? 'pointer-events="none"' : ''}>${n.source}${hit}</g>`;
  }
  selectionSvg() {
    const n = this.node();
    if (!n || n.hidden) return '';
    const scale = 600 / (this.host.clientWidth || 340), r = 4.5 * scale, gap = 27 * scale;
    const w = n.width, h = n.height;
    const handles = n.locked ? '' : [['nw',0,0],['n',w/2,0],['ne',w,0],['e',w,h/2],['se',w,h],['s',w/2,h],['sw',0,h],['w',0,h/2]].map(([key,x,y]) => `<rect data-handle="${key}" x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" rx="${scale}" fill="white" stroke="#53794c" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`).join('');
    return `<g class="selection-overlay" transform="translate(${n.x+w/2} ${n.y+h/2}) rotate(${n.rotation}) translate(${-w/2} ${-h/2})"><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#53794c" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-dasharray="${n.locked?'5 4':'none'}" pointer-events="none"/>${n.locked?'':`<path d="M${w/2} 0v${-gap}" fill="none" stroke="#53794c" vector-effect="non-scaling-stroke"/><circle data-handle="rotate" cx="${w/2}" cy="${-gap}" r="${r*1.3}" fill="white" stroke="#53794c" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`}${handles}</g>`;
  }
  svg(look = state.look, thumb = false, interactive = false) {
    if (thumb && !state.scenes?.[look]) return templateSvg(look, true);
    const {width,height} = this.dimensions();
    const clip=`paperplane-clip-${look}-${interactive?'editor':'output'}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(state.headline || 'Your editable poster')}"><defs><clipPath id="${clip}"><rect width="${width}" height="${height}"/></clipPath></defs><rect width="${width}" height="${height}" fill="white"/><g clip-path="url(#${clip})">${this.doc(look).nodes.map(n=>this.nodeSvg(n,interactive)).join('')}</g>${interactive?this.selectionSvg():''}</svg>`;
  }
  paint() { this.host.innerHTML = this.svg(state.look, false, true); }
  render() {
    this.paint();
    this.inspector();
    this.layers();
    this.buttons();
    document.querySelector('#bgColor').value=this.colors()[0];
    document.querySelector('#inkColor').value=this.colors()[1];
    document.querySelector('#refreshTemplates').hidden=state.designVersion===2;
  }
  buttons() {
    document.querySelectorAll('[data-action="undo"]').forEach(b=>b.disabled=!this.undoStack.length);
    document.querySelectorAll('[data-action="redo"]').forEach(b=>b.disabled=!this.redoStack.length);
    document.querySelectorAll('[data-action="duplicate"],[data-action="delete"]').forEach(b=>b.disabled=!this.node() || this.node().locked);
  }
  openTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    ['details','artwork','object','layers'].forEach(t=>document.querySelector('#'+t+'Tab').hidden=t!==tab);
  }
  select(id, open = false) {
    this.selected = id;
    this.render();
    if (open) this.openTab('object');
  }
  checkpoint(coalesce = false, key = '') {
    const now = Date.now();
    const group = `${this.selected}/${key}`;
    if (coalesce && group===this.lastCheckpointKey && now-this.lastCheckpoint<600) return;
    this.undoStack.push({state:JSON.stringify(state),selected:this.selected});
    if (this.undoStack.length>30) this.undoStack.shift();
    this.redoStack=[];
    this.lastCheckpoint=now;
    this.lastCheckpointKey=coalesce?group:null;
  }
  clearHistory() { this.undoStack=[];this.redoStack=[];this.lastCheckpoint=0;this.lastCheckpointKey=null; }
  history(redo = false) {
    const from=redo?this.redoStack:this.undoStack, to=redo?this.undoStack:this.redoStack;
    if (!from.length) return;
    to.push({state:JSON.stringify(state),selected:this.selected});
    const snapshot=from.pop();state=JSON.parse(snapshot.state);this.selected=snapshot.selected;
    this.lastCheckpoint=0;this.lastCheckpointKey=null;
    syncInputs();renderEditor();
  }
  changed(full = true) {
    if(full) renderEditor(); else { this.paint();this.inspector();this.layers();this.buttons();save(); }
  }
  inspector() {
    const container=document.querySelector('#objectTab');
    if(container.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select')) return;
    const n=this.node();
    if(!n){container.innerHTML='<div class="selection-empty"><span>↖</span><b>Everything is yours to change.</b><p>Select any text, illustration, photo, or shape on the poster. Use Layers to reach objects behind others.</p></div>';return;}
    const root=this.parse(n.source), text=root.querySelector('text');
    const paintable=[...root.querySelectorAll('text,rect,circle,ellipse,path,line,polygon,polyline,g')];
    const fill=paintable.find(el=>el.hasAttribute('fill')&&el.getAttribute('fill')!=='none')?.getAttribute('fill')||'none';
    const stroke=paintable.find(el=>el.hasAttribute('stroke')&&el.getAttribute('stroke')!=='none')?.getAttribute('stroke')||'none';
    const lineWidth=paintable.find(el=>el.hasAttribute('stroke-width'))?.getAttribute('stroke-width')||1;
    const num=(key,label,value,min='',max='')=>`<label>${label}<input data-prop="${key}" type="number" value="${Math.round(value*10)/10}" step="1" ${min!==''?`min="${min}"`:''} ${max!==''?`max="${max}"`:''} ${n.locked?'disabled':''}></label>`;
    const content=text?[...text.querySelectorAll('tspan')].map(t=>t.textContent).join('\n')||text.textContent:'';
    const family=text?.getAttribute('font-family')||'Georgia, serif';
    container.innerHTML=`<div class="object-heading"><strong>${esc(n.name)}</strong><span>${n.type.toUpperCase()}</span></div><label>Layer name<input data-prop="name" value="${esc(n.name)}" maxlength="60"></label><div class="two-col">${num('x','X position',n.x)}${num('y','Y position',n.y)}${num('width','Width',n.width,1,6000)}${num('height','Height',n.height,1,6000)}${num('rotation','Rotation °',n.rotation,-360,360)}${num('opacity','Opacity %',n.opacity*100,0,100)}</div><p class="inspector-note">Width and height stretch independently. Hold Shift while resizing to keep proportions.</p>${text?`<label>Text<textarea id="objectText" data-prop="text" rows="4" ${n.locked?'disabled':''}>${esc(content)}</textarea></label><label>Font<select data-prop="font-family" ${n.locked?'disabled':''}>${['Georgia, serif','Arial, sans-serif','Courier New, monospace','Verdana, sans-serif','Times New Roman, serif'].map(f=>`<option value="${f}" ${family===f?'selected':''}>${f.split(',')[0]}</option>`).join('')}</select></label><div class="two-col">${num('font-size','Font size',Number(text.getAttribute('font-size'))||20,1,400)}<label>Alignment<select data-prop="text-anchor" ${n.locked?'disabled':''}><option value="start" ${text.getAttribute('text-anchor')==='start'?'selected':''}>Left</option><option value="middle" ${text.getAttribute('text-anchor')==='middle'?'selected':''}>Center</option><option value="end" ${text.getAttribute('text-anchor')==='end'?'selected':''}>Right</option></select></label></div><div class="object-actions"><button data-action="bold" aria-pressed="${text.getAttribute('font-weight')==='700'}"><b>B</b></button><button data-action="italic" aria-pressed="${text.getAttribute('font-style')==='italic'}"><i>I</i></button></div>`:''}${n.type!=='photo'?`<div class="two-col"><label>Fill<input data-prop="fill" type="color" value="${/^#[0-9a-f]{6}$/i.test(fill)?fill:'#344632'}" ${n.locked?'disabled':''}></label><label>Outline<input data-prop="stroke" type="color" value="${/^#[0-9a-f]{6}$/i.test(stroke)?stroke:'#344632'}" ${n.locked?'disabled':''}></label></div><div class="object-actions"><button data-action="no-fill">No fill</button><button data-action="no-stroke">No outline</button></div>${num('stroke-width','Outline width',Number(lineWidth),0,40)}`:''}<div class="object-actions"><button data-action="flipX">Flip ↔</button><button data-action="flipY">Flip ↕</button></div><label>Align to page</label><div class="align-grid">${[['align-left','Left'],['align-center','Center'],['align-right','Right'],['align-top','Top'],['align-middle','Middle'],['align-bottom','Bottom']].map(([a,l])=>`<button data-action="${a}">${l}</button>`).join('')}</div><div class="object-actions"><button data-action="backward">↓ Back</button><button data-action="forward">↑ Forward</button></div><div class="object-actions"><button data-action="duplicate">Duplicate</button><button data-action="delete">Delete</button></div><div class="object-actions"><button data-action="ungroup" ${n.type==='text'||n.type==='photo'?'disabled':''}>Ungroup SVG parts</button></div><div class="object-actions"><button data-action="lock">${n.locked?'Unlock':'Lock'} element</button><button data-action="hide">${n.hidden?'Show':'Hide'} element</button></div><p class="inspector-note">Arrow keys move by 1. Shift + arrow moves by 10. Delete removes. Ctrl/Cmd + D duplicates.</p>`;
    if(n.type==='photo') container.insertAdjacentHTML('afterbegin','<button class="replace-photo" data-action="replace-photo">Replace this photo ↗</button>');
    this.buttons();
  }
  layers() {
    const el=document.querySelector('#layersTab'), scroll=el.scrollTop;
    el.innerHTML='<p class="hint">Top layers appear in front. Select a layer to reach any element, including the background.</p>'+[...this.doc().nodes].reverse().map(n=>`<div class="layer-row ${n.id===this.selected?'active':''}"><button data-layer="${n.id}" class="layer-select"><span>${n.type==='text'?'T':n.type==='photo'?'▧':'◇'}</span><span>${esc(n.name)}</span></button><button data-layer-toggle="hidden" data-id="${n.id}" aria-label="${n.hidden?'Show':'Hide'} ${esc(n.name)}">${n.hidden?'◌':'◉'}</button><button data-layer-toggle="locked" data-id="${n.id}" aria-label="${n.locked?'Unlock':'Lock'} ${esc(n.name)}">${n.locked?'▣':'□'}</button></div>`).join('');
    el.scrollTop=scroll;
  }
  localPoint(e) {
    const svg=this.host.querySelector('svg'), point=new DOMPoint(e.clientX,e.clientY);
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }
  pointerDown(e) {
    if(e.button!==0) return;
    const handle=e.target.closest('[data-handle]')?.dataset.handle;
    const nodeId=e.target.closest('[data-node]')?.dataset.node;
    if(!handle&&!nodeId){this.select(null);return;}
    if(nodeId&&nodeId!==this.selected)this.select(nodeId,true);
    const n=this.node();if(!n||n.locked||n.hidden)return;
    e.preventDefault();
    this.host.focus({preventScroll:true});
    const point=this.localPoint(e), before=JSON.parse(JSON.stringify(n));
    const center={x:n.x+n.width/2,y:n.y+n.height/2};
    this.drag={pointerId:e.pointerId,point,before,handle:handle||'move',center,moved:false};
    this.host.setPointerCapture(e.pointerId);
    this.host.classList.add('is-dragging');
  }
  pointerMove(e) {
    if(!this.drag||e.pointerId!==this.drag.pointerId)return;
    e.preventDefault();
    const d=this.drag,n=this.node(),p=this.localPoint(e),o=d.before;
    if(!n)return;
    if(!d.moved&&Math.hypot(p.x-d.point.x,p.y-d.point.y)>.1){this.checkpoint();d.moved=true;}
    if(!d.moved)return;
    const dx=p.x-d.point.x,dy=p.y-d.point.y;
    if(d.handle==='move'){n.x=o.x+dx;n.y=o.y+dy;}
    else if(d.handle==='rotate'){
      let angle=o.rotation+(Math.atan2(p.y-d.center.y,p.x-d.center.x)-Math.atan2(d.point.y-d.center.y,d.point.x-d.center.x))*180/Math.PI;
      if(e.shiftKey)angle=Math.round(angle/15)*15;
      n.rotation=((angle+540)%360)-180;
    }else{
      const theta=o.rotation*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta);
      const lx=dx*cos+dy*sin,ly=-dx*sin+dy*cos;
      const h=d.handle;let w=o.width,ht=o.height;
      if(h.includes('e'))w=Math.max(4,o.width+lx);if(h.includes('w'))w=Math.max(4,o.width-lx);
      if(h.includes('s'))ht=Math.max(4,o.height+ly);if(h.includes('n'))ht=Math.max(4,o.height-ly);
      if(e.shiftKey){if(h==='n'||h==='s')w=o.width*ht/o.height;else ht=o.height*w/o.width;}
      w=Math.min(6000,w);ht=Math.min(6000,ht);
      const cx=(h.includes('e')?1:h.includes('w')?-1:0)*(w-o.width)/2;
      const cy=(h.includes('s')?1:h.includes('n')?-1:0)*(ht-o.height)/2;
      n.x=d.center.x+cx*cos-cy*sin-w/2;n.y=d.center.y+cx*sin+cy*cos-ht/2;n.width=w;n.height=ht;
    }
    this.paint();
  }
  pointerEnd(e,cancel=false) {
    const d=this.drag;if(!d)return;
    this.drag=null;
    if(cancel){const n=this.node();if(n)Object.assign(n,d.before);}
    if(this.host.hasPointerCapture(d.pointerId))this.host.releasePointerCapture(d.pointerId);
    this.host.classList.remove('is-dragging');
    if(cancel&&d.moved)this.undoStack.pop();
    this.changed();
  }
  rewrite(n, mutate, keepBox=false) {
    const root=this.parse(n.source), sx=n.width/n.base.width, sy=n.height/n.base.height;
    const anchor=root.querySelector('text')?.getAttribute('text-anchor'),oldWidth=n.width;
    mutate(root);
    if(n.type==='text')TextLayout.refit(root);
    n.source=[...root.children].map(c=>this.serialize(c)).join('');
    n.base=this.measure(n.source);
    if(!keepBox){n.width=Math.max(1,n.base.width*sx);n.height=Math.max(1,n.base.height*sy);if(anchor==='middle')n.x+=(oldWidth-n.width)/2;else if(anchor==='end')n.x+=oldWidth-n.width;}
  }
  setText(n,value){this.rewrite(n,root=>TextLayout.refit(root,value));}
  updateBinding(key) {
    const binding=key==='currency'?'price':key;
    const text=binding==='price'?[state.currency,state.price].filter(Boolean).join(' '):state[binding];
    const lengths={kicker:50,headline:state.look===2?16:19,subtitle:42,price:20,footer:76};
    Object.values(state.scenes||{}).forEach(doc=>doc.nodes.filter(n=>n.binding===binding).forEach(n=>this.setText(n,text,lengths[binding])));
  }
  recolor(oldColors) {
    const next=this.colors();
    Object.values(state.scenes||{}).forEach(doc=>doc.nodes.forEach(n=>{
      const root=this.parse(n.source);
      root.querySelectorAll('*').forEach(el=>['fill','stroke'].forEach(attr=>{const v=el.getAttribute(attr);const i=oldColors.indexOf(v);if(i>=0)el.setAttribute(attr,next[i]);}));
      n.source=[...root.children].map(c=>this.serialize(c)).join('');
    }));
  }
  newElement(type) {
    this.checkpoint();
    const ink=this.colors()[1], y=this.dimensions().height/2;
    const source=type==='text'?`<text x="130" y="${y}" fill="${ink}" font-family="Georgia, serif" font-size="44"><tspan x="130" dy="0">Your text here</tspan></text>`:type==='ellipse'?`<ellipse cx="300" cy="${y}" rx="90" ry="65" fill="${ink}"/>`:type==='line'?`<path d="M180 ${y}h240" fill="none" stroke="${ink}" stroke-width="4"/>`:`<rect x="210" y="${y-65}" width="180" height="130" fill="${ink}"/>`;
    const n=this.makeNode(source,{text:'New text',rect:'Rectangle',ellipse:'Ellipse',line:'Line'}[type]);
    this.doc().nodes.push(n);this.selected=n.id;this.openTab('object');this.changed();
  }
  addArt(id) {
    this.checkpoint();
    const n=this.makeNode(`<g transform="translate(200 ${this.dimensions().height/2-100}) scale(2)" fill="none" stroke="${this.colors()[1]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${artwork[id][1]}</g>`,id[0].toUpperCase()+id.slice(1),{artId:id});
    this.doc().nodes.push(n);this.selected=n.id;this.changed();toast('Artwork added as a separate layer.');
  }
  ungroup(n) {
    const root=this.parse(n.source);let target=root.firstElementChild,path=[];
    while(target&&target.children.length===1&&['g','svg'].includes(target.tagName)){path.push(0);target=target.firstElementChild;}
    if(!target||!['g','svg'].includes(target.tagName)||target.children.length<2){toast('This is already a single SVG part.');return;}
    const parts=[...target.children].map((child,i)=>{
      const copy=root.cloneNode(true);let t=copy.firstElementChild;path.forEach(()=>t=t.firstElementChild);t.replaceChildren(child.cloneNode(true));
      const source=`<g transform="${this.transform(n)}">${[...copy.children].map(c=>this.serialize(c)).join('')}</g>`;
      return this.makeNode(source,`${n.name} · part ${i+1}`,{opacity:n.opacity});
    });
    const nodes=this.doc().nodes,index=nodes.indexOf(n);nodes.splice(index,1,...parts);this.selected=parts[0].id;
  }
  action(action) {
    if(action==='undo'||action==='redo'){this.history(action==='redo');return;}
    const n=this.node();if(!n)return;
    if(n.locked&&!['lock','hide'].includes(action)){toast('Unlock this element to edit it.');return;}
    if(action==='replace-photo'){this.replacingPhoto=true;document.querySelector('#upload').click();return;}
    this.checkpoint();
    const nodes=this.doc().nodes, index=nodes.indexOf(n);
    if(action==='delete'){nodes.splice(index,1);this.selected=null;}
    else if(action==='duplicate'){const copy=JSON.parse(JSON.stringify(n));copy.id=this.id();copy.name+=' copy';copy.x+=18;copy.y+=18;copy.binding=null;copy.role=null;nodes.splice(index+1,0,copy);this.selected=copy.id;}
    else if(action==='lock')n.locked=!n.locked;
    else if(action==='hide')n.hidden=!n.hidden;
    else if(action==='flipX'||action==='flipY')n[action]=!n[action];
    else if(action==='forward'&&index<nodes.length-1){nodes.splice(index,1);nodes.splice(index+1,0,n);}
    else if(action==='backward'&&index>0){nodes.splice(index,1);nodes.splice(index-1,0,n);}
    else if(action==='align-left')n.x=0;
    else if(action==='align-center')n.x=(600-n.width)/2;
    else if(action==='align-right')n.x=600-n.width;
    else if(action==='align-top')n.y=0;
    else if(action==='align-middle')n.y=(this.dimensions().height-n.height)/2;
    else if(action==='align-bottom')n.y=this.dimensions().height-n.height;
    else if(action==='ungroup')this.ungroup(n);
    else if(['no-fill','no-stroke','bold','italic'].includes(action)){
      this.rewrite(n,root=>{
        if(action==='bold'||action==='italic'){
          const t=root.querySelector('text');if(!t)return;
          const attr=action==='bold'?'font-weight':'font-style', on=action==='bold'?'700':'italic',off=action==='bold'?'400':'normal';t.setAttribute(attr,t.getAttribute(attr)===on?off:on);
        }else {const attr=action==='no-fill'?'fill':'stroke';root.querySelectorAll('*').forEach(el=>{if(el.hasAttribute(attr)||['path','rect','circle','ellipse','text','line','polygon'].includes(el.tagName))el.setAttribute(attr,'none');});}
      },true);
    }
    this.changed();
  }
  click(e) {
    const button=e.target.closest('button');if(!button)return;
    const intercept=()=>{e.preventDefault();e.stopImmediatePropagation();};
    if(button.dataset.tab){intercept();this.openTab(button.dataset.tab);this.inspector();this.layers();return;}
    if(button.dataset.action){intercept();this.action(button.dataset.action);return;}
    if(button.dataset.add){intercept();this.newElement(button.dataset.add);return;}
    if(button.dataset.layer){intercept();this.select(button.dataset.layer);return;}
    if(button.dataset.layerToggle){intercept();const n=this.doc().nodes.find(n=>n.id===button.dataset.id);if(n){this.checkpoint();n[button.dataset.layerToggle]=!n[button.dataset.layerToggle];this.changed();}return;}
    if(button.dataset.art){intercept();this.addArt(button.dataset.art);return;}
    if(button.dataset.photo){intercept();this.placePhoto(POSTER_PHOTOS[button.dataset.photo],button.dataset.photo+' photo',this.node()?.type==='photo');return;}
    if(button.dataset.look!==undefined){intercept();this.checkpoint();state.look=Number(button.dataset.look);this.selected=null;this.changed();return;}
    if(button.dataset.palette!==undefined){intercept();this.checkpoint();const old=this.colors();state.palette=Number(button.dataset.palette);state.usePalette=true;delete state.customBg;delete state.customInk;this.recolor(old);syncInputs();this.changed();return;}
    if(button.id==='removePhoto'){intercept();const photos=this.doc().nodes.filter(n=>n.type==='photo');if(!photos.length){toast('Select Artwork and upload a photo to add one.');return;}this.checkpoint();const selected=this.node();const target=selected?.type==='photo'?selected:photos[photos.length-1];this.doc().nodes=this.doc().nodes.filter(n=>n!==target);this.selected=null;state.photo=null;this.changed();}
  }
  input(e) {
    const el=e.target,prop=el.dataset?.prop;
    if(prop){
      e.stopImmediatePropagation();const n=this.node();if(!n||n.locked&&prop!=='name')return;
      this.checkpoint(true,prop);
      if(['x','y','width','height','rotation','opacity'].includes(prop)){
        const v=Number(el.value);if(!Number.isFinite(v)||el.value==='')return;
        n[prop]=prop==='opacity'?Math.max(0,Math.min(1,v/100)):['width','height'].includes(prop)?Math.max(1,Math.min(6000,v)):v;
      }else if(prop==='name')n.name=el.value;
      else if(prop==='text'){
        this.setText(n,el.value);
        if(n.binding){if(n.binding==='price'){state.price=el.value;state.currency='';}else state[n.binding]=el.value;syncInputs();}
      }else{
        this.rewrite(n,root=>{
          if(prop.startsWith('font-')||prop==='text-anchor'){
            const t=root.querySelector('text');if(!t)return;
            t.setAttribute(prop,el.value);if(prop==='font-size')t.setAttribute('data-font-max',el.value);
            if(prop==='font-size')t.querySelectorAll('tspan').forEach((span,i)=>span.setAttribute('dy',i?Number(el.value)*1.12:0));
          }else root.querySelectorAll('*').forEach(shape=>{if(['g','text','path','rect','circle','ellipse','line','polygon','polyline','svg'].includes(shape.tagName))shape.setAttribute(prop,el.value);});
        },['fill','stroke','stroke-width'].includes(prop));
      }
      this.paint();this.layers();this.buttons();save();return;
    }
    const key=el.id;
    if(['kicker','headline','subtitle','price','currency','footer','paper','font','bgColor','inkColor'].includes(key)){
      e.stopImmediatePropagation();this.checkpoint(true,key);const old=this.colors();
      if(key==='bgColor'||key==='inkColor'){state[key==='bgColor'?'customBg':'customInk']=el.value;this.recolor(old);}
      else {state[key]=el.value;if(key==='font'){const f=el.value==='sans'?'Arial, sans-serif':el.value==='mono'?'Courier New, monospace':'Georgia, serif';Object.values(state.scenes||{}).forEach(d=>d.nodes.filter(n=>n.type==='text').forEach(n=>this.rewrite(n,r=>r.querySelector('text').setAttribute('font-family',f))));}else if(key!=='paper')this.updateBinding(key);}
      this.changed();
    }
  }
  change(e) { if(e.target.dataset?.prop&&e.target.tagName==='SELECT')this.input(e); }
  keydown(e) {
    if(state.step!==3||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();this.history(e.shiftKey);return;}
    if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();this.history(true);return;}
    if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();this.action('duplicate');return;}
    if(e.key==='Escape'){this.select(null);return;}
    const n=this.node();if(!n||n.locked)return;
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();this.action('delete');return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.checkpoint(true,'keyboard-move');const step=e.shiftKey?10:1;if(e.key==='ArrowLeft')n.x-=step;if(e.key==='ArrowRight')n.x+=step;if(e.key==='ArrowUp')n.y-=step;if(e.key==='ArrowDown')n.y+=step;this.changed();}
  }
  async upload(e) {
    e.stopImmediatePropagation();const file=e.target.files[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Choose a PNG, JPEG, or WebP photo.');return;}
    try {
      const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const photo=canvas.toDataURL('image/png');const w=260,h=w*canvas.height/canvas.width;
      if(this.replacingPhoto&&this.node()?.type==='photo')this.placePhoto(photo,file.name.slice(0,50),true);
      else {this.checkpoint();const n=this.makeNode(`<image href="${photo}" x="${(600-w)/2}" y="${(this.dimensions().height-h)/2}" width="${w}" height="${h}" preserveAspectRatio="none"/>`,file.name.slice(0,50),{type:'photo'});this.doc().nodes.push(n);this.selected=n.id;state.photo=photo;this.changed();toast('Photo added. Move or stretch it using the handles.');}
    }catch{toast('This photo could not be opened. Try another image.');}
    e.target.value='';
    this.replacingPhoto=false;
  }
  placePhoto(photo,name,replace=false){
    const current=this.node();
    if(replace&&current?.locked){toast('Unlock the photo to replace it.');return;}
    this.checkpoint();
    if(replace&&current?.type==='photo'){
      this.rewrite(current,root=>root.querySelector('image').setAttribute('href',photo),true);current.name=name;
      toast('Photo replaced. Its frame and position are preserved.');
    }else{
      const n=this.makeNode(`<image href="${photo}" x="170" y="245" width="260" height="330" preserveAspectRatio="none"/>`,name,{type:'photo'});this.doc().nodes.push(n);this.selected=n.id;toast('Photo added as a separate layer.');
    }
    this.changed();
  }
}
