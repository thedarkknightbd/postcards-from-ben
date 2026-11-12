const names={"special-moments":"Special Moments","bethel-visits":"Bethel Visits","friends-along-the-way":"Friends Along the Way"};
let selected="special-moments",currentAlbum="",albums=[],owner=false;
const $=id=>document.getElementById(id);
const parentOf=id=>albums.find(a=>a.id===id&&a.collection===selected);
function albumName(id){return parentOf(id)?.title||names[selected]}
function renderBreadcrumb(){
 const nav=$("albumTrail");nav.replaceChildren();
 const ids=[];let id=currentAlbum;let depth=0;
 while(id&&depth++<12){const album=parentOf(id);if(!album)break;ids.unshift(album);id=album.parentId}
 const root=document.createElement("button");root.type="button";root.textContent=names[selected];
 root.onclick=()=>{currentAlbum="";load()};nav.append(root);
 for(const album of ids){const span=document.createElement("span");span.textContent=" / ";
 const button=document.createElement("button");button.type="button";button.textContent=album.title;
 button.onclick=()=>{currentAlbum=album.id;load()};nav.append(span,button)}
}
function renderSubalbums(){
 const container=$("subalbums");container.replaceChildren();
 const children=albums.filter(a=>a.collection===selected&&a.parentId===currentAlbum);
 for(const album of children){const b=document.createElement("button");b.type="button";b.className="album-tile";
 const title=document.createElement("strong");title.textContent=album.title;
 const caption=document.createElement("span");caption.textContent="Explore album";
 b.append(title,caption);b.onclick=()=>{currentAlbum=album.id;load()};container.append(b)}
 container.hidden=!children.length;
}
async function loadAlbums(){
 const response=await fetch("/api/private-albums",{credentials:"same-origin",cache:"no-store"});
 if(!response.ok)throw Error("Private album list unavailable");
 const data=await response.json();albums=data.albums||[];
}
async function load(){
 $("albumTitle").textContent=albumName(currentAlbum);
 $("count").textContent="";
 renderBreadcrumb();renderSubalbums();
 $("newAlbumParent").textContent=currentAlbum?"Inside "+albumName(currentAlbum):"Inside "+names[selected];
 const grid=$("photos");grid.replaceChildren();
 const qs=new URLSearchParams({collection:selected});if(currentAlbum)qs.set("album",currentAlbum);
 try{
  const res=await fetch("/api/private-photos?"+qs,{cache:"no-store",credentials:"same-origin"});
  if(!res.ok)throw Error("This gallery is unavailable");
  const data=await res.json();
  $("count").textContent=data.items.length+" photographs";
  if(!data.items.length){
    const p=document.createElement("p");p.className="gallery-empty";
    p.textContent="No photographs at this level yet. Choose an album above or add photographs.";
    grid.append(p);return;
  }
  for(const item of data.items){
   const fig=document.createElement("figure"),img=document.createElement("img"),cap=document.createElement("figcaption");
   img.src="/api/private-image?key="+encodeURIComponent(item.key);
   img.loading="lazy";img.alt="Private travel photograph";img.referrerPolicy="no-referrer";
   cap.textContent=item.uploaded?new Date(item.uploaded).toLocaleDateString():"Private photograph";
   fig.append(img,cap);grid.append(fig);
  }
 }catch(err){const p=document.createElement("p");p.className="gallery-empty";p.textContent=err.message;grid.append(p)}
}
document.querySelectorAll("[data-collection]").forEach(button=>button.addEventListener("click",()=>{
 selected=button.dataset.collection;currentAlbum="";
 document.querySelectorAll("[data-collection]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
 $("collection").value=selected;load();
}));
$("albumForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!owner)return;
 const button=$("createAlbumButton"),msg=$("albumStatus");button.disabled=true;msg.textContent="Creating album…";
 try {
  const res=await fetch("/api/private-albums",{method:"POST",credentials:"same-origin",
    headers:{"content-type":"application/json"},body:JSON.stringify({collection:selected,parentId:currentAlbum,title:$("albumName").value})});
  const data=await res.json();if(!res.ok)throw Error(data.error||"Cannot create album");
  $("albumName").value="";await loadAlbums();msg.textContent="Album created.";await load();
 }catch(err){msg.textContent=err.message}finally{button.disabled=false}
});
$("uploadForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!owner)return;
 const uploadForm=e.currentTarget;
 const button=$("uploadButton"),status=$("status");button.disabled=true;status.textContent="Uploading…";
 try{
  const form=new FormData(uploadForm);
  form.set("collection",selected);form.set("album",currentAlbum);
  const response=await fetch("/api/private-photos",{method:"POST",credentials:"same-origin",body:form});
  const data=await response.json();if(!response.ok)throw Error(data.error||"Upload failed");
  status.textContent="Photograph added privately.";uploadForm.reset();await load();
 }catch(err){status.textContent=err.message}finally{button.disabled=false}
});
(async()=>{
 try{
  const info=await fetch("/api/access/me",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
  owner=Boolean(info.can_manage_site);
  if(owner)$("ownerPanel").hidden=false;
  await loadAlbums();await load();
 }catch{ $("photos").textContent="This collection is temporarily unavailable." }
})();