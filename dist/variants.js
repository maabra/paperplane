/* Curated category imagery, color stories, and plain-language starting copy. */
const PosterVariants={
 apply(){
  const stories={
   sports:['#f7f6f1','#17242a','#df5b35','#e4ebe7','Bring your team. Find your rhythm.\nCome along and be part of the action.'],
   property:['#f5f1e8','#31463d','#9d664e','#e6e4d7','Thoughtfully chosen spaces for what comes next.\nGet in touch to arrange a viewing.'],
   hiring:['#f6f5ef','#253449','#476ca9','#e3eaf1','Good people make good work.\nBring your skills. We’d love to hear from you.'],
   wellness:['#f3f0e7','#43534c','#9a7868','#dce4d9','Make a little space for yourself.\nA moment to pause, breathe, and begin again.'],
   education:['#f6f2e9','#253c4a','#b36c3f','#e2e9e8','A new skill opens a new door.\nTake the next step at your own pace.'],
   charity:['#f7f3e8','#384b46','#a9674f','#e4e8d8','Give your time. Share what you can.\nEvery little act of kindness can make a difference.'],
   cinema:['#f2eee7','#282c3a','#a65e4b','#e7ddcf','Take your seat for a story worth seeing.\nAn experience to share, a story to remember.'],
   art:['#f3efe8','#302e35','#8c675a','#e5ded5','A fresh perspective, in good company.\nCome curious. Leave inspired.'],
   travel:['#f3f1e7','#284a50','#b16f42','#dce8e1','Leave a little room for discovery.\nNew places, fresh perspectives, good company.'],
   services:['#f6f4ee','#293e4c','#b37b40','#e0e7e9','Reliable help from someone nearby.\nGet in touch to discuss what you need.'],
   notice:['#faf9f5','#293c48','#4d6d83','#e7edf0','An important update for our community.\nThank you for taking a moment to read.'],
   menu:['#f7f0e5','#4c4638','#a36843','#e9dfcd','Something delicious, made for your day.\nTake a seat and find a new favorite.']
  };
  for(const c of POSTER_CATALOG){const v=stories[c.id],spec=PosterDesign.specs[c.id];Object.assign(spec,{bg:v[0],ink:v[1],accent:v[2],pop:v[3],photo:POSTER_PHOTOS[c.id]?c.id:null,body:v[4]});c.sub=v[4];}
 }
};
