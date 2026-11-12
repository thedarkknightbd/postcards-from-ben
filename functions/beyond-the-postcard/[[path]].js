import {privateMember} from "../_lib/private-media.js";

export async function onRequest(context) {
  const headers={"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow"};
  if (!(await privateMember(context.request, context.env))) {
    return new Response("Not found",{status:404,headers});
  }
  const response=await context.next();
  const h=new Headers(response.headers);
  for(const [k,v] of Object.entries(headers))h.set(k,v);
  return new Response(response.body,{status:response.status,headers:h});
}