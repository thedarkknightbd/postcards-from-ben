// Prevent favicon and public navigation drift across standalone HTML pages.
// Run: node scripts/check-site-consistency.mjs
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root=process.cwd();
const excluded=new Set([".git","node_modules"]);
function htmlFiles(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.isDirectory())return excluded.has(entry.name)?[]:htmlFiles(join(dir,entry.name));
    return entry.isFile()&&entry.name.endsWith(".html")?[join(dir,entry.name)]:[];
  });
}
const iconPaths=[
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/icons/apple-touch-icon.png",
  "/icons/site.webmanifest"
];
const errors=[];
const pages=htmlFiles(root);
for(const file of pages){
  const path=relative(root,file).split(sep).join("/");
  const source=readFileSync(file,"utf8");
  const head=source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||"";
  for(const icon of iconPaths){
    const count=[...head.matchAll(/<link\b[^>]*>/gi)].filter(match=>{
      const href=match[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      return href?.split("?")[0]===icon;
    }).length;
    if(count!==1)errors.push(`${path}: expected exactly one ${icon}, found ${count}`);
  }
  // Public content shares a common navigation bar; administrative and utility
  // pages intentionally have different navigation or no navigation at all.
  const publicPage=path==="index.html"||path==="about/index.html"||
    path==="atlas/index.html"||path==="postcard/index.html"||
    path==="where-to-next/index.html"||path==="beyond-the-postcard/index.html"||
    path==="trips/index.html"||/^trips\/[^/]+\/index\.html$/.test(path)||
    /^trips\/the-long-way-around\/days\/day-\d{2}\.html$/.test(path);
  if(publicPage&&!source.includes('class="site-nav"'))
    errors.push(`${path}: shared public navigation missing`);
}
if(!existsSync(join(root,"favicon.ico")))errors.push("Root favicon.ico missing");
if(!pages.length)errors.push("No HTML pages discovered");
if(errors.length){
  console.error("Site consistency check failed:\n"+errors.map(s=>" - "+s).join("\n"));
  process.exitCode=1;
}else{
  console.log(`Site consistency check passed: ${pages.length} HTML pages, shared icons and public navigation.`);
}
