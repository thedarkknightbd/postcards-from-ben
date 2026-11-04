(async function(){
const root=document.getElementById("day-elevation");if(!root)return;
root.innerHTML='<h2>Elevation Profile</h2><p>Loading recorded elevations…</p>';
try{
const response=await fetch("/api/elevation?day=17");
if(!response.ok)throw Error("Unavailable");
const data=await response.json(),points=data.points||[];
if(!points.length){root.querySelector("p").textContent=data.status==="recording"?"Recording today. Chart available after midnight (CET).":"No elevation data available.";return;}
const min=Math.min(...points.map(p=>p.meters)),max=Math.max(...points.map(p=>p.meters));
const W=1000,H=360,L=75,R=30,T=30,B=65,ceil=Math.ceil((max+100)/200)*200;
const x=m=>L+(W-L-R)*m/1440,y=v=>T+(H-T-B)*(1-v/ceil);
const path=points.map((p,i)=>(i?"L":"M")+x(p.minute).toFixed(1)+" "+y(p.meters).toFixed(1)).join(" ");
const ticks=Array.from({length:25},(_,h)=>'<text x="'+x(h*60)+'" y="325" text-anchor="middle" font-size="12" fill="#20364a">'+(h%12||12)+(h<12?" AM":" PM")+'</text>').join("");
const axis='<path d="M75 30V295H970" fill="none" stroke="#20364a"/>';
const marks=[["Highest",max],["Lowest",min]].map(([label,val])=>{const p=points.find(p=>p.meters===val);return '<circle cx="'+x(p.minute)+'" cy="'+y(val)+'" r="6" fill="#164b82" stroke="white" stroke-width="2"/><text x="'+x(p.minute)+'" y="'+Math.max(18,y(val)-15)+'" text-anchor="middle" fill="#164b82" font-size="15" font-weight="bold">'+label+': '+val.toLocaleString()+' m</text>';}).join("");
root.innerHTML='<div class="elevation-postcard"><p class="section-kicker">DAY 17 · RECORDED ELEVATION</p><h2>Elevation Profile</h2><p>Courmayeur to Strasbourg</p><div class="elevation-stats"><div>Start<strong>'+points[0].meters+' m</strong></div><div>Highest<strong>'+max+' m</strong></div><div>Lowest<strong>'+min+' m</strong></div></div><svg viewBox="0 0 1000 360" role="img" aria-label="Elevation over time"><path d="'+path+' L'+x(points.at(-1).minute)+' 295 L'+x(points[0].minute)+' 295 Z" fill="#c9dff2" opacity=".65"/>'+axis+'<path d="'+path+'" fill="none" stroke="#164b82" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+ticks+marks+'</svg><p class="elevation-footnote">Local time (CET) · Five-minute GPS averages · Recorded elevation, subject to GPS accuracy.</p></div>';
}catch(e){root.innerHTML='<h2>Elevation Profile</h2><p>Elevation data temporarily unavailable.</p>';}
})();