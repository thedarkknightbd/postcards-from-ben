// Location navigation is visible only to signed-in accounts approved for location.
// This is a convenience link; authorization remains enforced server-side.
(async()=>{
 const nav=document.querySelector(".site-nav .site-nav-links");
 if(!nav||nav.querySelector('a[href="/location/"]'))return;
 try{
  const response=await fetch("/api/access/me",{credentials:"same-origin",cache:"no-store"});
  if(!response.ok)return;
  const account=await response.json();
  if(account.authenticated!==true||account.can_view_location!==true)return;
  const link=document.createElement("a");
  link.href="/location/";
  link.textContent="Private Location";
  link.dataset.memberLocationLink="true";
  if(location.pathname.startsWith("/location"))link.setAttribute("aria-current","page");
  nav.append(link);
 }catch{
  // On network or session errors, fail closed: do not advertise private access.
 }
})();
