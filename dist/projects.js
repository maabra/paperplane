/* Named projects in IndexedDB; portable project files deduplicate embedded image data. */
const StudioStorage=(()=>{
 let pending=null,timer=null;
 function flush(){if(!pending)return;try{localStorage.setItem('paperplane-draft',JSON.stringify(pending));document.querySelector('#saveStatus').textContent='✧ Saved on this device';}catch{document.querySelector('#saveStatus').textContent='Draft too large: save a named project';}pending=null;}
 function queue(s){pending=s;clearTimeout(timer);document.querySelector('#saveStatus').textContent='✧ Saving…';timer=setTimeout(flush,180);}
 addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 function pack(s){const assets=[],lookup=new Map();const json=JSON.stringify(s).replace(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g,uri=>{if(!lookup.has(uri)){lookup.set(uri,assets.length);assets.push(uri);}return 'paperplane-asset:'+lookup.get(uri);});return{format:'paperplane',version:1,assets,state:JSON.parse(json)};}
 function unpack(value){
   if(value?.format!=='paperplane'||value.version!==1||!Array.isArray(value.assets)||!value.state)throw Error('Choose a Paperplane project file.');
   if(value.assets.length>200||value.assets.some(a=>typeof a!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a)))throw Error('Unsupported project image data.');
   const json=JSON.stringify(value.state);let expanded=json.length;
   for(const match of json.matchAll(/paperplane-asset:(\d+)/g)){const asset=value.assets[match[1]];if(!asset)throw Error('A project image is missing.');expanded+=asset.length-match[0].length;if(expanded>60000000)throw Error('Expanded project data is too large.');}
   return JSON.parse(json.replace(/paperplane-asset:(\d+)/g,(_,index)=>value.assets[index]));
 }
 function validate(raw){
   if(!raw||!categories.some(c=>c.id===raw.category))throw Error('Unknown poster category.');
   const clean={};
   for(const key of ['category','brief','headline','kicker','subtitle','footer','price','currency','art','font','paper','photo','customBg','customInk','customWidth','customHeight','palette','direction','look','step','designVersion','usePalette','blank','layoutRevision'])if(Object.hasOwn(raw,key))clean[key]=raw[key];
   for(const k of ['headline','kicker','subtitle','footer','price','currency','brief'])if(typeof clean[k]!=='string'||clean[k].length>5000)throw Error('Invalid poster text.');
   if(!Number.isInteger(clean.look)||clean.look<0||clean.look>11||!PAPER_FORMATS[clean.paper])throw Error('Invalid layout or paper size.');
   if(!Number.isInteger(clean.palette)||clean.palette<0||clean.palette>=palettes.length)throw Error('Invalid palette.');
   for(const k of ['customBg','customInk'])if(clean[k]&&!/^#[0-9a-f]{6}$/i.test(clean[k]))throw Error('Invalid color.');
   if(clean.photo&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(clean.photo))throw Error('Unsupported photo.');
   const tags=new Set(['svg','g','text','tspan','rect','circle','ellipse','path','line','polygon','polyline','image','defs','clipPath','linearGradient','radialGradient','stop','pattern','title','desc','mask']);
   let total=0;
   function node(n,depth=0){
     if(++total>1500||depth>8||!n||typeof n.source!=='string'||n.source.length>12000000)throw Error('Project is too complex.');
     if(!/^[a-zA-Z0-9_-]{1,110}$/.test(n.id)||typeof n.name!=='string'||n.name.length>220)throw Error('Invalid layer metadata.');
     if(!['shape','text','photo','group'].includes(n.type))throw Error('Unknown layer type.');
     if(n.binding&&!['kicker','headline','subtitle','price','footer'].includes(n.binding))throw Error('Unknown text binding.');
     for(const k of ['x','y','width','height','rotation','opacity'])if(typeof n[k]!=='number'||!Number.isFinite(n[k])||Math.abs(n[k])>1000000)throw Error('Invalid layer geometry.');
     if(n.width<=0||n.height<=0||n.opacity<0||n.opacity>1||!n.base||['x','y','width','height'].some(k=>!Number.isFinite(n.base[k]))||n.base.width<=0||n.base.height<=0)throw Error('Invalid layer dimensions.');
     const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${n.source}</svg>`,'image/svg+xml');
     if(doc.querySelector('parsererror'))throw Error('Invalid SVG layer.');
     for(const el of doc.querySelectorAll('*')){
       if(!tags.has(el.localName))throw Error('Unsupported content in SVG layer.');
       for(const a of el.attributes){const key=a.localName.toLowerCase(),value=a.value;
         if(key.startsWith('on')||key==='style'||key==='src')throw Error('Active SVG content is not supported.');
         if(key==='href'&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('External image links are not supported.');
         if(/url\s*\(/i.test(value)&&!/^url\(#[a-zA-Z0-9_-]+\)$/.test(value))throw Error('External SVG resources are not supported.');
       }
     }
     const copy=structuredClone(n);if(copy.groupChildren)copy.groupChildren=copy.groupChildren.map(child=>node(child,depth+1));return copy;
   }
   clean.scenes={};
   for(const [look,doc]of Object.entries(raw.scenes||{})){
     if(!/^(?:[0-9]|10|11)$/.test(look)||!Array.isArray(doc.nodes)||doc.nodes.length>500||!Number.isFinite(doc.height))throw Error('Invalid scene.');
     const ids=new Set();const nodes=doc.nodes.map(n=>{const result=node(n);if(ids.has(n.id))throw Error('Duplicate layer identifier.');ids.add(n.id);return result;});
     clean.scenes[look]={height:doc.height,nodes};
   }
   clean.step=3;clean.designVersion=2;return clean;
 }
 let dbPromise;
 function db(){return dbPromise||=(new Promise((resolve,reject)=>{const r=indexedDB.open('paperplane-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Project storage is unavailable in this browser.'));}));}
 async function transaction(mode,operation){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('projects',mode);const r=operation(t.objectStore('projects'));let value;r.onsuccess=()=>value=r.result;t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
 return{queue,flush,pack,unpack,validate,list:()=>transaction('readonly',s=>s.getAll()),put:record=>transaction('readwrite',s=>s.put(record)),remove:id=>transaction('readwrite',s=>s.delete(id))};
})();
