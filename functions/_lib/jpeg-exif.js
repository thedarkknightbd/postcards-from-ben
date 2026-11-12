// Conservative JPEG EXIF parser. No third-party dependencies. Unsupported or malformed
// metadata returns an empty object; it never blocks a valid image upload.
export function extractJpegMetadata(buffer){
 const out={};
 try{
  const bytes=new Uint8Array(buffer),view=new DataView(buffer);
  if(bytes.length<16||bytes[0]!==255||bytes[1]!==216)return out;
  let p=2,exifStart=-1,exifEnd=-1;
  while(p+4<bytes.length){
   if(bytes[p]!==255)break;
   const marker=bytes[p+1];p+=2;
   if(marker===217||marker===218)break;
   if(marker===255||marker===1||marker>=208&&marker<=215)continue;
   const len=view.getUint16(p);if(len<2||p+len>bytes.length)break;
   if([192,193,194,195,198,199,201,202,203,205,206,207].includes(marker)&&len>=7){
    out.pixel_height=view.getUint16(p+3);out.pixel_width=view.getUint16(p+5);
   }
   if(marker===225&&len>10&&String.fromCharCode(...bytes.slice(p+2,p+8))==="Exif\0\0"){
    exifStart=p+8;exifEnd=p+len;break;
   }
   p+=len;
  }
  if(exifStart<0)return out;
  const t=exifStart,end=exifEnd;
  if(t+8>end)return out;
  const byteOrder=String.fromCharCode(bytes[t],bytes[t+1]);
  if(byteOrder!=="II"&&byteOrder!=="MM")return out;
  const le=byteOrder==="II";
  const u16=at=>at>=t&&at+2<=end?view.getUint16(at,le):null;
  const u32=at=>at>=t&&at+4<=end?view.getUint32(at,le):null;
  if(u16(t+2)!==42)return out;
  const sizes={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};
  const value=(entry,type,count)=>{
   const size=sizes[type];if(!size||count<1||count>500||size*count>10000)return null;
   const at=size*count<=4?entry+8:t+u32(entry+8);
   if(at<t||at+size*count>end)return null;
   if(type===2){let chars=[];for(let j=0;j<count;j++){const b=bytes[at+j];if(!b)break;chars.push(b)}
    return new TextDecoder().decode(Uint8Array.from(chars)).trim().slice(0,160);}
   const number=i=>{
    const q=at+i*size;
    if(type===1||type===7)return bytes[q];
    if(type===3)return u16(q);
    if(type===4)return u32(q);
    if(type===9)return view.getInt32(q,le);
    if(type===5||type===10){
     const a=type===5?u32(q):view.getInt32(q,le),b=type===5?u32(q+4):view.getInt32(q+4,le);
     return b? a/b:null;
    }
    return null;
   };
   return count===1?number(0):Array.from({length:count},(_,i)=>number(i));
  };
  function ifd(offset){
   const pos=t+offset;
   if(pos<t||pos+2>end)return {};
   const count=u16(pos);
   if(count==null||count>200||pos+2+count*12>end)return {};
   const result={};
   for(let i=0;i<count;i++){
    const e=pos+2+i*12,tag=u16(e),type=u16(e+2),n=u32(e+4);
    try{result[tag]=value(e,type,n)}catch{}
   }
   return result;
  }
  const first=ifd(u32(t+4));
  const exif=typeof first[34665]==="number"?ifd(first[34665]):{};
  const gps=typeof first[34853]==="number"?ifd(first[34853]):{};
  const assign=(name,value)=>{if(value!==null&&value!==undefined&&value!=="")out[name]=String(value)};
  if(!out.pixel_width&&typeof exif[40962]==="number")out.pixel_width=exif[40962];
  if(!out.pixel_height&&typeof exif[40963]==="number")out.pixel_height=exif[40963];
  assign("camera_make",first[271]);assign("camera_model",first[272]);assign("software",first[305]);
  assign("lens_model",exif[42036]);assign("iso",exif[34855]);assign("aperture",exif[33437]);
  assign("shutter_speed",exif[33434]);assign("focal_length_mm",exif[37386]);
  const dt=exif[36867]||first[306];
  if(dt&&/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(dt))assign("taken_at",dt);
  const toDegrees=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)?a[0]+a[1]/60+a[2]/3600:null;
  let lat=toDegrees(gps[2]),lon=toDegrees(gps[4]);
  if(Number.isFinite(lat)&&lat<=90){if(gps[1]==="S")lat=-lat;assign("latitude",lat.toFixed(7))}
  if(Number.isFinite(lon)&&lon<=180){if(gps[3]==="W")lon=-lon;assign("longitude",lon.toFixed(7))}
  if(typeof gps[6]==="number"&&Number.isFinite(gps[6]))assign("gps_altitude_m",(gps[5]===1?-gps[6]:gps[6]).toFixed(2));
 }catch{}
 return out;
}