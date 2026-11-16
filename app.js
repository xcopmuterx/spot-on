// ---------- colour maths ----------
function srgbToLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
function rgbToLab(r,g,b){
  const R=srgbToLin(r),G=srgbToLin(g),B=srgbToLin(b);
  let x=(R*0.4124564+G*0.3575761+B*0.1804375)/0.95047;
  let y=(R*0.2126729+G*0.7151522+B*0.0721750);
  let z=(R*0.0193339+G*0.1191920+B*0.9503041)/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
  x=f(x);y=f(y);z=f(z);
  return [116*y-16,500*(x-y),200*(y-z)];
}
function labToRgb(L,a,b){
  let y=(L+16)/116,x=a/500+y,z=y-b/200;
  const fi=t=>t*t*t>0.008856?t*t*t:(t-16/116)/7.787;
  x=fi(x)*0.95047;y=fi(y);z=fi(z)*1.08883;
  let R=x*3.2404542+y*-1.5371385+z*-0.4985314;
  let G=x*-0.9692660+y*1.8760108+z*0.0415560;
  let B=x*0.0556434+y*-0.2040259+z*1.0572252;
  const g=c=>{c=c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;return Math.max(0,Math.min(255,Math.round(c*255)))};
  return [g(R),g(G),g(B)];
}
function de2000(l1,l2){
  const [L1,a1,b1]=l1,[L2,a2,b2]=l2,rad=Math.PI/180,deg=180/Math.PI;
  const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cb=(C1+C2)/2;
  const G=0.5*(1-Math.sqrt(Math.pow(Cb,7)/(Math.pow(Cb,7)+Math.pow(25,7))));
  const a1p=(1+G)*a1,a2p=(1+G)*a2;
  const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);
  const h=(b,a)=>{if(a===0&&b===0)return 0;let t=Math.atan2(b,a)*deg;return t<0?t+360:t};
  const h1p=h(b1,a1p),h2p=h(b2,a2p);
  const dLp=L2-L1,dCp=C2p-C1p;
  let dhp=0;
  if(C1p*C2p!==0){dhp=h2p-h1p;if(dhp>180)dhp-=360;else if(dhp<-180)dhp+=360;}
  const dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp/2*rad);
  const Lbp=(L1+L2)/2,Cbp=(C1p+C2p)/2;
  let hbp=h1p+h2p;
  if(C1p*C2p!==0){if(Math.abs(h1p-h2p)>180)hbp+=(hbp<360?360:-360);hbp/=2;}
  const T=1-0.17*Math.cos((hbp-30)*rad)+0.24*Math.cos(2*hbp*rad)+0.32*Math.cos((3*hbp+6)*rad)-0.20*Math.cos((4*hbp-63)*rad);
  const dTheta=30*Math.exp(-Math.pow((hbp-275)/25,2));
  const Rc=2*Math.sqrt(Math.pow(Cbp,7)/(Math.pow(Cbp,7)+Math.pow(25,7)));
  const Sl=1+0.015*Math.pow(Lbp-50,2)/Math.sqrt(20+Math.pow(Lbp-50,2));
  const Sc=1+0.045*Cbp,Sh=1+0.015*Cbp*T;
  const Rt=-Math.sin(2*dTheta*rad)*Rc;
  return Math.sqrt(Math.pow(dLp/Sl,2)+Math.pow(dCp/Sc,2)+Math.pow(dHp/Sh,2)+Rt*(dCp/Sc)*(dHp/Sh));
}
const hexToRgb=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
const rgbToHex=(r,g,b)=>"#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
const titleCase=s=>s.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());

// ---------- CMYK (FOGRA39) ----------
const CMYK=(()=>{const bin=atob(CMYKLUT.b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u})();
function toCmyk(rgb){
  const n=CMYKLUT.n,s=(n-1)/255,f=rgb.map(v=>v*s),i0=f.map(v=>Math.min(n-2,Math.floor(v))),t=f.map((v,j)=>v-i0[j]);
  const out=[0,0,0,0,0];
  for(let dr=0;dr<2;dr++)for(let dg=0;dg<2;dg++)for(let db=0;db<2;db++){
    const w=(dr?t[0]:1-t[0])*(dg?t[1]:1-t[1])*(db?t[2]:1-t[2]);if(!w)continue;
    const idx=(((i0[0]+dr)*n+(i0[1]+dg))*n+(i0[2]+db))*5;
    for(let k=0;k<5;k++)out[k]+=w*CMYK[idx+k];
  }
  return {c:Math.round(out[0]),m:Math.round(out[1]),y:Math.round(out[2]),k:Math.round(out[3]),gamut:out[4]<=5};
}
const cmykText=x=>`${x.c} ${x.m} ${x.y} ${x.k}`;
const cmykCells=x=>`<span class="cmyk mono" data-copy="C${x.c} M${x.m} Y${x.y} K${x.k}" title="CMYK, FOGRA39 coated${x.gamut?"":". Outside the CMYK gamut, this is the closest possible"}">${[x.c,x.m,x.y,x.k].map(v=>`<i>${v}</i>`).join("")}${x.gamut?"":`<b class="og">*</b>`}</span>`;

// ---------- libraries ----------
const LIBS={
  pmsc:PMSC.map(([n,h])=>({name:"PANTONE "+n+" C",sub:"",hex:"#"+h.toUpperCase(),lab:rgbToLab(...hexToRgb(h))})),
  pmsu:PMSU.map(([n,h])=>({name:"PANTONE "+n+" U",sub:"",hex:"#"+h.toUpperCase(),lab:rgbToLab(...hexToRgb(h))})),
  tcx:TCX.map(([c,n,h])=>({name:"PANTONE "+c+" TCX",sub:titleCase(n),hex:"#"+h.toUpperCase(),lab:rgbToLab(...hexToRgb(h))})),
  mine:[]
};
// ---------- my swatches ----------
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}};
function parseMine(txt){
  const out=[],bad=[];
  txt.split(/\n/).forEach((line,i)=>{const l=line.trim();if(!l)return;
    const m=l.match(/^(.*?)[,;\t ]+#?([0-9a-fA-F]{6})\s*$/);
    if(!m||!m[1].trim()){bad.push(i+1);return;}
    const h=m[2].toLowerCase();out.push({name:m[1].trim(),sub:"",own:true,hex:"#"+h.toUpperCase(),lab:rgbToLab(...hexToRgb(h))});});
  return {out,bad};
}
function loadMine(txt){const r=parseMine(txt);LIBS.mine=r.out;$("mineCount").textContent=r.out.length?`(${r.out.length})`:"";return r;}
function nearest(lab,lib,n=3){
  let arr=LIBS[lib];if(lib!=="mine"&&$("incMine").checked&&LIBS.mine.length)arr=arr.concat(LIBS.mine);
  const best=[];
  for(const p of arr){const d=de2000(lab,p.lab);
    if(best.length<n||d<best[best.length-1].d){best.push({p,d});best.sort((a,b)=>a.d-b.d);if(best.length>n)best.pop();}}
  return best;
}

// ---------- k-means in Lab ----------
function kmeans(pts,k,iters=14){
  const N=pts.length;if(!N)return[];
  k=Math.min(k,N);
  // k-means++ seeding with a fixed seed so results are stable
  let seed=12345;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const cent=[pts[Math.floor(rnd()*N)].slice()];
  const dist=new Float64Array(N);
  while(cent.length<k){
    let sum=0;
    for(let i=0;i<N;i++){let m=Infinity;for(const c of cent){const d=(pts[i][0]-c[0])**2+(pts[i][1]-c[1])**2+(pts[i][2]-c[2])**2;if(d<m)m=d;}dist[i]=m;sum+=m;}
    if(sum===0)break;
    let r=rnd()*sum,i=0;for(;i<N-1;i++){r-=dist[i];if(r<=0)break;}
    cent.push(pts[i].slice());
  }
  const asg=new Int32Array(N);
  for(let it=0;it<iters;it++){
    const s=cent.map(()=>[0,0,0,0]);
    for(let i=0;i<N;i++){const p=pts[i];let bi=0,bd=Infinity;
      for(let j=0;j<cent.length;j++){const c=cent[j];const d=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2;if(d<bd){bd=d;bi=j;}}
      asg[i]=bi;const t=s[bi];t[0]+=p[0];t[1]+=p[1];t[2]+=p[2];t[3]++;}
    for(let j=0;j<cent.length;j++){const t=s[j];if(t[3])cent[j]=[t[0]/t[3],t[1]/t[3],t[2]/t[3]];}
  }
  const counts=new Array(cent.length).fill(0);for(let i=0;i<N;i++)counts[asg[i]]++;
  return cent.map((c,j)=>({lab:c,count:counts[j]})).filter(c=>c.count>0).sort((a,b)=>b.count-a.count);
}

// ---------- state + UI ----------
const $=id=>document.getElementById(id);
let pixels=null,fullCanvas=null,clusters=[],picked=null;
const drop=$("drop"),fileIn=$("file"),preview=$("preview");

function toast(t){const e=$("toast");e.textContent=t;e.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("on"),1300)}
async function copy(t){try{await navigator.clipboard.writeText(t);toast("Copied "+(t.length>40?"list":t))}catch(e){toast("Copy not allowed here")}}

function loadFile(f){
  if(!f||!f.type.startsWith("image/"))return toast("That isn’t an image");
  const url=URL.createObjectURL(f);const img=new Image();
  img.onload=()=>{
    preview.src=url;drop.classList.add("has");$("newSearch").hidden=false;$("marker").style.display="none";picked=null;$("clearPick").disabled=true;area=null;wb=null;pickedRaw=null;updateOverlay();
    // full-ish canvas for sampling
    const fmax=2400,fs=Math.min(1,fmax/Math.max(img.width,img.height));
    fullCanvas=document.createElement("canvas");fullCanvas.width=Math.round(img.width*fs);fullCanvas.height=Math.round(img.height*fs);
    fullCanvas.getContext("2d",{willReadFrequently:true}).drawImage(img,0,0,fullCanvas.width,fullCanvas.height);
    // small canvas for clustering
    const max=220,s=Math.min(1,max/Math.max(img.width,img.height));
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));
    const ctx=c.getContext("2d");ctx.drawImage(img,0,0,c.width,c.height);
    const d=ctx.getImageData(0,0,c.width,c.height).data;
    pixels=[];for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const p=i/4;pixels.push([d[i],d[i+1],d[i+2],(p%c.width+0.5)/c.width,(Math.floor(p/c.width)+0.5)/c.height]);}
    analyse();
  };
  img.onerror=()=>toast("Couldn’t read that image");
  img.src=url;
}

function analyse(){
  if(!pixels)return;
  const ign=+$("ign").value;
  const useArea=area&&$("clickMode").value==="area";
  let src=useArea?pixels.filter(p=>p[3]>=area.x0&&p[3]<=area.x1&&p[4]>=area.y0&&p[4]<=area.y1):pixels;
  let pts=src.map(p=>rgbToLab(...correct(p)));
  if(ign){pts=pts.filter(l=>{const C=Math.hypot(l[1],l[2]);if(l[0]>94&&C<6)return false;if(ign===2&&l[0]<8&&C<6)return false;return true;});}
  if(pickedRaw){const rgb=correct(pickedRaw);picked={rgb,hex:rgbToHex(...rgb),lab:rgbToLab(...rgb)};}
  if(!pts.length){clusters=[];render();return;}
  const raw=kmeans(pts,+$("k").value);
  const total=pts.length;
  clusters=raw.map(c=>{const rgb=labToRgb(...c.lab);return{rgb,hex:rgbToHex(...rgb),lab:rgbToLab(...rgb),share:c.count/total}}).filter(c=>c.share>=0.015);
  render();
}
// ---------- white reference + area ----------
let area=null,wb=null,pickedRaw=null;
const lin1=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const gam1=v=>{v=Math.max(0,Math.min(1,v));return Math.round(255*(v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055))};
function correct(p){if(!wb)return[p[0],p[1],p[2]];return[0,1,2].map(i=>gam1(lin1(p[i])*wb[i]));}
function setWhite(rgb){const t=lin1(244);wb=rgb.map(v=>t/Math.max(lin1(v),1e-4));$("wbState").textContent="White reference set";$("clearWb").disabled=false;analyse();}
function updateOverlay(){const o=$("areaBox");if(!area){o.style.display="none";$("clearArea").disabled=true;return;}
  const r=preview.getBoundingClientRect(),dr=drop.getBoundingClientRect();
  o.style.display=$("clickMode").value==="area"?"block":"none";o.style.left=(r.left-dr.left+area.x0*r.width)+"px";o.style.top=(r.top-dr.top+area.y0*r.height)+"px";
  o.style.width=((area.x1-area.x0)*r.width)+"px";o.style.height=((area.y1-area.y0)*r.height)+"px";$("clearArea").disabled=false;}
window.addEventListener("resize",updateOverlay);
$("clickMode").addEventListener("change",()=>{updateOverlay();if(area)analyse();});

function q(d){return d<2?["q0","close"]:d<5?["q1","near"]:["q2","rough"]}
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function block(c,label,isPick){
  const lib=$("lib").value;const m=nearest(c.lab,lib,3);
  const save=isPick?`<div class="save"><input id="saveName" placeholder="Name this ink, e.g. 2421 U"><button id="saveBtn">Add to my swatches</button></div>`:"";
  if(!m.length)return{html:`<div class="color"><div class="sw" style="background:${c.hex}"></div><div><div class="meta"><span class="hex mono" data-copy="${c.hex}">${c.hex}</span><span class="tag">${label}</span></div><div class="small">No swatches in this library yet.</div>${save}</div></div>`,best:null};
  const rows=m.map((x,i)=>{const [cls]=q(x.d);return `<div class="m${i===0?" best":""}" data-copy="${esc(x.p.name)}"><div class="chip" style="background:${x.p.hex}"></div><div class="nm">${esc(x.p.name)}${x.p.sub?` <span class="small">· ${esc(x.p.sub)}</span>`:""}${x.p.own?`<span class="own">mine</span>`:""}</div><div class="de mono"><span class="${cls}">ΔE ${x.d.toFixed(1)}</span> <span class="small hx">${x.p.hex}</span>${cmykCells(toCmyk(hexToRgb(x.p.hex.slice(1))))}</div></div>`}).join("");
  const [cls,word]=q(m[0].d);
  return {html:`<div class="color"><div class="sw" style="background:${c.hex}"></div><div><div class="meta"><span class="hex mono" data-copy="${c.hex}">${c.hex}</span><span class="small mono" data-copy="R${c.rgb[0]} G${c.rgb[1]} B${c.rgb[2]}" style="cursor:pointer" title="Click to copy">RGB ${c.rgb.join(" ")}</span>${(()=>{const k=toCmyk(c.rgb);return `<span class="small mono" data-copy="C${k.c} M${k.m} Y${k.y} K${k.k}" style="cursor:pointer" title="CMYK, FOGRA39 coated. Click to copy">CMYK ${cmykText(k)}</span>${k.gamut?"":`<span class="tag" title="This colour can’t be reproduced exactly in CMYK">outside CMYK</span>`}`})()}<span class="tag">${label}</span><span class="tag ${cls}">${word}</span></div><div class="matches">${rows}</div>${save}</div></div>`,best:m[0]};
}
let lastList="";
function render(){
  const out=[],list=[];
  const fmt=b=>b.best?`${b.best.p.name} (ΔE ${b.best.d.toFixed(1)}, CMYK ${cmykText(toCmyk(hexToRgb(b.best.p.hex.slice(1))))})`:"no match";
  if(picked){const b=block(picked,"picked",true);out.push(b.html);list.push(`Picked ${picked.hex} (CMYK ${cmykText(toCmyk(picked.rgb))}) → ${fmt(b)}`);}
  clusters.forEach((c,i)=>{const b=block(c,Math.round(c.share*100)+"%");out.push(b.html.replace('<div class="color">',`<div class="color" id="clr-${i}">`));list.push(`${c.hex} ${Math.round(c.share*100)}% (CMYK ${cmykText(toCmyk(c.rgb))}) → ${fmt(b)}`);});
  $("results").innerHTML=out.length?out.join(""):`<div class="empty">${pixels?"No colours left after filtering.":"No image yet."}</div>`;
  $("resTitle").textContent=clusters.length?`${clusters.length} main colours`:"Results";
  const st=$("strip");st.hidden=!clusters.length;st.innerHTML=clusters.map((c,i)=>`<div data-i="${i}" title="${c.hex} · ${Math.round(c.share*100)}%" style="background:${c.hex};flex:${c.share}"></div>`).join("");
  lastList=list.join("\n");$("copyAll").disabled=!list.length;
}

function sampleAt(cx,cy){
  const r=preview.getBoundingClientRect();
  const x=Math.floor((cx-r.left)/r.width*fullCanvas.width),y=Math.floor((cy-r.top)/r.height*fullCanvas.height);
  const x0=Math.max(0,x-3),y0=Math.max(0,y-3),w=Math.min(7,fullCanvas.width-x0),h=Math.min(7,fullCanvas.height-y0);
  const d=fullCanvas.getContext("2d").getImageData(x0,y0,w,h).data;let R=0,G=0,B=0,n=0;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;R+=d[i];G+=d[i+1];B+=d[i+2];n++;}
  return n?[Math.round(R/n),Math.round(G/n),Math.round(B/n)]:null;
}
let dragStart=null;
const inImg=(e,r)=>e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
// ---------- loupe ----------
const loupe=$("loupe"),lctx=$("loupeCanvas").getContext("2d"),LS=160,ZOOM=4,SAMPLE=7;
function showLoupe(cx,cy){
  const r=preview.getBoundingClientRect();
  const x=Math.max(r.left,Math.min(r.right-0.01,cx)),y=Math.max(r.top,Math.min(r.bottom-0.01,cy));
  const fx=Math.floor((x-r.left)/r.width*fullCanvas.width),fy=Math.floor((y-r.top)/r.height*fullCanvas.height);
  const src=LS/ZOOM;
  lctx.imageSmoothingEnabled=false;lctx.fillStyle="#888";lctx.fillRect(0,0,LS,LS);
  lctx.drawImage(fullCanvas,fx-src/2,fy-src/2,src,src,0,0,LS,LS);
  // sample ring + crosshair
  const rad=SAMPLE*ZOOM/2+1,m=LS/2;
  lctx.beginPath();lctx.moveTo(m,0);lctx.lineTo(m,m-rad-4);lctx.moveTo(m,m+rad+4);lctx.lineTo(m,LS);lctx.moveTo(0,m);lctx.lineTo(m-rad-4,m);lctx.moveTo(m+rad+4,m);lctx.lineTo(LS,m);
  lctx.strokeStyle="rgba(255,255,255,.6)";lctx.lineWidth=1;lctx.stroke();
  lctx.beginPath();lctx.arc(m,m,rad,0,Math.PI*2);lctx.strokeStyle="rgba(0,0,0,.8)";lctx.lineWidth=3;lctx.stroke();
  lctx.strokeStyle="#fff";lctx.lineWidth=1.5;lctx.stroke();
  const rgb=sampleAt(x,y);if(rgb){const c=correct(rgb);$("loupeHex").textContent=rgbToHex(...c);$("loupeSw").style.background=rgbToHex(...c);}
  const above=cy-LS-70>8;
  loupe.style.left=Math.max(8,Math.min(innerWidth-LS-8,cx-LS/2))+"px";
  loupe.style.top=(above?cy-LS-70:cy+36)+"px";
  loupe.style.display="block";
}
const hideLoupe=()=>{loupe.style.display="none"};
const mode=()=>$("clickMode").value;
drop.addEventListener("pointerdown",e=>{
  if(!drop.classList.contains("has"))return;
  const r=preview.getBoundingClientRect();if(!inImg(e,r))return;
  e.preventDefault();dragStart={x:e.clientX,y:e.clientY,r};drop.setPointerCapture(e.pointerId);
  if(mode()!=="area")showLoupe(e.clientX,e.clientY);
});
drop.addEventListener("pointermove",e=>{
  if(!dragStart)return;const {r}=dragStart;
  if(mode()!=="area"){showLoupe(e.clientX,e.clientY);return;}
  if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<6)return;
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ax=(cl(dragStart.x,r.left,r.right)-r.left)/r.width,bx=(cl(e.clientX,r.left,r.right)-r.left)/r.width;
  const ay=(cl(dragStart.y,r.top,r.bottom)-r.top)/r.height,by=(cl(e.clientY,r.top,r.bottom)-r.top)/r.height;
  area={x0:Math.min(ax,bx),x1:Math.max(ax,bx),y0:Math.min(ay,by),y1:Math.max(ay,by)};updateOverlay();
});
function endPointer(e,cancel){
  if(!dragStart)return;const {r}=dragStart;dragStart=null;hideLoupe();
  if(cancel)return;
  if(mode()==="area"){if(area&&(area.x1-area.x0<0.02||area.y1-area.y0<0.02))area=null;updateOverlay();analyse();return;}
  const cx=Math.max(r.left,Math.min(r.right-0.01,e.clientX)),cy=Math.max(r.top,Math.min(r.bottom-0.01,e.clientY));
  const rgb=sampleAt(cx,cy);if(!rgb)return;
  if(mode()==="white"){setWhite(rgb);$("clickMode").value="sample";toast("White reference set");return;}
  pickedRaw=rgb;const c=correct(rgb);picked={rgb:c,hex:rgbToHex(...c),lab:rgbToLab(...c)};
  const dr=drop.getBoundingClientRect(),mk=$("marker");mk.style.left=(cx-dr.left)+"px";mk.style.top=(cy-dr.top)+"px";mk.style.display="block";
  $("clearPick").disabled=false;render();
}
drop.addEventListener("pointerup",e=>endPointer(e,false));
drop.addEventListener("pointercancel",e=>endPointer(e,true));
drop.addEventListener("click",()=>{if(!drop.classList.contains("has"))fileIn.click();});
$("clearArea").addEventListener("click",()=>{area=null;updateOverlay();analyse();});
$("clearWb").addEventListener("click",()=>{wb=null;$("wbState").textContent="";$("clearWb").disabled=true;analyse();});
drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileIn.click();}});
fileIn.addEventListener("change",()=>loadFile(fileIn.files[0]));
["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));
document.addEventListener("paste",e=>{const it=[...(e.clipboardData||{}).items||[]].find(i=>i.type.startsWith("image/"));if(it)loadFile(it.getAsFile());});
$("k").addEventListener("input",()=>{$("kv").textContent=$("k").value});
$("k").addEventListener("change",analyse);
$("ign").addEventListener("change",analyse);
$("lib").addEventListener("change",()=>{store.set("pf_lib",$("lib").value);render();});
$("incMine").addEventListener("change",render);
// my swatches wiring
(function(){
  const saved=store.get("pf_mine")||"";$("mineText").value=saved;loadMine(saved);
  const lib=store.get("pf_lib");if(lib&&LIBS[lib])$("lib").value=lib;
  if(LIBS.mine.length)$("mineBox").open=false;
})();
function saveMine(){
  const r=loadMine($("mineText").value);
  const ok=store.set("pf_mine",$("mineText").value);
  $("mineMsg").textContent=(r.bad.length?`Skipped line ${r.bad.join(", ")}. `:"")+(ok?`${r.out.length} saved.`:"Couldn’t save in this browser. Copy the list to keep it.");
  render();
}
$("mineSave").addEventListener("click",saveMine);
$("mineCopy").addEventListener("click",()=>copy($("mineText").value||" "));
$("results").addEventListener("click",e=>{
  if(e.target.id!=="saveBtn"||!picked)return;
  e.stopPropagation();
  const name=$("saveName").value.trim();if(!name){$("saveName").focus();return;}
  const t=$("mineText").value.replace(/\s+$/,"");
  $("mineText").value=(t?t+"\n":"")+`${name}, ${picked.hex}`;
  $("mineBox").open=true;saveMine();toast("Added "+name);
},true);
$("results").addEventListener("keydown",e=>{if(e.target.id==="saveName"&&e.key==="Enter")$("saveBtn").click();});
$("clearPick").addEventListener("click",()=>{picked=null;pickedRaw=null;$("marker").style.display="none";$("clearPick").disabled=true;render();});
$("copyAll").addEventListener("click",()=>copy(lastList));
$("results").addEventListener("click",e=>{const t=e.target.closest("[data-copy]");if(t)copy(t.dataset.copy);});
// change-another-image: double-click opens picker
function newSearch(){
  pixels=null;fullCanvas=null;clusters=[];picked=null;pickedRaw=null;area=null;wb=null;
  try{URL.revokeObjectURL(preview.src)}catch(e){}
  preview.removeAttribute("src");drop.classList.remove("has");$("marker").style.display="none";updateOverlay();
  $("clearPick").disabled=true;$("clearWb").disabled=true;$("wbState").textContent="";$("clickMode").value="sample";
  fileIn.value="";$("newSearch").hidden=true;render();window.scrollTo({top:0,behavior:"smooth"});
}
$("newSearch").addEventListener("click",newSearch);
$("strip").addEventListener("click",e=>{
  const seg=e.target.closest("[data-i]");if(!seg)return;
  const el=$("clr-"+seg.dataset.i);if(!el)return;
  el.scrollIntoView({behavior:"smooth",block:"center"});
  el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash");el.addEventListener("animationend",()=>el.classList.remove("flash"),{once:true});
});
