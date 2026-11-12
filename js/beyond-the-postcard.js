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
 $("photoDetails").hidden=true;selectedPhoto=null;
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
   fig.append(img,cap);fig.tabIndex=0;fig.setAttribute("role","button");fig.setAttribute("aria-label","View photo details");fig.addEventListener("click",()=>openPhoto(item));fig.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openPhoto(item)}});grid.append(fig);
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

let selectedPhoto=null;
const photoFields=[
 ["title","Title"],["caption","Story or caption"],["alt_text","Accessible description"],
 ["original_filename","Original filename"],["taken_at","Date and time taken"],
 ["country","Country"],["location","Location"],["visit","Visit"],["exhibit","Exhibit"],
 ["camera_make","Camera make"],["camera_model","Camera model"],
 ["lens_model","Lens"],["software","Software"],
 ["aperture","Aperture"],["shutter_speed","Shutter speed"],["iso","ISO"],
 ["focal_length_mm","Focal length (mm)"],
 ["latitude","Latitude"],["longitude","Longitude"],["gps_altitude_m","Altitude (meters)"],
 ["timezone","Timezone"]
];
function albumOptions(){
 const select=$("photoMoveDestination");select.replaceChildren();
 for(const [collection,label] of Object.entries(names)){
  select.add(new Option(label+" (root)",collection+"|"));
  for(const album of albums.filter(a=>a.collection===collection)){
   const parents=[];let current=album,guard=0;
   while(current&&guard++<20){parents.unshift(current.title);current=albums.find(a=>a.id===current.parentId)}
   select.add(new Option(label+" / "+parents.join(" / "),collection+"|"+album.id));
  }
 }
}
async function openPhoto(item){
 selectedPhoto=item.key;
 $("photoDetails").hidden=false;
 $("detailTitle").textContent="Photograph details";
 $("detailImage").src="/api/private-image?key="+encodeURIComponent(item.key);
 $("detailImage").alt="Selected private photograph";
 $("detailStatus").textContent="Loading metadata…";
 $("photoControls").hidden=!owner;
 $("detailInfo").replaceChildren();
 albumOptions();
 const res=await fetch("/api/private-photo-manage?key="+encodeURIComponent(item.key),{cache:"no-store",credentials:"same-origin"});
 if(selectedPhoto!==item.key)return;
 if(!res.ok){$("detailStatus").textContent="Unable to load metadata.";return}
 const data=await res.json(),metadata=data.metadata||{};
 $("detailTitle").textContent=metadata.title||"Photograph details";
 $("detailStatus").textContent="";
 for(const [key,label] of photoFields){
  if(!metadata[key])continue;
  const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=metadata[key];$("detailInfo").append(dt,dd);
 }
 const form=$("photoEditForm");form.replaceChildren();
 if(owner){
  for(const [key,label] of photoFields){
   const labelElement=document.createElement("label");labelElement.textContent=label;labelElement.htmlFor="meta-"+key;
   const input=key==="caption"||key==="alt_text"?document.createElement("textarea"):document.createElement("input");
   input.id="meta-"+key;input.name=key;input.value=metadata[key]||"";
   form.append(labelElement,input);
  }
  const save=document.createElement("button");save.type="submit";save.textContent="Save metadata";form.append(save);
  const keyParts=item.key.split("/");
  if(names[keyParts[1]])$("photoMoveDestination").value=keyParts[1]+"|"+(keyParts.length===4?keyParts[2]:"");  if(match)$("photoMoveDestination").value=match[1]+"|"+(match[2]||"");
 }
 $("photoDetails").scrollIntoView({behavior:"smooth",block:"start"});
}
async function changePhoto(body){
 const res=await fetch("/api/private-photo-manage",{method:"POST",credentials:"same-origin",
  headers:{"content-type":"application/json"},body:JSON.stringify({key:selectedPhoto,...body})});
 const data=await res.json();if(!res.ok)throw Error(data.error||"Photo update failed");return data;
}
$("photoEditForm").addEventListener("submit",async event=>{
 event.preventDefault();if(!owner||!selectedPhoto)return;
 const metadata=Object.fromEntries(new FormData(event.currentTarget).entries());
 $("detailStatus").textContent="Saving metadata…";
 try{const data=await changePhoto({operation:"edit",metadata});
  $("detailStatus").textContent="Metadata saved privately.";
  $("detailTitle").textContent=data.metadata.title||"Photograph details";
  await openPhoto({key:selectedPhoto});
 }catch(e){$("detailStatus").textContent=e.message}
});
$("photoMoveButton").addEventListener("click",async()=>{
 if(!owner||!selectedPhoto)return;
 const [collection,album]=$("photoMoveDestination").value.split("|");
 if(!confirm("Move this photograph to the selected album?"))return;
 try{await changePhoto({operation:"move",collection,album});$("photoDetails").hidden=true;await load()}
 catch(e){$("detailStatus").textContent=e.message}
});
$("photoDeleteButton").addEventListener("click",async()=>{
 if(!owner||!selectedPhoto)return;
 if(!confirm("Permanently delete this private photograph? This cannot be undone."))return;
 try{await changePhoto({operation:"delete",confirm:true});$("photoDetails").hidden=true;await load()}
 catch(e){$("detailStatus").textContent=e.message}
});

(async()=>{
 try{
  const info=await fetch("/api/access/me",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
  owner=Boolean(info.can_manage_site);
  if(owner)$("ownerPanel").hidden=false;
  await loadAlbums();await load();
 }catch{ $("photos").textContent="This collection is temporarily unavailable." }
})();