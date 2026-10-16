/* CMS-managed homepage adventure cover photographs. */
(async function(){
 try {
  const response=await fetch('/data/homepage.json',{cache:'no-cache'});
  if(!response.ok)return;
  const data=await response.json();
  const covers=data.covers||{};
  for(const [slug,raw] of Object.entries(covers)){
   if(typeof raw!=='string'||!raw.trim())continue;
   const photo=document.querySelector('.redesign-trip-card[href="/trips/'+slug+'/\"] .redesign-trip-thumb');
   if(!photo)continue;
   const url=raw.trim();
   if(!/^(https?:\/\/|\/)/i.test(url))continue;
   photo.style.backgroundImage='url('+JSON.stringify(url)+')';
  }
 }catch(error){console.warn('Adventure covers could not load',error)}
})();
