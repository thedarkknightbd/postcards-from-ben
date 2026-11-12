import {privateMember, privateKey} from "../_lib/private-media.js";

export async function onRequestGet({request,env}) {
  const headers={"cache-control":"private, no-store","x-content-type-options":"nosniff",
    "x-robots-tag":"noindex, nofollow"};
  if (!(await privateMember(request,env))) return new Response("Not found",{status:404,headers});
  const key=new URL(request.url).searchParams.get("key");
  if (!privateKey(key)) return new Response("Not found",{status:404,headers});
  const object=await env.PRIVATE_MEDIA.get(key);
  if (!object) return new Response("Not found",{status:404,headers});
  const types={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",avif:"image/avif"};
  return new Response(object.body,{
    headers:{...headers,"content-type":types[key.split(".").pop().toLowerCase()],
      "content-disposition":"inline", "content-security-policy":"default-src 'none'; sandbox"}
  });
}