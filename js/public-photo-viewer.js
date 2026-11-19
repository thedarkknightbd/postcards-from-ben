// Consistent, keyboard-accessible viewer for publicly published gallery images.
const viewer=document.createElement("dialog");
viewer.className="postcards-public-viewer";
viewer.setAttribute("aria-label","Travel photo viewer");
viewer.innerHTML='<div class="viewer-top"><span class="viewer-count"></span><button type="button" class="viewer-close" aria-label="Close viewer">Close ×</button></div><div class="viewer-stage"><button type="button" class="viewer-prev" aria-label="Previous photo">‹</button><img alt=""><button type="button" class="viewer-next" aria-label="Next photo">›</button></div><div class="viewer-bottom"><p class="viewer-caption"></p><p class="viewer-description"></p><a class="viewer-original" target="_blank" rel="noopener noreferrer">View original ↗</a></div>';
document.body.append(viewer);
const css=document.createElement("style");
css.textContent=`
.postcards-public-viewer{width:min(1100px,96vw);max-width:96vw;max-height:96vh;padding:14px;border:0;border-radius:16px;background:#102841;color:#fff;box-shadow:0 20px 70px #0008}
.postcards-public-viewer::backdrop{background:rgba(4,15,29,.88)}
.postcards-public-viewer .viewer-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.postcards-public-viewer button{border:1px solid #67829a;color:white;background:#234764;border-radius:9px;padding:8px 12px;cursor:pointer}
.postcards-public-viewer .viewer-stage{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:7px}
.postcards-public-viewer .viewer-stage button{font-size:2rem}
.postcards-public-viewer .viewer-stage button:disabled{opacity:.3;cursor:default}
.postcards-public-viewer img{max-height:72vh;max-width:100%;display:block;margin:auto;object-fit:contain}
.postcards-public-viewer .viewer-bottom{text-align:center}
.postcards-public-viewer .viewer-caption{margin:10px 0 3px;font-weight:600}
.postcards-public-viewer .viewer-description{margin:3px 0 12px;color:#d7e7f4}
.postcards-public-viewer .viewer-bottom p:empty{display:none}
.postcards-public-viewer .viewer-original{display:inline-block;padding:8px 14px;border:1px solid #89b9d7;border-radius:9px;color:white;text-decoration:none;background:#294e70}
@media(max-width:600px){.postcards-public-viewer .viewer-stage{grid-template-columns:30px minmax(0,1fr) 30px;gap:3px}.postcards-public-viewer .viewer-stage button{font-size:1.5rem;padding:7px 0}.postcards-public-viewer img{max-height:63vh}}
`;
document.head.append(css);
let photos=[],index=0,previousFocus=null,startX=null;
const $=selector=>viewer.querySelector(selector);
function show(){
 const photo=photos[index];if(!photo)return;
 $("img").src=photo.src||photo.url||photo.file;
 $("img").alt=photo.alt||photo.description||photo.caption||"Travel photograph";
 $(".viewer-original").href=photo.src||photo.url||photo.file;
 $(".viewer-count").textContent=(index+1)+" of "+photos.length;
 $(".viewer-caption").textContent=photo.caption||"";
 const desc=String(photo.description||"").trim();
 $(".viewer-description").textContent=desc && desc!==photo.caption?desc:"";
 $(".viewer-prev").disabled=index===0;
 $(".viewer-next").disabled=index===photos.length-1;
}
const move=direction=>{const next=index+direction;if(next>=0&&next<photos.length){index=next;show()}};
$(".viewer-prev").addEventListener("click",()=>move(-1));
$(".viewer-next").addEventListener("click",()=>move(1));
$(".viewer-close").addEventListener("click",()=>viewer.close());
viewer.addEventListener("click",event=>{if(event.target===viewer)viewer.close()});
viewer.addEventListener("keydown",event=>{
 if(event.key==="ArrowLeft"){event.preventDefault();move(-1)}
 if(event.key==="ArrowRight"){event.preventDefault();move(1)}
});
$("img").addEventListener("touchstart",event=>{startX=event.touches.length===1?event.touches[0].clientX:null},{passive:true});
$("img").addEventListener("touchend",event=>{if(startX==null)return;const delta=event.changedTouches[0].clientX-startX;startX=null;if(Math.abs(delta)>50)move(delta>0?-1:1)},{passive:true});
viewer.addEventListener("close",()=>{photos=[];$("img").removeAttribute("src");previousFocus?.focus?.()});
window.PostcardsPhotoViewer={open(items,selected=0){
 if(!Array.isArray(items)||!items.length)return;
 photos=items;index=Math.max(0,Math.min(items.length-1,selected));
 previousFocus=document.activeElement;
 if(!viewer.open)viewer.showModal();
 show();
}};
