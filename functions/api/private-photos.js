import {privateMember, privateResponse, owner, collections, fileTypes} from "../_lib/private-media.js";

export async function onRequestGet({request, env}) {
  const member = await privateMember(request, env);
  if (!member) return privateResponse({error:"Not found"},404);
  const collection = new URL(request.url).searchParams.get("collection");
  if (!collections.has(collection)) return privateResponse({error:"Invalid collection"},400);
  const keys = [];
  let cursor;
  // List only the selected private-bucket folder. Never return public R2 URLs.
  do {
    const page = await env.PRIVATE_MEDIA.list({prefix:`albums/${collection}/`, limit:100, cursor});
    for (const object of page.objects) {
      if (/\.(jpg|jpeg|png|webp|avif)$/i.test(object.key)) {
        keys.push({key:object.key, uploaded:object.uploaded, size:object.size});
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor && keys.length < 300);
  keys.sort((a,b) => new Date(b.uploaded)-new Date(a.uploaded));
  return privateResponse({items:keys, collection});
}

export async function onRequestPost({request, env}) {
  const member = await privateMember(request, env);
  if (!member || !owner(member)) return privateResponse({error:"Not found"},404);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return privateResponse({error:"Invalid origin"},403);
  }
  if (Number(request.headers.get("content-length") || 0) > 16 * 1024 * 1024) {
    return privateResponse({error:"Upload too large"},413);
  }
  let form;
  try {form = await request.formData();} catch {return privateResponse({error:"Invalid upload"},400);}
  const collection = String(form.get("collection") || "");
  const file = form.get("file");
  if (!collections.has(collection) || !(file instanceof File)) {
    return privateResponse({error:"Choose a gallery and an image"},400);
  }
  const extension = fileTypes.get(file.type);
  if (!extension || file.size < 1 || file.size > 12 * 1024 * 1024) {
    return privateResponse({error:"Use a JPEG, PNG, WebP, or AVIF image up to 12 MB"},400);
  }
  // Signature validation prevents mislabeled files and SVG/HTML polyglots.
  const head = new Uint8Array(await file.slice(0,16).arrayBuffer());
  const starts = b => b.every((v,i)=>head[i]===v);
  const valid = file.type==="image/jpeg" ? starts([255,216,255]) :
    file.type==="image/png" ? starts([137,80,78,71,13,10,26,10]) :
    file.type==="image/webp" ? String.fromCharCode(...head.slice(0,4))==="RIFF" &&
      String.fromCharCode(...head.slice(8,12))==="WEBP" :
    file.type==="image/avif" ? String.fromCharCode(...head.slice(4,8))==="ftyp" &&
      ["avif","avis"].includes(String.fromCharCode(...head.slice(8,12))) : false;
  if (!valid) return privateResponse({error:"Image file does not match its type"},400);
  const key = `albums/${collection}/${crypto.randomUUID()}.${extension}`;
  await env.PRIVATE_MEDIA.put(key,file.stream(),{
    httpMetadata:{contentType:file.type,cacheControl:"private, no-store"}
  });
  return privateResponse({ok:true,key},201);
}