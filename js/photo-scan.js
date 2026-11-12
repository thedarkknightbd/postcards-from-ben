const $=(selector)=>document.querySelector(selector);
const jobs={public:null,private:null};
function show(library,counters){
 const list=$('[data-counts="'+library+'"]');list.replaceChildren();
 for(const [title,key] of [["Checked","checked"],["EXIF found","extracted"],["Partial","partial"],["Skipped","skipped"],["Errors","errors"]]){
  const box=document.createElement("div"),term=document.createElement("dt"),value=document.createElement("dd");
  term.textContent=title;value.textContent=String(counters[key]);box.append(term,value);list.append(box)
 }
}
async function run(library){
 if(jobs[library])return;
 const button=$('[data-start="'+library+'"]'),stop=$('[data-stop="'+library+'"]'),status=$('[data-status="'+library+'"]');
 const job={active:true,cursor:null,batches:0,totals:{checked:0,extracted:0,partial:0,skipped:0,errors:0}};
 jobs[library]=job;button.disabled=true;stop.disabled=false;show(library,job.totals);
 status.textContent="Scanning…";
 try{
  while(job.active){
   const res=await fetch("/api/photo-scan",{method:"POST",credentials:"same-origin",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({library,...(job.cursor?{cursor:job.cursor}:{})})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Scan failed");
   job.batches++;
   for(const field of Object.keys(job.totals))job.totals[field]+=Number(data[field]||0);
   show(library,job.totals);
   if(data.failures?.length)console.warn("Photo scan batch errors",data.failures);
   status.textContent="Processed "+job.totals.checked+" photographs; "+job.totals.extracted+" with readable JPEG metadata.";
   if(data.done){status.textContent="Scan complete. "+job.totals.checked+" photographs checked; "+job.totals.extracted+" with readable JPEG EXIF; "+job.totals.errors+" errors.";break}
   if(!data.nextCursor)throw Error("The scan cannot continue because its cursor is missing");
   job.cursor=data.nextCursor;
  }
  if(!job.active)status.textContent="Stopped. To scan remaining photos, start another pass. Existing metadata will be preserved.";
 }catch(error){status.textContent="Scan interrupted: "+error.message+". Existing photographs remain unchanged."}
 finally{jobs[library]=null;button.disabled=false;stop.disabled=true}
}
for(const library of ["public","private"]){
 $('[data-start="'+library+'"]').addEventListener("click",()=>run(library));
 $('[data-stop="'+library+'"]').addEventListener("click",()=>{if(jobs[library])jobs[library].active=false});
}
$("[data-start-all]").addEventListener("click",async event=>{
 const button=event.currentTarget,status=$("[data-all-status]");
 if(jobs.public||jobs.private)return;
 button.disabled=true;
 try{
  status.textContent="Scanning public photographs…";await run("public");
  status.textContent="Scanning private photographs…";await run("private");
  status.textContent="Both scan passes finished. Review their counts and any errors above.";
 }finally{button.disabled=false}
});
