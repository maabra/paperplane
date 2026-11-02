/* Art-directed layouts assembled from independent, editable SVG layers. */
const PosterDesign = (() => {
  const F={sans:'Arial, sans-serif',display:'Impact, Arial Narrow, sans-serif',serif:'Georgia, serif',mono:'Courier New, monospace'};
  const titles=['Signature','Photo editorial','Color blocks','Type statement','After dark','Graphic grid','Quiet editorial','Split composition','Framed feature','Information board','Artful layers','Bold announcement'];
  const measure=document.createElement('canvas').getContext('2d');
  let serial=0;
  const encode=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const specs={
    food:{bg:'#faebd9',ink:'#8b4825',accent:'#e99169',pop:'#f5cdb5',photo:'bakery',title:'Freshly\nbaked.',label:'SMALL BATCH. BIG FEELINGS.',body:'Good ingredients. A little patience.\nSomething delicious, made every morning.',footer:'YOUR BAKERY  /  YOUR ADDRESS',tag:'FRESH FROM THE OVEN',second:'BREAD & BUTTER'},
    music:{bg:'#eee1d9',ink:'#292821',accent:'#ff4e25',pop:'#e6fc41',photo:'concert',title:'SUMMER\nSOUNDS',label:'LIVE MUSIC / IN GOOD COMPANY',body:'The bands you love. The people you came for.\nOne room, a thousand good memories.',footer:'ADD DATE  /  VENUE  /  TICKETS',tag:'TURN IT ALL THE WAY UP',second:'LIVE / LOUD / LATE'},
    lost:{bg:'#eee7cf',ink:'#284f45',accent:'#ae3456',pop:'#d8dec8',photo:'dog',title:'MISSING DOG',label:'PLEASE HELP BRING OUR FRIEND HOME',body:'Add identifying features and the last known location.\nPlease contact us if you have any information.',footer:'ADD YOUR NAME & PHONE NUMBER',tag:'PLEASE SHARE WITH YOUR NEIGHBORS',second:'HELP BRING THEM HOME'},
    sale:{bg:'#f1eee4',ink:'#1e2020',accent:'#fc4b31',pop:'#dbfc27',photo:'portrait',title:'GOOD\nFINDS.',label:'A LITTLE PRICE. A LOT TO LOVE.',body:'The good stuff, at very good prices.\nDiscover a new favorite while it lasts.',footer:'YOUR STORE  /  YOUR WEBSITE',tag:'YOUR NEXT FAVORITE IS HERE',second:'NEW / GOOD / YOURS'},
    community:{bg:'#f1f0f0',ink:'#181818',accent:'#7753ff',pop:'#dafa22',photo:'community',title:'Start learning\ntoday.',label:'SOMETHING GOOD STARTS WITH YOU',body:'Learn something new. Meet your people.\nA welcoming space to make your next move.',footer:'ADD DATE  /  PLACE  /  SIGN-UP LINK',tag:'FIND YOUR PEOPLE',second:'LEARN / MAKE / CONNECT'},
    celebration:{bg:'#f6eee4',ink:'#3b3c79',accent:'#ef809e',pop:'#d7f075',photo:'flowers',title:'LET’S\nCELEBRATE.',label:'GOOD PEOPLE. HAPPY MOMENTS.',body:'A very good reason to get together.\nJoin us for something worth celebrating.',footer:'ADD DATE  /  LOCATION  /  RSVP',tag:'SAVE A LITTLE ROOM FOR MAGIC',second:'YOU ARE INVITED'}
  };
  class Draw {
    constructor(s,look){this.s=s;this.c=specs[s.category]||specs.food;this.look=look;this.scope=++serial;this.parts=[];this.count=0;this.bg=s.customBg||this.c.bg;this.ink=s.customInk||this.c.ink;this.accent=this.c.accent;this.pop=this.c.pop;}
    add(markup,name,binding=''){this.parts.push(markup.replace(/^<(\w+)/,`<$1 data-layer-name="${encode(name)}"${binding?` data-binding="${binding}"`:''}`));}
    rect(x,y,w,h,fill,name='Color block',radius=0,stroke='',sw=1){this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''}/>`,name);}
    path(d,fill,name='Graphic shape',stroke='',sw=1){this.add(`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`,name);}
    circle(x,y,r,fill,name='Circle',stroke='',sw=1){this.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''}/>`,name);}
    line(x1,y1,x2,y2,color,name='Rule',sw=1){this.path(`M${x1} ${y1}L${x2} ${y2}`,'none',name,color,sw);}
    text(value,x,y,size,color,width=510,options={}){
      const family=options.family||F.sans,weight=options.bold?'700':'400',anchor=options.anchor||'start',tracking=options.tracking||0,lh=options.lh||1.12;
      const safe=anchor==='middle'?Math.max(10,2*Math.min(x-24,576-x)):anchor==='end'?Math.max(10,x-24):Math.max(10,576-x);
      width=Math.min(width,safe);
      const height=options.maxHeight||({headline:164,kicker:34,subtitle:90,footer:48,price:86}[options.binding])||Math.min(130,Math.max(28,849-y-24));
      const result=TextLayout.fit(value,{width,height,fontSize:size,family,weight,italic:options.italic,tracking,lineHeight:lh});
      const top=y-size*.8,baseline=top+result.size*.8;
      const attrs=`font-family="${family}" font-size="${result.size.toFixed(3)}" font-weight="${weight}" text-anchor="${anchor}" data-text-value="${encode(TextLayout.clean(value))}" data-text-width="${width}" data-text-height="${height}" data-text-top="${top}" data-font-max="${size}" data-line-height="${lh}"${options.italic?' font-style="italic"':''}${tracking?` letter-spacing="${tracking}"`:''}`;
      const markup=`<text x="${x}" y="${baseline}" fill="${options.outline?'none':color}" ${attrs}${options.outline?` stroke="${color}" stroke-width="1.1"`:''}>${result.lines.map((line,i)=>`<tspan x="${x}" dy="${i?result.size*lh:0}">${encode(line)}</tspan>`).join('')}</text>`;
      this.add(markup,options.name||options.binding||'Typography',options.binding);
      return baseline+(result.lines.length-1)*result.size*lh;
    }
    photo(x,y,w,h,options={}){
      let key=options.key||this.c.photo;
      if(!options.key&&this.s.category==='food'){
        const description=(this.s.headline||'')+' '+(this.s.brief||'');
        if(/bagel/i.test(description))key='bagels';else if(/croissant/i.test(description))key='croissant';else if(/coffee|espresso|cappuccino/i.test(description))key='coffee';else if(/pizza/i.test(description))key='pizza';else if(/cake/i.test(description))key='cake';else if(/burger/i.test(description))key='burger';else if(/bread|sourdough|loaf/i.test(description))key='bread';
      }
      if(!options.key&&this.s.category==='lost'&&/cat|kitten|macka/i.test((this.s.headline||'')+' '+(this.s.brief||'')))key='cat';
      if(!this.s.photo&&!POSTER_PHOTOS[key]){
        this.rect(x,y,w,h,this.c.pop||'#e8def6',options.name||'Illustration panel',options.radius||0);
        const size=Math.min(w,h)*.75;
        this.art(this.c.art||'star',x+(w-size)/2,y+(h-size)/2,size,this.c.accent,'Category illustration');
        return;
      }
      const photo=this.s.photo||POSTER_PHOTOS[key];
      const id=`photo-${this.s.category}-${this.look}-${this.scope}-${this.count++}`,clip=options.path||`M${x+(options.radius||0)} ${y}H${x+w-(options.radius||0)}Q${x+w} ${y} ${x+w} ${y+(options.radius||0)}V${y+h-(options.radius||0)}Q${x+w} ${y+h} ${x+w-(options.radius||0)} ${y+h}H${x+(options.radius||0)}Q${x} ${y+h} ${x} ${y+h-(options.radius||0)}V${y+(options.radius||0)}Q${x} ${y} ${x+(options.radius||0)} ${y}Z`;
      this.add(`<g><defs><clipPath id="${id}"><path d="${clip}"/></clipPath></defs><image href="${photo}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/></g>`,options.name||'Photo • replace with your own');
    }
    art(id,x,y,size,color,name){const a=artwork[id]||artwork.flower;this.add(`<g transform="translate(${x} ${y}) scale(${size/100})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a[1]}</g>`,name||`${id} illustration`);}
    star(x,y,r,color,points=12,name='Starburst'){
      const pts=Array.from({length:points*2},(_,i)=>{const angle=i*Math.PI/points-Math.PI/2,rad=i%2?r*.38:r;return `${x+Math.cos(angle)*rad},${y+Math.sin(angle)*rad}`}).join(' ');
      this.add(`<polygon points="${pts}" fill="${color}"/>`,name);
    }
    heading(x,y,size,color,width=520,options={}){return this.text(typeof this.s.headline==='string'?this.s.headline:this.c.title,x,y,size,color,width,{bold:true,name:'Main message',binding:'headline',...options});}
    kicker(x,y,color,width=520,options={}){this.text(typeof this.s.kicker==='string'?this.s.kicker:this.c.label,x,y,options.size||11,color,width,{tracking:1.4,name:'Small heading',binding:'kicker',...options});}
    body(x,y,color,width=480,options={}){this.text(typeof this.s.subtitle==='string'?this.s.subtitle:this.c.body,x,y,options.size||15,color,width,{name:'Supporting text',binding:'subtitle',lh:1.3,...options});}
    footer(x,y,color,width=520,options={}){this.text(typeof this.s.footer==='string'?this.s.footer:this.c.footer,x,y,options.size||11,color,width,{name:'Contact / location',binding:'footer',...options});}
    price(x,y,size,color,width=200,options={}){this.text([this.s.currency,this.s.price].filter(Boolean).join(' '),x,y,size,color,width,{name:'Price / highlight',binding:'price',bold:true,...options});}
    finish(){const h=posterDimensions(this.s).height;const bg=this.s.customBg||(this.s.usePalette?palettes[this.s.palette][0]:this.bg);return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${h}" viewBox="0 0 600 ${h}" data-design-version="2"><rect width="600" height="${h}" fill="${bg}"/><g transform="scale(1 ${h/849})">${this.parts.join('')}</g></svg>`;}
  }
  function signature(d){
    const c=d.c;
    if(!['food','music','lost','sale','community','celebration'].includes(d.s.category)){
      d.rect(23,23,554,803,'none','Inset frame',0,d.ink,1);
      d.kicker(42,63,d.ink,515,{size:10});
      d.heading(40,158,75,d.ink,520,{lh:.98,maxHeight:160});
      d.photo(56,334,488,296,{radius:32,name:'Topic illustration'});
      d.star(523,337,42,c.accent,8,'Accent burst');
      d.body(42,679,d.ink,490,{size:14});d.price(42,766,45,d.ink,330);
      d.line(42,786,557,786,d.ink,'Footer rule');d.footer(42,811,d.ink,510,{size:10});return;
    }
    if(d.s.category==='lost'){
      d.rect(20,20,560,809,'none','Crimson border',0,c.accent,11);
      d.heading(300,108,65,c.accent,520,{family:F.serif,anchor:'middle',lh:1.02,maxHeight:126});
      d.photo(115,212,370,333,{name:'Missing pet photo'});
      d.kicker(300,184,d.ink,500,{anchor:'middle',tracking:.5,size:10});
      d.body(300,590,d.ink,490,{anchor:'middle',size:17});
      d.art('phone',74,679,42,d.ink,'Contact symbol');
      d.footer(300,708,d.ink,415,{anchor:'middle',size:22,family:F.serif,bold:true});
      d.text('PLEASE HELP BRING THEM HOME',300,790,27,c.accent,500,{family:F.serif,bold:true,anchor:'middle',name:'Appeal'});
      d.price(300,755,22,d.ink,450,{anchor:'middle'});return;
    }
    if(d.s.category==='music'){
      d.rect(0,0,600,849,c.bg,'Warm paper');
      d.text('INDEPENDENT SOUNDS',28,34,10,c.accent,300,{name:'Series label'});
      d.text('LIVE / 01',572,34,10,c.accent,150,{anchor:'end',name:'Edition'});
      d.photo(96,180,408,489,{name:'Live show photography'});
      d.rect(96,180,408,489,c.accent,'Photo color wash');
      d.parts[d.parts.length-1]=d.parts[d.parts.length-1].replace('fill="'+c.accent+'"','fill="'+c.accent+'" opacity=".42"');
      d.heading(300,103,80,d.ink,560,{anchor:'middle',lh:.89});
      d.kicker(28,726,c.accent,540,{tracking:.7});d.body(28,757,d.ink,540,{size:13});d.footer(28,815,c.accent,540);
      d.text('SOUND\n& VISION',29,385,29,d.ink,120,{name:'Side typography',lh:.9});
      d.text('ALL\nWELCOME',571,532,25,d.ink,110,{anchor:'end',name:'Side typography',lh:.9});d.price(300,706,44,c.accent,300,{anchor:'middle'});return;
    }
    if(d.s.category==='food'){
      d.path('M0 0H600V271C470 256 477 181 354 191S254 331 0 220Z','#ffd9c2','Peach upper shape');
      d.path('M0 437C140 455 94 550 158 621S300 736 254 849H0Z','#ffd9c2','Peach lower shape');
      d.path('M495 0C426 94 582 117 600 213V0Z','#f7c5a7','Corner shape');
      d.art('bread',39,37,36,d.ink,'Bakery emblem');
      d.text('THE NEIGHBORHOOD BAKERY',85,61,10,d.ink,380,{bold:true,tracking:1.6,name:'Bakery name'});
      d.heading(39,155,63,'#bb7a3f',520,{family:F.serif,lh:1.0});
      d.kicker(41,275,d.ink,500,{tracking:.7,size:15});
      d.body(41,309,d.ink,345,{size:13});
      d.photo(104,383,455,350,{path:'M116 553C93 470 191 473 274 428S455 363 522 399 583 588 509 678 192 752 139 666 126 599 116 553Z',name:'Organic cookie photograph'});
      d.path('M458 22Q488 80 578 97M0 608Q136 658 24 741','none','Fine orange lines',c.accent,1.5);
      d.art('plant',458,266,91,c.accent,'Botanical sprig');d.art('leaf',32,722,83,c.accent,'Lower leaf');
      d.star(504,692,66,'#f7d29b',10,'Offer badge');
      d.price(504,703,34,d.ink,105,{anchor:'middle'});
      d.art('cake',366,647,132,d.ink,'Cake illustration');
      for(let i=0;i<9;i++)d.circle(405+(i%5)*25,94+Math.floor(i/5)*22,3.2,'#fffdf4','Confetti dot');
      d.footer(40,799,d.ink,520,{size:11});return;
    }
    if(d.s.category==='community'){
      d.bg='#efece3';d.rect(25,24,550,446,'#305bd4','Blue learning panel',6);
      d.photo(66,63,469,366,{radius:150,name:'Class photograph'});
      d.circle(505,430,59,'#d9f359','Lime plus badge');d.text('+',505,455,73,'#254fc0',85,{anchor:'middle',name:'Plus symbol'});
      d.kicker(31,510,'#2851bd',538,{size:11});d.heading(28,590,71,'#1f292b',544,{lh:1.0,maxHeight:155});
      d.body(31,738,'#354345',465,{size:14});d.footer(31,813,'#2851bd',537,{size:11});d.price(540,774,45,'#2851bd',170,{anchor:'end'});return;
    }
    if(d.s.category==='sale'){
      d.bg='#d8f62e';d.kicker(28,35,'#191b19',530,{size:10});
      d.heading(25,151,127,'#191b19',550,{family:F.display,lh:.9,maxHeight:260});
      d.rect(24,371,553,351,'#191b19','Black photo panel',4);d.photo(240,390,318,313,{radius:145,name:'Campaign portrait'});
      d.text('A LITTLE\nPRICE.\nA LOT\nTO LOVE.',46,425,46,'#f2f1e5',185,{family:F.display,name:'Offer statement',lh:1.03});
      d.price(47,673,62,'#d8f62e',180);d.body(28,759,'#222621',544,{size:13});d.footer(28,815,'#222621',540,{size:11});return;
    }
    d.bg='#183a60';const gold='#e2b873';
    d.circle(421,240,125,gold,'Harvest moon');
    d.photo(77,108,336,326,{radius:158,name:'Celebration flowers'});
    d.art('flower',461,389,125,gold,'Gold flower');d.art('leaf',13,260,103,gold,'Gold leaf');
    d.star(482,89,17,gold,4,'Upper sparkle');d.star(65,438,15,gold,4,'Lower sparkle');
    d.kicker(37,49,'#fff5e1',526,{size:10});d.heading(39,544,73,'#fff4dc',523,{family:F.serif,italic:true,lh:.97,maxHeight:150});
    d.body(40,714,'#f1e7d1',490,{size:14});d.footer(40,807,gold,520,{size:11});d.price(509,768,44,gold,170,{anchor:'end'});
  }
  function editorial(d){
    const c=d.c;
    d.rect(0,0,600,849,c.bg,'Paper color');
    d.kicker(30,34,d.ink,540,{size:10});
    d.heading(29,114,d.s.category==='lost'?62:83,d.ink,542,{family:d.s.category==='food'?F.serif:F.sans,lh:.94,maxHeight:167});
    d.photo(30,290,540,362,{name:'Main editorial photograph'});
    d.rect(30,625,197,49,c.accent,'Highlight strip');
    d.text(c.tag,44,645,11,'#ffffff',168,{bold:true,name:'Photo caption'});
    d.body(30,707,d.ink,365,{size:14});
    d.price(564,746,47,c.accent,155,{anchor:'end'});
    d.line(30,774,570,774,d.ink,'Footer rule');
    d.footer(30,808,d.ink,465,{size:11});
    d.text('↗',559,814,37,d.ink,45,{anchor:'end',name:'Arrow'});
  }
  function bento(d){
    const c=d.c;d.bg='#131313';
    d.rect(9,9,582,280,'#eeecef','Top white card',23);
    d.photo(337,24,239,250,{radius:17,name:'Card photo'});
    d.heading(30,72,48,'#181818',284,{lh:1.0,maxHeight:170});
    d.kicker(30,252,'#181818',290,{size:9,tracking:0});
    d.rect(9,296,284,257,'#191919','Dark information card',24,'#ecebdc',1);
    d.text('A GOOD\nPLACE TO\nSTART.',31,341,36,'#f1f0ed',222,{bold:true,lh:1.02,name:'Card heading'});
    d.body(31,479,'#f1f0ed',237,{size:13});
    d.circle(257,327,18,'#f1f0ed','Plus circle');d.text('+',257,338,34,'#171717',30,{anchor:'middle',name:'Plus sign'});
    d.rect(300,296,291,257,'#dbf420','Lime offer card',24);
    d.text(d.s.price?'ONLY':'COME AS',324,377,27,'#171717',235,{name:'Offer label'});
    d.text(d.s.price?'':'YOU ARE.',323,451,52,'#171717',245,{bold:true,name:'Welcome card'});
    d.price(322,460,79,'#171717',247);
    d.circle(550,332,19,'#181818','Heart badge');d.text('♥',550,340,22,'#dbf420',30,{anchor:'middle',name:'Heart'});
    d.rect(9,560,582,178,'#ed8bd4','Pink callout card',24);
    d.text(c.body,31,603,18,'#171717',470,{lh:1.25,name:'Invitation'});
    d.circle(543,700,19,'#171717','Arrow badge');d.text('↗',543,709,27,'#ed8bd4',32,{anchor:'middle',name:'Arrow'});
    d.rect(9,745,284,95,'#eeecef','Contact card',22);d.rect(300,745,291,95,'#7441ff','Link card',22);
    d.text('LET’S CONNECT',150,781,11,'#171717',220,{bold:true,anchor:'middle',name:'Contact label'});
    d.footer(150,807,'#171717',245,{size:9,anchor:'middle'});
    d.text(c.second,445,800,12,'#ffffff',255,{bold:true,anchor:'middle',name:'Link label'});
  }
  function typographic(d){
    const c=d.c;d.bg='#f4f1e7';const red=d.s.customInk||'#fa3425';
    d.kicker(24,29,red,430,{size:9,tracking:0});d.text('FOR EVERYONE',576,29,9,red,130,{anchor:'end',name:'Edition label'});
    d.heading(300,144,94,red,553,{family:F.display,anchor:'middle',lh:.94,maxHeight:179});
    const title=(d.s.headline||c.title).replace(/\n/g,' ');
    d.text(title,300,338,67,red,548,{family:F.display,anchor:'middle',outline:true,name:'Outline typography',lh:.95});
    d.text(c.second,300,427,65,red,550,{family:F.display,anchor:'middle',italic:true,name:'Statement typography',lh:.98});
    d.photo(208,499,185,220,{name:'Small editorial photo'});
    d.body(25,541,red,159,{size:10});
    d.text('A BIG IDEA\nDESERVES TO\nBE SEEN.',421,541,15,red,153,{family:F.display,name:'Marginal note',lh:1.1});
    d.price(423,683,43,red,150);
    d.footer(24,805,red,465,{size:10});d.text('EVERYDAY',576,805,10,red,100,{anchor:'end',name:'Footer label'});
  }
  function dark(d){
    const c=d.c;d.bg='#101111';const purple='#7961ff',lime='#def284',pink='#ef99d8';
    d.path('M-70 96Q266-29 83 298T120 924M605-65Q346 233 568 524T408 967','none','Background orbit','#252626',11);
    d.text('○○○',31,48,22,'#f4f1e5',100,{name:'Brand marks'});d.text('STUDIO / 01',300,44,12,'#f4f1e5',200,{anchor:'middle',tracking:2,name:'Studio label'});d.text('×',569,48,26,'#f4f1e5',30,{anchor:'end',name:'Close motif'});
    d.heading(36,127,68,'#f7f5ee',525,{lh:.96,maxHeight:142});
    d.kicker(39,274,lime,520,{size:10,tracking:.8});
    d.rect(163,319,278,312,purple,'Violet photo card',27,'#eeefde',1.5);
    d.photo(172,328,260,293,{radius:22,name:'Collage portrait'});
    d.rect(184,297,244,35,'none','Capsule outline',18,'#eeeeec',1.5);
    d.text('✳  ✳  ✳',199,321,22,'#f5f2e7',200,{name:'Capsule stars'});
    d.rect(36,331,87,79,lime,'Code sticker',7);d.text('</>',79,383,31,'#111111',78,{bold:true,anchor:'middle',name:'Code symbol'});
    d.rect(474,368,96,71,'#f4f1e5','Bracket sticker',8);d.text('{ }',522,417,40,'#111111',85,{bold:true,anchor:'middle',name:'Brackets'});
    d.star(514,559,75,purple,10,'Violet starburst');d.circle(82,506,27,'none','Pink ring',pink,9);
    d.star(117,650,57,lime,9,'Lime starburst');
    d.path('M0 594 53 546 92 574 68 615 34 640 0 658Z',pink,'Pink abstract hand');
    d.text('↗',43,613,54,'#141414',65,{name:'Sticker arrow'});
    d.price(302,588,50,'#ffffff',210,{anchor:'middle'});
    ['CREATE','CONNECT','EXPLORE'].forEach((t,i)=>{const x=39+i*177;d.rect(x,686,164,48,i===0?purple:i===1?lime:'none',`${t} capsule`,24,i===2?pink:'',2);d.text(t,x+82,717,12,i===1?'#171717':'#ffffff',145,{anchor:'middle',bold:true,name:`${t} label`});});
    d.body(300,764,'#eeece7',512,{size:12,anchor:'middle'});d.footer(300,818,'#d3d5c4',520,{size:10,anchor:'middle'});
  }
  function graphic(d){
    d.bg='#fbfaf5';const blue='#2850fc',pink='#f4b6e1',lime='#b3eb7b',ink='#151515';
    const x=38,y=43,cw=87.3,ch=114;
    for(let i=0;i<=6;i++)d.line(x+i*cw,y,x+i*cw,810,'#999d94',`Vertical grid ${i+1}`, .7);
    for(let i=0;i<=6;i++)d.line(x,y+i*ch,562,y+i*ch,'#999d94',`Horizontal grid ${i+1}`,.7);
    d.rect(38,43,87,114,lime,'Green corner tile');d.text('↙',81,120,52,blue,75,{anchor:'middle',name:'Blue arrow'});
    d.add('<ellipse cx="204" cy="133" rx="94" ry="49" fill="'+pink+'" transform="rotate(-34 204 133)"/>','Pink ellipse');
    d.rect(388,43,174,31,ink,'Discipline label');d.text('DESIGN / CULTURE',475,64,10,'#ffffff',156,{anchor:'middle',name:'Discipline text'});
    d.kicker(302,187,blue,255,{size:10,tracking:0});
    d.star(470,341,76,pink,22,'Scalloped pink seal');d.star(341,345,52,blue,17,'Blue star tile');
    d.art('flower',140,216,68,lime,'Green flower');
    d.rect(212,272,176,29,ink,'Category label');d.text(d.c.second,300,292,10,'#ffffff',160,{anchor:'middle',name:'Category text'});
    d.text('LET’S MAKE SOMETHING GOOD.',41,417,10,blue,510,{bold:true,name:'Intro line'});
    d.heading(39,469,58,ink,520,{bold:true,lh:1.04,maxHeight:128});
    d.rect(337,587,224,44,lime,'Availability label');d.text('YOUR NEXT BIG THING',449,615,15,ink,209,{bold:true,anchor:'middle',name:'Availability text'});
    d.photo(39,615,173,142,{name:'Grid photo'});
    d.rect(213,615,87,114,lime,'At-symbol tile');d.text('@',256,687,51,blue,75,{anchor:'middle',name:'At symbol'});
    d.path('M306 725C318 648 349 770 365 696S412 672 415 718','none','Blue squiggle',blue,7);
    d.circle(482,708,42,'none','Blue circle',blue,6);
    d.body(319,750,ink,240,{size:10});d.footer(39,791,ink,500,{size:10});
    d.price(296,251,44,blue,200,{anchor:'middle'});
  }
  function quiet(d){
    d.kicker(42,58,d.ink,516,{size:10});
    d.heading(300,151,64,d.ink,510,{anchor:'middle',family:d.s.category==='food'?F.serif:F.sans,maxHeight:133,lh:1.04});
    d.photo(42,277,516,333,{radius:3,name:'Feature photograph'});
    d.body(300,665,d.ink,470,{anchor:'middle',size:15,maxHeight:80});
    d.price(300,756,42,d.accent,450,{anchor:'middle'});
    d.line(42,783,558,783,d.ink,'Footer divider',.7);d.footer(300,810,d.ink,500,{anchor:'middle',size:10});
  }
  function split(d){
    d.rect(0,0,286,849,d.ink,'Ink side panel');
    d.photo(310,40,250,584,{radius:3,name:'Portrait crop'});
    d.kicker(35,57,d.bg,210,{size:9,tracking:.7});
    d.heading(35,147,62,d.bg,215,{maxHeight:234,lh:1.03});
    d.body(35,466,d.bg,213,{size:14,maxHeight:136});
    d.price(35,687,42,d.bg,212);
    d.text(d.c.tag,310,680,16,d.ink,250,{bold:true,name:'Photo caption',maxHeight:70});
    d.rect(310,753,250,4,d.accent,'Accent rule');d.footer(310,795,d.ink,250,{size:10,maxHeight:38});
  }
  function framed(d){
    d.bg=d.ink;d.photo(0,0,600,849,{name:'Full-frame photograph'});
    d.rect(0,0,600,849,'#17232b','Photographic shade');d.parts[d.parts.length-1]=d.parts[d.parts.length-1].replace('fill="#17232b"','fill="#17232b" opacity=".72"');
    d.rect(31,31,538,787,'none','Fine frame',0,'#ffffff',1);
    d.kicker(300,90,'#ffffff',476,{anchor:'middle',size:10});
    d.heading(300,242,70,'#ffffff',476,{anchor:'middle',family:F.serif,maxHeight:190,lh:1.04});
    d.line(265,510,335,510,'#ffffff','Centered separator',1);
    d.body(300,608,'#ffffff',440,{anchor:'middle',size:16,maxHeight:95});
    d.price(300,733,42,'#ffffff',440,{anchor:'middle'});d.footer(300,785,'#ffffff',460,{anchor:'middle',size:10,maxHeight:30});
  }
  function information(d){
    d.kicker(40,58,d.accent,520,{size:10});d.heading(40,147,66,d.ink,520,{maxHeight:145,lh:1.04});
    d.line(40,272,560,272,d.ink,'Information rule',1);
    d.photo(326,310,234,299,{radius:3,name:'Story photograph'});
    d.text('01 / THE IDEA',40,328,11,d.accent,253,{bold:true,name:'Section one'});
    d.text(d.c.tag,40,375,30,d.ink,245,{family:F.serif,name:'Section introduction',maxHeight:110});
    d.text('02 / THE DETAILS',40,502,11,d.accent,253,{bold:true,name:'Section two'});
    d.body(40,545,d.ink,245,{size:14,maxHeight:100});
    d.rect(40,676,520,132,d.c.pop,'Contact panel',3);d.footer(60,721,d.ink,480,{size:13,maxHeight:42});d.price(60,781,32,d.accent,470);
  }
  function layered(d){
    d.rect(0,0,600,300,d.c.pop,'Upper color field');
    d.circle(500,300,78,d.accent,'Accent disc');
    d.photo(208,295,339,291,{radius:3,name:'Layered photograph'});
    d.rect(40,407,188,145,d.bg,'Editorial note card',3);
    d.text(d.c.tag,57,445,19,d.ink,154,{family:F.serif,name:'Editorial note',maxHeight:90});
    d.kicker(40,56,d.ink,520,{size:10});d.heading(40,145,69,d.ink,520,{maxHeight:140,lh:1.03});
    d.body(40,655,d.ink,310,{size:14,maxHeight:94});
    d.price(540,710,40,d.accent,150,{anchor:'end'});
    d.line(40,768,560,768,d.ink,'Footer divider',.7);d.footer(40,808,d.ink,520,{size:10,maxHeight:32});
  }
  function announcement(d){
    d.rect(40,40,6,25,d.accent,'Accent mark');d.kicker(62,57,d.ink,490,{size:10});
    d.heading(40,160,92,d.ink,520,{maxHeight:180,lh:.98});
    d.photo(40,327,520,325,{radius:3,name:'Announcement photograph'});
    if(d.s.price){d.circle(470,618,64,d.bg,'Offer disc');d.price(470,629,35,d.ink,110,{anchor:'middle'});}else d.price(40,713,36,d.accent,250);
    d.body(40,704,d.ink,520,{size:14,maxHeight:66});d.line(40,772,560,772,d.ink,'Contact divider');d.footer(40,810,d.ink,520,{size:11,maxHeight:31});
  }
  function svg(s,look=0){const d=new Draw(s,look),families=[signature,editorial,bento,typographic,dark,graphic,quiet,split,framed,information,layered,announcement];const modern=!['food','music','lost','sale','community','celebration'].includes(s.category);families[modern&&look===0?6:modern&&look===6?0:look](d);return d.finish();}
  function preview(category,look=0){const c=specs[category];return svg({category,headline:c.title,kicker:c.label,subtitle:c.body,footer:c.footer,paper:'a4',price:category==='food'?'2,99':category==='sale'?'25%':'',currency:''},look);}
  function model(look){const layouts=[[[35,40,530,45],[35,110,530,160],[100,310,450,350],[35,710,500,80]],[[30,35,540,60],[30,115,540,145],[30,290,540,362],[30,700,540,100]],[[10,10,580,280],[10,300,280,250],[300,300,290,250],[10,560,580,180],[10,750,580,90]],[[30,50,540,390],[208,500,185,220],[30,770,540,45]],[[35,35,530,40],[35,105,530,160],[165,320,275,310],[35,686,530,50],[35,770,530,50]],[[38,43,524,330],[38,420,524,165],[38,615,524,143],[38,780,524,35]]];return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 849"><rect width="600" height="849" fill="#ffffff"/>${layouts[look%6].map(([x,y,w,h],i)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i%2?'#dadbd7':'#eff0eb'}"/><text x="${x+10}" y="${y+22}" font-family="Arial" font-size="12" fill="#848b7e">${h>220?'PHOTO / ARTWORK':i===0?'HEADLINE':'CONTENT'}</text>`).join('')}</svg>`;}
  function colorsFor(s,look=s.look){
    const c=specs[s.category];
    if(s.usePalette)return palettes[s.palette];
    if(look===1)return[c.bg,c.ink];
    if(look===2)return['#131313','#181818'];
    if(look===3)return['#f4f1e7','#fa3425'];
    if(look===4)return['#101111','#f7f5ee'];
    if(look===5)return['#fbfaf5','#151515'];
    return {food:[c.bg,'#bb7a3f'],music:[c.bg,c.ink],lost:[c.bg,c.ink],community:['#efece3','#1f292b'],sale:['#d8f62e','#191b19'],celebration:['#183a60','#fff4dc']}[s.category]||[c.bg,c.ink];
  }
  return {svg,preview,model,titles,specs,colorsFor};
})();
