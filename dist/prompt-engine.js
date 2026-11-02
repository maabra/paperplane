/* Phrase vocabulary plus local fuzzy matching; no model call or prompt upload. */
const PromptEngine=(()=>{
 const vocabulary={
 food:'bakery|baker|bagels|bagel|bread|croissant|pastry|pastries|cookies|cookie|sourdough|baked goods|patisserie|cake shop|cupcake|donut|doughnut|biscuit|pekara|pecivo|kolaci|kruh|artisan bread|bakery opening|fresh bread|bake sale',
 music:'concert|gig|live music|music festival|band|dj set|rave|jazz night|indie|orchestra|choir|dance party|open mic|tour dates|acoustic|recital|koncert|svirka|festival|techno|hip hop|rock show|live show',
 lost:'missing animal|missing dog|missing cat|lost dog|lost cat|lost pet|lost puppy|missing kitten|found dog|found cat|found animal|lost keys|lost wallet|lost phone|reward for return|last seen|izgubljen pas|izgubljena macka|nestao|missing rabbit|missing bird|missing parrot',
 sale:'discount|sale|clearance|special offer|promotion|flash sale|garage sale|yard sale|car boot sale|half price|percent off|% off|buy one get one|bogo|two for one|black friday|limited offer|popust|snizenje|rasprodaja|new collection|store opening',
 community:'community|neighborhood|meetup|gathering|club|local market|farmers market|book club|social group|potluck|craft fair|community garden|dog training|puppy training|public meeting|neighbourhood|open day|workshop|craft class|knitting club|swap meet',
 celebration:'birthday|wedding|anniversary|baby shower|engagement|graduation party|retirement|christening|celebration|holiday party|christmas party|new year party|halloween|save the date|invitation|rsvp|rodendan|vjenčanje|vencanje|proslava',
 sports:'football match|soccer|basketball|volleyball|tennis|badminton|rugby|tournament|tryouts|team trials|race day|marathon|half marathon|running club|fun run|cycling|swimming|gym challenge|fitness challenge|boxing|sport|sports|utakmica|turnir',
 property:'open house|apartment for rent|flat to rent|house for sale|property listing|room for rent|rental property|office to let|commercial space|real estate|estate agent|bedroom|new home|lease|stan|najam|nekretnina|kuca|for rent|for sale property',
 hiring:'hiring|recruiting|recruitment|job vacancy|help wanted|staff wanted|we are hiring|we re hiring|join our team|career fair|internship|apprenticeship|job opening|employment|vacancies|looking for staff|now hiring|freelance opportunity|trazimo radnika|zaposljavanje|posao',
 wellness:'yoga|pilates|meditation|mindfulness|wellness|spa|massage|salon|barber|hairdresser|hair salon|beauty treatment|skincare|nail studio|self care|retreat|sound bath|breathwork|reiki|facial|manicure|pedicure|frizer|masaza',
 education:'tutoring|tutor|math lesson|language class|english course|online course|coding bootcamp|school|university|lecture|seminar|education|learning|exam preparation|homework help|student event|study group|workshop training|lessons|poduke|tecaj|skola|radionica',
 charity:'charity|fundraiser|fundraising|donation drive|donate|volunteers needed|volunteer|nonprofit|food bank|animal shelter fundraiser|benefit event|sponsored walk|community cleanup|beach cleanup|awareness campaign|donacija|humanitarno|prikupljanje',
 cinema:'film screening|movie night|cinema|film festival|theatre|theater|play|musical|stage performance|auditions|casting call|premiere|short film|documentary|outdoor cinema|kazaliste|kino|predstava|projection',
 art:'art exhibition|exhibition|gallery|gallery opening|open studio|artist talk|art market|illustration|graphic design|portfolio|photography exhibition|sculpture|painting|ceramics|printmaking|design fair|creative studio|izlozba|galerija|umjetnost',
 travel:'travel|guided tour|walking tour|weekend trip|camping|summer camp|hiking|mountain hike|outdoor adventure|beach holiday|group trip|excursion|city break|destination|backpacking|retreat trip|izlet|putovanje|planinarenje',
 services:'plumber|plumbing|electrician|handyman|cleaning service|house cleaning|window cleaning|gardener|landscaping|mechanic|repair service|car wash|dog grooming|pet grooming|dog walker|childcare|babysitter|moving service|tailor|popravak|ciscenje|vodoinstalater',
 notice:'opening hours|business hours|holiday hours|closed today|temporary closure|public notice|announcement|safety notice|warning|rules|instructions|weekly schedule|no parking|road closed|maintenance|important update|obavijest|radno vrijeme|zatvoreno',
 menu:'menu|drinks menu|cocktail menu|wine list|lunch menu|dinner menu|breakfast menu|brunch|happy hour|tasting menu|daily special|cafe|coffee shop|restaurant|pizza night|takeaway menu|delivery menu|food truck|jelovnik|dnevni meni|rucak'
 };
 const norm=s=>TextLayout.clean(s,1500).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9%]+/g,' ').trim();
 const terms=Object.fromEntries(Object.entries(vocabulary).map(([k,v])=>[k,v.split('|').map(norm)]));
 function distance(a,b){if(Math.abs(a.length-b.length)>1)return 2;if(a.length===b.length){const bad=[...a].map((ch,i)=>ch!==b[i]?i:-1).filter(i=>i>=0);if(bad.length===2&&bad[1]===bad[0]+1&&a[bad[0]]===b[bad[1]]&&a[bad[1]]===b[bad[0]])return 1;}let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]!==b[j])));row=next;}return row[b.length];}
 function rank(input){const t=norm(input),tokens=t.split(' ').filter(Boolean),set=new Set(tokens),singular=w=>w.endsWith('ies')?w.slice(0,-3)+'y':w.length>3&&w.endsWith('s')?w.slice(0,-1):w;
   return categories.map(c=>{let score=0;const matches=[];for(const phrase of new Set([...(terms[c.id]||[]),...c.keywords.map(norm)])){
     const multi=phrase.includes(' ');let weight=multi?7:3;const exact=multi?(' '+t+' ').includes(' '+phrase+' '):set.has(phrase)||tokens.some(w=>singular(w)===singular(phrase));
     if(exact){if(/hiring|recruit|fundrais|missing|lost dog|lost cat|opening hours|closed today/.test(phrase))weight+=9;score+=weight;matches.push(phrase);}
     else if(!multi&&phrase.length>=5&&tokens.some(w=>w.length>=5&&distance(w,phrase)===1)){score+=1.5;matches.push(phrase+' (similar spelling)');}
   }
   if(c.id==='lost'&&!/\b(missing|lost|found|izgubljen|izgubljena|nestao|last seen)\b/.test(t))score*=.1;
   if(c.id==='hiring'&&/\b(hiring|recruiting|staff wanted|help wanted|job vacancy)\b/.test(t))score+=15;
   if(c.id==='services'&&/dog grooming|pet grooming|dog walker/.test(t))score+=12;
   if(c.id==='community'&&/dog training|puppy training/.test(t))score+=12;
   return{c,score,matches:matches.slice(0,5)};
   }).sort((a,b)=>b.score-a.score);
 }
 function extract(input){const text=TextLayout.clean(input,1500);const result={text};const price=text.match(/(?:new\s*price|now|only|nova\s*cijena)\s*(?:is\s*)?[:=]?\s*([€$£])?\s*(\d+(?:[,.]\d{1,2})?)/i)||text.match(/(?:cijena|price\s*(?:is|:|=)?)\s*[:=]?\s*([€$£])?\s*(\d+(?:[,.]\d{1,2})?)/i)||text.match(/([€$£])\s*(\d+(?:[,.]\d{1,2})?)/);if(price&&!/^\s*%/.test(text.slice(price.index+price[0].length))){result.price=price[2];result.currency=price[1]||'';}else if(!price){const n=text.match(/\b\d+[,.]\d{2}\b/);if(n&&!/^\d{1,2}\.0?[1-9]$|^\d{1,2}\.1[0-2]$/.test(n[0]))result.price=n[0];}
   if(/€|\beur\b|euro/i.test(text))result.currency='€';else if(/\$|\busd\b/i.test(text))result.currency='$';else if(/£|\bgbp\b/i.test(text))result.currency='£';
   result.discount=text.match(/\b\d{1,2}\s*%/)?.[0]||'';
   result.email=text.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i)?.[0]||'';
   result.phone=text.match(/\+\d{8,15}\b|\+\d{1,3}[ .-]+(?:\(?\d{1,4}\)?[ .-]+){1,3}\d{3,4}|(?:\(\d{2,4}\)|0\d{1,3})[ .-]+\d{2,4}[ .-]+\d{2,5}(?:[ .-]+\d{2,4})?/)?.[0]||'';
   if(!result.phone){const phone=text.match(/(?:phone|call|tel|contact|mobitel)\s*:\s*([+\d() .-]{8,30})/i)?.[1]?.trim();if(phone&&phone.replace(/\D/g,'').length>=8&&phone.replace(/\D/g,'').length<=15)result.phone=phone;}
   result.website=text.match(/(?:https?:\/\/|www\.)[a-z0-9.-]+(?:\/[a-z0-9/?=_-]*)?/i)?.[0]||'';
   result.date=text.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+\d{1,2})?\b|\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i)?.[0]||'';
   result.venue=text.match(/(?:venue|location|address|mjesto)\s*:\s*([^,\n]{2,80})/i)?.[1]?.trim()||text.match(/\bat\s+([A-Z][\p{L}\d '&-]{2,60})(?:[,\n.]|$)/u)?.[1]?.trim()||'';
   result.title=text.match(/(?:title|headline|naslov)\s*:\s*["“]?([^\n”"]{2,120})/i)?.[1]?.trim()||'';
   return result;
 }
 function suggestions(text){const ranked=rank(text);return ranked.filter(r=>r.score>0).slice(0,4).map(r=>({id:r.c.id,label:r.c.name,detail:r.matches.slice(0,2).join(' · ')}));}
 return{rank,extract,suggestions,clean:s=>TextLayout.clean(s,1500),terms,count:Object.values(terms).reduce((n,a)=>n+a.length,0)};
})();
