// The former public live-location endpoint is permanently retired.
// Do not redirect to the private map or reveal whether sharing is active.
export function onRequest(){
 return new Response("Not found",{
  status:404,
  headers:{
   "content-type":"text/plain; charset=utf-8",
   "cache-control":"no-store",
   "x-robots-tag":"noindex, nofollow",
   "x-content-type-options":"nosniff"
  }
 });
}
