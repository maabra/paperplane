/* Shared measured line wrapping for initial designs and every subsequent edit. */
const TextLayout=(()=>{
 const context=document.createElement('canvas').getContext('2d');
 function clean(value,max=2000,trim=true){const text=String(value??'').normalize('NFKC').replace(/<\s*(script|style|iframe)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,'').replace(/<!--[^]*?-->/g,'').replace(/<\/?[a-z][^>]*>/gi,'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\r\n?/g,'\n').replace(/[ \t]+/g,' ').slice(0,max);return trim?text.trim():text;}
 function fit(value,options={}){
   const text=clean(value),width=Math.max(8,options.width||500),height=Math.max(8,options.height||120),max=Math.max(4,options.fontSize||40),family=options.family||'Arial, sans-serif',weight=options.weight||'400',italic=options.italic?'italic ':'',tracking=Number(options.tracking)||0,lineHeight=options.lineHeight||1.12;
   function at(size){context.font=`${italic}${weight} ${size}px ${family}`;const measure=s=>context.measureText(s).width+Math.max(0,s.length-1)*tracking;
     const lines=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){
       let pieces=[word];if(measure(word)>width){pieces=[];let part='';for(const ch of [...word]){if(part&&measure(part+ch)>width){pieces.push(part);part=ch;}else part+=ch;}if(part)pieces.push(part);}
       for(let i=0;i<pieces.length;i++){const token=pieces[i];if(line&&measure(line+' '+token)>width){lines.push(line);line=token;}else line+=(line?' ':'')+token;if(i<pieces.length-1){lines.push(line);line='';}}
     }lines.push(line);}return{lines,size,width:Math.max(0,...lines.map(measure)),height:size*(1+(lines.length-1)*lineHeight)};
   }
   context.font=`${italic}${weight} ${max}px ${family}`;let upper=max;
   for(const word of text.split(/\s+/).filter(Boolean))if(word.length<=24){const w=context.measureText(word).width+Math.max(0,word.length-1)*tracking;if(w>width)upper=Math.min(upper,max*width/w);}
   let low=4,high=Math.max(4,upper),best=at(low);for(let i=0;i<16;i++){const mid=(low+high)/2,result=at(mid);if(result.width<=width+.01&&result.height<=height+.01){best=result;low=mid;}else high=mid;}return{...best,lineHeight};
 }
 function refit(root,value){
   const text=root.querySelector('text');if(!text)return;
   const binding=text.getAttribute('data-binding');
   const x=Number(text.getAttribute('x'))||0,y=Number(text.getAttribute('y'))||0,original=Number(text.getAttribute('data-font-max'))||Number(text.getAttribute('font-size'))||20;
   const width=Number(text.getAttribute('data-text-width'))||({headline:500,kicker:510,subtitle:490,footer:510,price:240}[binding])||Math.max(100,Math.min(500,600-x-32));
   const height=Number(text.getAttribute('data-text-height'))||({headline:170,kicker:40,subtitle:92,footer:55,price:85}[binding])||130;
   const top=Number(text.getAttribute('data-text-top')??(y-original*.8));
   const content=clean(value===undefined?(text.getAttribute('data-text-value')??([...text.querySelectorAll('tspan')].map(t=>t.textContent).join('\n')||text.textContent)):value);
   const result=fit(content,{width,height,fontSize:original,family:text.getAttribute('font-family'),weight:text.getAttribute('font-weight'),italic:text.getAttribute('font-style')==='italic',tracking:text.getAttribute('letter-spacing'),lineHeight:Number(text.getAttribute('data-line-height'))||1.12});
   text.setAttribute('data-text-value',content);text.setAttribute('data-text-width',width);text.setAttribute('data-text-height',height);text.setAttribute('data-font-max',original);text.setAttribute('data-text-top',top);text.setAttribute('font-size',result.size.toFixed(3));text.setAttribute('y',(top+result.size*.8).toFixed(3));text.replaceChildren();
   result.lines.forEach((line,i)=>{const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');span.setAttribute('x',x);span.setAttribute('dy',i?(result.size*result.lineHeight).toFixed(3):0);span.textContent=line;text.append(span);});
 }
 return{fit,refit,clean};
})();
