/* Across the Heights of Europe — shared overview and daily postcard renderer. */
(()=>{'use strict';
// Day 16 times are approximate, supplied by the traveler. Pavillon outbound timing is not known.
const route=[{name:'Skyway arrival',minute:0,m:1300},{name:'Punta Helbronner',minute:43,m:3462},{name:'Pavillon lunch',minute:81,m:2173},{name:'Courmayeur return',minute:185,m:1300}];
function mountain(svg){
 const left=50,right=750,baseline=213;
 const x=minute=>left+(right-left)*minute/185;
 const y=m=>205-(m-1000)/2700*168;
 const p=route.map(v=>({x:x(v.minute),y:y(v.m)}));
 // Smooth monotonic sections: cubic controls remain between endpoints, avoiding invented peaks.
 let d='M'+p[0].x+' '+p[0].y;
 for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=(b.x-a.x)*.38;d+=' C'+(a.x+dx)+' '+a.y+' '+(b.x-dx)+' '+b.y+' '+b.x+' '+b.y;}
 const fill=d+' L'+right+' '+baseline+' L'+left+' '+baseline+' Z';
 const ticks=[{minute:0,label:'11:00 AM'},{minute:43,label:'11:43'},{minute:81,label:'12:21 PM'},{minute:125,label:'1:05'},{minute:185,label:'2:05 PM'}];
 svg.innerHTML='<defs><linearGradient id="elev-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#438fa5" stop-opacity=".3"/><stop offset="100%" stop-color="#438fa5" stop-opacity=".015"/></linearGradient></defs><g stroke="#d8e4e7" stroke-dasharray="3 5"><path d="M48 70H750M48 125H750M48 180H750"/></g><path d="'+fill+'" fill="url(#elev-wash)"/><path d="'+d+'" fill="none" stroke="#438fa5" stroke-width="4" stroke-linecap="round"/><g fill="#617987" font-size="12" font-family="system-ui,sans-serif">'+ticks.map((t,i)=>'<text x="'+x(t.minute)+'" y="243" text-anchor="'+(i===0?'start':i===ticks.length-1?'end':'middle')+'">'+t.label+'</text>').join('')+'<text x="'+p[1].x+'" y="'+(p[1].y-13)+'" text-anchor="middle" fill="#285a70" font-size="14" font-weight="700">Punta Helbronner · 3,462 m</text><text x="'+p[2].x+'" y="'+(p[2].y-12)+'" text-anchor="middle">Pavillon · lunch</text><text x="52" y="198">~1,300 m</text></g>';
}
function empty(svg){svg.innerHTML='<path d="M48 40V212H750" fill="none" stroke="#9fb4bd"/><text x="400" y="122" text-anchor="middle" fill="#6b8290" font-size="16">Elevation profile awaiting verified data</text>';}
const select=document.getElementById('heights-day'),plot=document.getElementById('heights-plot'),caption=document.getElementById('heights-status');
if(select&&plot){const draw=()=>{if(select.value==='16'){mountain(plot);caption.textContent='Day 16 · Skyway Monte Bianco. Approximate times: Skyway 11:00 AM, Punta Helbronner 11:43 AM, Pavillon lunch 12:21 PM, return 2:05 PM. Curve is a landmark-based reconstruction, not a continuous GPS recording; exact travel timing between landmarks is unknown.';}else{empty(plot);caption.textContent=select.value==='all'?'The continuous 24-day elevation profile will appear as verified GPS readings and historical reconstructions are added.':'No verified elevation profile is published for this day yet.';}};select.addEventListener('change',draw);draw();}
const body=document.body;
if(!body.classList.contains('day-page')||document.getElementById('day-heights'))return;
const match=(body.dataset.daySource||'').match(/day-(\d+)\.json/);if(!match)return;
const day=Number(match[1]),anchor=document.getElementById('map-section');if(!anchor)return;
if(!document.querySelector('link[href*="heights.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/css/heights.css?v=draft-2';document.head.appendChild(link);}
const section=document.createElement('section');section.id='day-heights';section.className='heights-section';
section.innerHTML='<div class="heights-panel"><p class="heights-eyebrow">The Long Way Around · Day '+day+'</p><h2 class="heights-heading">The Day in Elevation</h2><p class="heights-intro">'+(day===16?'Skyway Monte Bianco · Courmayeur to Punta Helbronner and back':'The climbs and descents along today\'s journey')+'</p><svg class="heights-chart" viewBox="0 0 800 260" role="img" aria-label="Elevation profile for Day '+day+'"></svg><p class="heights-caption">'+(day===16?'Approximate times provided by the traveler: Skyway 11:00 AM, summit 11:43 AM, Pavillon lunch 12:21 PM, Courmayeur return 2:05 PM. Time of day is proportional along the horizontal axis. The curve between these landmarks is illustrative, not a continuous GPS recording. Station elevations are approximate.':'This day has no verified elevation profile yet. Historical reconstruction is pending.')+'</p></div>';
anchor.insertAdjacentElement('afterend',section);const svg=section.querySelector('svg');if(day===16)mountain(svg);else empty(svg);
})();