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
 for(const album of children){const b=document.createElement("div");b.className="album-tile";
 const open=document.createElement("button");open.className="album-open";open.type="button";
 const title=document.createElement("strong");title.textContent=album.title;
 const caption=document.createElement("span");caption.textContent="Explore album";
 open.append(title,caption);open.onclick=()=>{currentAlbum=album.id;load()};
 b.append(open);
 if(owner){const manage=document.createElement("button");manage.type="button";manage.className="album-manage";
 manage.textContent="Manage folder";manage.onclick=()=>showFolderManager(album);
 b.append(manage)}
 container.append(b)}
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
 $("folderManager").hidden=true;selectedKeys.clear();shownKeys=[];refreshBulkUI();
 const grid=$("photos");grid.replaceChildren();
 const qs=new URLSearchParams({collection:selected});if(currentAlbum)qs.set("album",currentAlbum);
 try{
  const res=await fetch("/api/private-photos?"+qs,{cache:"no-store",credentials:"same-origin"});
  if(!res.ok)throw Error("This gallery is unavailable");
  const data=await res.json();
  shownKeys=data.items.map(item=>item.key);refreshBulkUI();
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
   fig.append(img,cap);fig.tabIndex=0;fig.setAttribute("role","button");fig.setAttribute("aria-label","View photo details");fig.addEventListener("click",()=>openPhoto(item));fig.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openPhoto(item)}});
   if(owner){const label=document.createElement("label");label.className="photo-check";const check=document.createElement("input");
    check.type="checkbox";check.checked=selectedKeys.has(item.key);check.addEventListener("click",event=>event.stopPropagation());
    check.onchange=()=>{check.checked?selectedKeys.add(item.key):selectedKeys.delete(item.key);refreshBulkUI()};
    label.addEventListener("click",event=>event.stopPropagation());label.append(check,document.createTextNode("Select photo"));fig.append(label)}
   grid.append(fig);
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
 const button=$("uploadButton"),status=$("status"),failureBox=$("uploadFailures");
 const input=$("photo"),files=Array.from(input.files||[]);
 const destinationCollection=selected,destinationAlbum=currentAlbum;
 if(!files.length){status.textContent="Choose one or more photographs first.";return}
 if(files.length>50){status.textContent="Please select up to 50 photographs per batch.";return}
 const validTypes=new Set(["image/jpeg","image/png","image/webp","image/avif"]);
 button.disabled=true;input.disabled=true;failureBox.replaceChildren();
 let uploaded=0,failed=0;
 const failures=[];
 for(let i=0;i<files.length;i++){
  const file=files[i];
  status.textContent="Uploading "+(i+1)+" of "+files.length+" · "+uploaded+" completed · "+failed+" failed";
  if(!validTypes.has(file.type)||file.size<1||file.size>12*1024*1024){
   failed++;failures.push(file.name+": unsupported format or over 12 MB");continue;
  }
  try{
   const body=new FormData();
   body.set("collection",destinationCollection);
   body.set("album",destinationAlbum);
   body.set("file",file,file.name);
   const response=await fetch("/api/private-photos",{method:"POST",credentials:"same-origin",body});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Upload failed");
   uploaded++;
  }catch(err){
   failed++;failures.push(file.name+": "+(err?.message||"Upload failed"));
  }
 }
 // Never retry completed files automatically; a second batch should be a deliberate selection.
 input.disabled=false;button.disabled=false;uploadForm.reset();
 for(const message of failures){const line=document.createElement("p");line.textContent=message;failureBox.append(line)}
 status.textContent=uploaded+" of "+files.length+" uploaded to "+albumName(destinationAlbum)+
   (failed?" · "+failed+" failed. Review the filenames below.":" · Complete.");
 if(destinationCollection===selected&&destinationAlbum===currentAlbum)await load();
});

let managedAlbum=null,shownKeys=[],selectedKeys=new Set();
function fillDestinations(select,collectionOnly=false,excludeId=""){
 select.replaceChildren();
 for(const [collection,label] of Object.entries(names)){
  if(collectionOnly&&collection!==selected)continue;
  select.add(new Option(label+" (root)",collection+"|"));
  for(const album of albums.filter(a=>a.collection===collection)){
   if(excludeId&&album.id===excludeId)continue;
   const path=[];let cursor=album,guard=0;
   while(cursor&&guard++<100){path.unshift(cursor.title);cursor=albums.find(a=>a.id===cursor.parentId)}
   select.add(new Option(label+" / "+path.join(" / "),collection+"|"+album.id));
  }
 }
}
function showFolderManager(album){
 if(!owner)return;
 managedAlbum=album;
 $("folderManager").hidden=false;$("folderManagerTitle").textContent="Manage folder: "+album.title;
 $("renameAlbum").value=album.title;$("albumManagerStatus").textContent="";
 fillDestinations($("moveAlbumParent"),true,album.id);
 $("moveAlbumParent").value=selected+"|"+album.parentId;
 $("folderManager").scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function updateFolder(payload){
 if(!owner||!managedAlbum)return;
 $("albumManagerStatus").textContent="Saving folder changes…";
 try{
  const res=await fetch("/api/private-albums",{method:"PATCH",credentials:"same-origin",
   headers:{"content-type":"application/json"},body:JSON.stringify({id:managedAlbum.id,...payload})});
  const data=await res.json();if(!res.ok)throw Error(data.error||"Folder update failed");
  await loadAlbums();await load();$("albumStatus").textContent="Folder updated.";
 }catch(err){$("albumManagerStatus").textContent=err.message}
}
$("renameAlbumButton").onclick=()=>{
 const title=$("renameAlbum").value.trim();if(!title)return;
 updateFolder({operation:"rename",title})
};
$("moveAlbumButton").onclick=()=>{
 const [collection,parentId]=$("moveAlbumParent").value.split("|");
 if(collection!==selected)return;
 if(!confirm("Move this folder and its subfolders to the selected location?"))return;
 updateFolder({operation:"move",parentId})
};
$("deleteAlbumButton").onclick=()=>{
 if(!confirm("Delete this folder? It must have no photographs or subfolders. This cannot be undone."))return;
 updateFolder({operation:"delete",confirm:true})
};
$("closeAlbumManager").onclick=()=>{$("folderManager").hidden=true;managedAlbum=null};
function refreshBulkUI(){
 $("bulkToolbar").hidden=!owner||!shownKeys.length;
 $("bulkCount").textContent=selectedKeys.size+" selected of "+shownKeys.length+" photographs";
 $("applyBulkMetadata").disabled=!selectedKeys.size;
 $("applyBulkMove").disabled=!selectedKeys.size;
}
$("selectAllPhotos").onclick=()=>{shownKeys.forEach(k=>selectedKeys.add(k));document.querySelectorAll(".photo-check input").forEach(ch=>ch.checked=true);refreshBulkUI()};
$("clearPhotoSelection").onclick=()=>{selectedKeys.clear();document.querySelectorAll(".photo-check input").forEach(ch=>ch.checked=false);refreshBulkUI()};
async function bulkAction(operation){
 if(!owner||!selectedKeys.size)return;
 const keys=[...selectedKeys];
 const data=operation==="edit"?Object.fromEntries(["country","visit","exhibit","location"].map(field=>[field,$("bulk"+field[0].toUpperCase()+field.slice(1)).value.trim()]).filter(([,value])=>value)):{};
 if(operation==="edit"&&!Object.keys(data).length){$("bulkStatus").textContent="Fill at least one field.";return}
 const [collection,album]=$("bulkDestination").value.split("|");
 if(!confirm((operation==="move"?"Move ":"Update ")+keys.length+" selected photographs? Existing individual captions and camera details will remain unchanged."))return;
 let completed=0,failed=0;
 for(const key of keys){
  try{
   const body={key,operation,...(operation==="edit"?{metadata:data}:{collection,album})};
   const res=await fetch("/api/private-photo-manage",{method:"POST",credentials:"same-origin",
    headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   if(!res.ok)throw Error((await res.json()).error||"Update failed");
   completed++;
  }catch{failed++}
  $("bulkStatus").textContent=completed+" completed, "+failed+" failed of "+keys.length;
 }
 if(operation==="move"||completed&&!failed)await load();
 $("bulkStatus").textContent=completed+" completed, "+failed+" failed. Review the gallery before repeating any operation.";
}
$("applyBulkMetadata").onclick=()=>bulkAction("edit");
$("applyBulkMove").onclick=()=>bulkAction("move");

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
// ISO 3166-1 alpha-2 choices, displayed as country names in Safari's locale.
const countryCodes="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
function addCountrySelector(form, currentValue){
 const selector=document.createElement("select");
 selector.id="meta-country";selector.name="country";selector.setAttribute("aria-label","Country");
 selector.add(new Option("Select country",""));
 const display=typeof Intl.DisplayNames==="function"?new Intl.DisplayNames(["en"],{type:"region"}):null;
 const countries=countryCodes.map(code=>({code,name:display?.of(code)||code}))
   .sort((a,b)=>a.name.localeCompare(b.name,"en"));
 for(const country of countries)selector.add(new Option(country.name,country.name));
 selector.add(new Option("Other — enter country name","__custom__"));
 const current=String(currentValue||"").trim();
 if(current){
  let option=[...selector.options].find(o=>o.value.toLocaleLowerCase("en")===current.toLocaleLowerCase("en")||o.text===current);
  if(!option){
   const fromCode=[...selector.options].find(o=>o.value===display?.of(current.toUpperCase()));
   option=fromCode;
  }
  if(!option){option=new Option(current+" (saved value)",current);selector.add(option)}
  selector.value=option.value;
 }
 form.append(selector);
 const custom=document.createElement("input");custom.type="text";custom.id="meta-country-custom";
 custom.placeholder="Enter country or territory";custom.maxLength=100;
 custom.setAttribute("aria-label","Custom country or territory");
 custom.hidden=true;form.append(custom);
 const toggle=()=>{custom.hidden=selector.value!=="__custom__";custom.required=!custom.hidden};
 selector.addEventListener("change",toggle);toggle();
}
const readonlyFields=[["file_size_bytes","File size (bytes)"],["mime_type","File type"],["uploaded_at","Uploaded at"],["pixel_width","Width (pixels)"],["pixel_height","Height (pixels)"]];
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
 for(const [key,label] of [...photoFields,...readonlyFields]){
  if(metadata[key]===null||metadata[key]===undefined||metadata[key]==="")continue;
  const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=metadata[key];$("detailInfo").append(dt,dd);
 }
 const form=$("photoEditForm");form.replaceChildren();
 if(owner){
  for(const [key,label] of photoFields){
   const labelElement=document.createElement("label");labelElement.textContent=label;labelElement.htmlFor="meta-"+key;
   form.append(labelElement);
   if(key==="country"){addCountrySelector(form,metadata.country);continue}
   const input=key==="caption"||key==="alt_text"?document.createElement("textarea"):document.createElement("input");
   input.id="meta-"+key;input.name=key;input.value=metadata[key]||"";
   form.append(input);
  }
  const save=document.createElement("button");save.type="submit";save.textContent="Save metadata";form.append(save);
  const keyParts=item.key.split("/");
  if(names[keyParts[1]])$("photoMoveDestination").value=keyParts[1]+"|"+(keyParts.length===4?keyParts[2]:"");
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
 if(metadata.country==="__custom__")metadata.country=$("meta-country-custom").value.trim();
 if(metadata.country.length>100){$("detailStatus").textContent="Country must be 100 characters or fewer.";return}
 if(metadata.country==="__custom__"){ $("detailStatus").textContent="Enter a country name.";return }
 $("detailStatus").textContent="Saving metadata…";
 try{const data=await changePhoto({operation:"edit",metadata});
  await openPhoto({key:selectedPhoto});
  $("detailStatus").textContent="Metadata saved privately.";
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
  await loadAlbums();fillDestinations($("bulkDestination"));await load();
 }catch{ $("photos").textContent="This collection is temporarily unavailable." }
})();