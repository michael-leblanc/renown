// The character page: every race in every held thing Michael approved (wardrobe status "approved"), side by side, all playing one
// animation, drawn from the intake's layer pictures as the game will draw them (nearer pixel wins, the race's colours,
// the 1 px outline, the parts' shadows). One HTML file, every picture inside it; nothing is rendered.
//   node scripts/art/doll_page.mjs <store> <out.html> [--races human,goblin] [--title "..."]
//       <store>: the intake's store (<store>/<race>/layers/<part>/<anim>.<side>.NN.png and .shadow.png).
// On the page: the animation (every one of the wardrobe's, the ones without pictures greyed), the side, each race's
// clothes (a race whose outfit has no top starts in what tops it has), hair and colours, what the shield columns hold in the other hand, the size, the speed, pause and
// step, and "All" (each rendered animation in turn). A cell with a part not rendered in that animation and side says so.
// The timing of each animation is its own (the action's length over 15 pictures, from the renders' anim.json).
// Holds our renders only (Quaternius CC0 models, "Goblin Simple" CC BY 4.0: its credit is on the page); no bought art.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { readPng } from './png.mjs';
import { RAMP, OUTLINE } from './style.mjs';
import { load, real, live, rules as raceRules } from './wardrobe.mjs';

const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i >= 0 ? a.splice(i, 2)[1] : d; };
const title = opt('--title', 'Renown characters'), raceList = opt('--races'), [store, out] = a;
if (!store || !out) { console.error('node scripts/art/doll_page.mjs <store> <out.html> [--races human,goblin] [--title "..."]'); process.exit(1); }
const W = load(), FRAMES = 15, nn = k => String(k).padStart(2, '0');
const races = (raceList ? raceList.split(',') : real(W.races).map(([r]) => r)).filter(r => existsSync(join(store, r, 'layers')));

/* ---------- PNG out ---------- */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const chunk = (t, d) => { const body = Buffer.concat([Buffer.from(t), d]), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); let x = 0xffffffff; for (const b of body) x = CRC[(x ^ b) & 255] ^ (x >>> 8); c.writeUInt32BE((x ^ 0xffffffff) >>> 0); return Buffer.concat([l, body, c]); };
function uri(rgba, w, h) {
  const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
/** The 15 pictures of one part in one animation and side, cut to what they cover together, side by side in one strip. */
function strip(files) {
  const pics = files.map(f => readPng(f)), { width: w, height: h } = pics[0];
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const p of pics) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p.data[(y * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = Buffer.alloc(cw * FRAMES * ch * 4);
  pics.forEach((p, k) => { for (let y = 0; y < ch; y++) p.data.copy(o, (y * cw * FRAMES + k * cw) * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4); });
  return [x0, y0, cw, ch, uri(o, cw * FRAMES, ch)];
}

/* ---------- what there is ---------- */
const D = { title, frames: FRAMES, outline: OUTLINE.colour, grass: `rgb(${RAMP.grass[3].join(',')})`, ramp: RAMP, races: {}, anims: [], ms: {}, shieldIn: W.render.shield_arm?.in || [], credit: [] };
const anims = real(W.animations).map(([k]) => k);
let strips = 0, bytes = 0;
for (const race of races) {
  const R = raceRules(W, race), dir = join(store, race, 'layers'), L = {};
  const mine = Object.fromEntries(real(W.parts).filter(([k, p]) => (p.races === 'all' || p.races.includes(race)) && live(p) && p.status !== 'stand-in' && (!['weapon', 'shield'].includes(p.kind) || p.status === 'approved') && R.parts[k] && existsSync(join(dir, k))));
  for (const k of Object.keys(mine)) {
    const names = readdirSync(join(dir, k)), keys = new Set(names.map(n => n.match(/^(.+)\.(S|SW|W|NW|N|NE|E|SE)\.00\.png$/)).filter(Boolean).map(m => `${m[1]}|${m[2]}`));
    for (const ks of keys) { const [key, side] = ks.split('|'), f = s => [...Array(FRAMES).keys()].map(i => join(dir, k, `${key}.${side}.${nn(i)}${s}`));
      if (!f('.png').every(existsSync)) continue;
      const body = strip(f('.png')), shadow = f('.shadow.png').every(existsSync) ? strip(f('.shadow.png')) : null; if (!body) continue;
      ((L[k] ||= {})[key] ||= {})[side] = { body, shadow }; strips++; bytes += body[4].length + (shadow ? shadow[4].length : 0); }
  }
  const p = W.races[race];
  D.races[race] = { slots: R.slots, body: R.body, outfit: p.outfit, ramps: R.ramps, channels: R.channels, colours: R.colours, layers: L,
    parts: Object.fromEntries(Object.entries(mine).map(([k, q]) => [k, { slot: R.parts[k].slot, kind: q.kind, hides: R.parts[k].hides || [], arms: !!q.arms, what: q.what || '' }])) };
}
for (const an of anims) {
  const has = races.some(r => Object.values(D.races[r].layers).some(L => L[an] || L[`${an}+shield`]));
  const j = join(store, races[0], 'renders', an, 'SE.anim.json'), info = existsSync(j) ? JSON.parse(readFileSync(j, 'utf8')) : null;
  D.anims.push({ name: an, has, why: W.animations[an].why || '' });
  if (info) D.ms[an] = Math.round(1000 * (info.file_frames[1] - info.file_frames[0]) / info.file_fps / FRAMES);
}
for (const [, s] of real(W.sources)) if (s.credit) D.credit.push(s.credit);

/* ---------- the page ---------- */
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
:root{--bg:#1c1c1a;--panel:#26251f;--ink:#e2ded0;--dim:#969387;--on:#c9a24a;--line:#3a382f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.35 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);padding:8px 12px}
h1{font-size:16px;margin:0 0 6px}.row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.row b{color:var(--dim);font-weight:600;min-width:72px}
button,select{background:#33322a;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:5px 9px;font:inherit;cursor:pointer}
button.on{background:var(--on);color:#1c1c1a;border-color:var(--on)}button:disabled{opacity:.35;cursor:default}
main{padding:10px 12px 30px;overflow-x:auto}table{border-collapse:separate;border-spacing:6px}
th{font-weight:600;color:var(--dim);text-align:left;vertical-align:bottom;font-size:12px;max-width:180px}
td{vertical-align:top}.cell{position:relative}.cell canvas{display:block;image-rendering:pixelated}
.note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--dim);font-size:12px;padding:6px}
.rh{color:var(--ink);font-weight:600;writing-mode:vertical-rl;transform:rotate(180deg);padding:4px}
footer{color:var(--dim);font-size:12px;padding:0 12px 20px}#info{color:var(--dim);font-size:12px}
</style></head><body><header><h1>${title}</h1>
<div class="row" id="anims"><b>Animation</b></div>
<div class="row"><b>Side</b><span id="sides"></span><b style="min-width:0;margin-left:10px">Size</b><span id="sizes"></span>
<b style="min-width:0;margin-left:10px">Speed</b><span id="speeds"></span><button id="play">Pause</button><button id="step">Step</button><span id="info"></span></div>
<div class="row" id="dress"></div></header>
<main><table id="grid"></table></main>
<footer id="foot"></footer>
<script>
const D=${JSON.stringify(D)};
const S={anim:D.anims.find(a=>a.has)?.name||'idle',side:'SE',k:2,speed:1,play:true,all:false,frame:0,dress:{},with:'plain_sword'};
for(const r in D.races){const R=D.races[r],w={};for(const p of R.outfit){w[R.parts[p]?.slot]=p}
 for(const[p,q]of Object.entries(R.parts))if((q.slot==='top'||q.slot==='over')&&!w[q.slot])w[q.slot]=p;  /* a race whose outfit has no top: wear what there is */
 S.dress[r]={wear:w,pick:{}};}
const $=id=>document.getElementById(id),el=(t,a={},...c)=>{const e=document.createElement(t);Object.assign(e,a);c.forEach(x=>e.append(x));return e};
/* the palette: for every channel its tones; a channel tied to skin, hair or dye takes the picked ramp, tone for tone */
function palette(R,pick){return R.ramps.map(r=>{const from=R.channels[r],to=(from&&pick[from])||r,n=D.ramp[r].length,m=D.ramp[to].length;
 return D.ramp[r].map((_,t)=>D.ramp[to][n===1?0:Math.round(t*(m-1)/(n-1))])})}
/* what is worn, as the rules allow: an empty slot shows the race's own body there; a part that hides slots empties them */
function outfit(R,wear){const on={...R.body,...wear};for(const p of Object.values({...on}))for(const s of (R.parts[p]?.hides||[]))delete on[s];
 return R.slots.filter(s=>on[s]&&R.parts[on[s]]).map(s=>on[s])}
/* strips are decoded once, when first needed */
const cache=new Map();function decode(src){if(cache.has(src))return cache.get(src);const p=new Promise(res=>{const im=new Image();im.onload=()=>{const c=el('canvas',{width:im.width,height:im.height}),x=c.getContext('2d');x.drawImage(im,0,0);res({im,data:x.getImageData(0,0,im.width,im.height)})};im.src=src});cache.set(src,p);return p}
/* with a shield, a part that covers the shield arm must have its raised-arm variant: its plain one shows that arm down (missing, not wrong) */
function pick(race,part,anim,side,armed){const L=D.races[race].layers[part]||{};
 if(armed&&L[anim+'+shield']?.[side])return L[anim+'+shield'][side];if(armed&&D.races[race].parts[part]?.arms)return null;return L[anim]?.[side]||null}
/* one figure: its 15 pictures composed (nearer pixel wins), painted, outlined, over its shadow; null and why if a part has none */
async function figure(race,col){const R=D.races[race],d=S.dress[race],wear={...d.wear};
 if(col.main!==undefined){if(col.main)wear.main_hand=col.main;else delete wear.main_hand}
 if(col.off)wear.off_hand=col.off;
 const shieldHere=!!col.off&&D.shieldIn.includes(S.anim);if(col.off&&!shieldHere)delete wear.off_hand;
 const parts=outfit(R,wear),got=[],missing=[];
 for(const p of parts){const s=pick(race,p,S.anim,S.side,shieldHere);if(s)got.push([p,s]);else missing.push(p)}
 if(missing.length)return{why:'not rendered: '+missing.join(', ')+' in '+S.anim+' '+S.side};
 const pal=palette(R,d.pick),dec=await Promise.all(got.map(([,s])=>decode(s.body[4]))),sh=await Promise.all(got.map(([,s])=>s.shadow?decode(s.shadow[4]):null));
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[,s]of got)for(const b of[s.body,s.shadow].filter(Boolean)){x0=Math.min(x0,b[0]-1);y0=Math.min(y0,b[1]-1);x1=Math.max(x1,b[0]+b[2]+1);y1=Math.max(y1,b[1]+b[3]+1)}
 const w=x1-x0,h=y1-y0,frames=[];
 for(let f=0;f<D.frames;f++){const c=el('canvas',{width:w,height:h}),x=c.getContext('2d');
  got.forEach(([,s],i)=>{if(s.shadow&&sh[i])x.drawImage(sh[i].im,f*s.shadow[2],0,s.shadow[2],s.shadow[3],s.shadow[0]-x0,s.shadow[1]-y0,s.shadow[2],s.shadow[3])});
  const img=x.createImageData(w,h),far=new Float64Array(w*h).fill(-1),on=new Uint8Array(w*h);
  got.forEach(([,s],i)=>{const[bx,by,bw,bh]=s.body,src=dec[i].data.data,sw=bw*D.frames;
   for(let v=0;v<bh;v++)for(let u=0;u<bw;u++){const q=(v*sw+f*bw+u)*4;if(!src[q+3])continue;const X=bx-x0+u,Y=by-y0+v,o=Y*w+X,dist=src[q+1]*256+src[q+2];
    if(far[o]<0||dist<=far[o]){far[o]=dist;on[o]=1;const col=pal[src[q]>>4][src[q]&15];img.data.set([col[0],col[1],col[2],255],o*4)}}});
  for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){const o=Y*w+X;if(on[o])continue;const n=(X>0&&on[o-1])||(X<w-1&&on[o+1])||(Y>0&&on[o-w])||(Y<h-1&&on[o+w]);if(n)img.data.set([...D.outline,255],o*4)}
  const t=el('canvas',{width:w,height:h});t.getContext('2d').putImageData(img,0,0);x.drawImage(t,0,0);frames.push(c)}
 return{frames,x0,y0,w,h,note:col.off&&!shieldHere?'no shield in '+S.anim:''}}
/* the columns: nothing held, each weapon, each shield (with the chosen weapon) */
function columns(){const all=new Map();for(const r in D.races)for(const[p,q]of Object.entries(D.races[r].parts))if(q.kind==='weapon'||q.kind==='shield')all.set(p,q);
 const cols=[{name:'nothing held',main:null}];for(const[p,q]of all)if(q.kind==='weapon')cols.push({name:p,main:p,what:q.what});
 for(const[p,q]of all)if(q.kind==='shield')cols.push({name:p,main:S.with||null,off:p,what:q.what});return cols}
let cells=[],timer=null,last=0;
async function build(){const g=$('grid');g.innerHTML='';const cols=columns(),hr=el('tr',{},el('th'));cols.forEach(c=>hr.append(el('th',{title:c.what||''},c.name+(c.off?(S.with?' + '+S.with:''):''))));g.append(hr);cells=[];
 const jobs=[];for(const r in D.races){const tr=el('tr',{},el('td',{},el('div',{className:'rh'},r)));g.append(tr);
  for(const c of cols){const td=el('td'),box=el('div',{className:'cell'});td.append(box);tr.append(td);jobs.push(figure(r,c).then(f=>({f,box,r})))}}
 const done=await Promise.all(jobs);
 // one frame size per race, so every figure of a race stands on the same line
 const per={};for(const{f,r}of done)if(f.frames){const b=per[r]||(per[r]={x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});b.x0=Math.min(b.x0,f.x0);b.y0=Math.min(b.y0,f.y0);b.x1=Math.max(b.x1,f.x0+f.w);b.y1=Math.max(b.y1,f.y0+f.h)}
 for(const{f,box,r}of done){const b=per[r]||{x0:0,y0:0,x1:80,y1:120},W2=(b.x1-b.x0)+8,H2=(b.y1-b.y0)+8,cv=el('canvas',{width:W2*S.k,height:H2*S.k});
  box.append(cv);const x=cv.getContext('2d');x.imageSmoothingEnabled=false;
  if(f.why){x.fillStyle='#2e2d27';x.fillRect(0,0,cv.width,cv.height);box.append(el('div',{className:'note'},f.why));continue}
  if(f.note)box.append(el('div',{className:'note',style:'align-items:flex-start'},f.note));
  cells.push({f,cv,x,ox:f.x0-b.x0+4,oy:f.y0-b.y0+4})}
 draw()}
function draw(){for(const c of cells){const{x,cv,f}=c;x.fillStyle=D.grass;x.fillRect(0,0,cv.width,cv.height);x.drawImage(f.frames[S.frame],c.ox*S.k,c.oy*S.k,f.w*S.k,f.h*S.k)}
 $('info').textContent=S.anim+' '+S.side+', picture '+(S.frame+1)+' of '+D.frames+', '+(D.ms[S.anim]||100)+' ms each'}
let laps=0;function tick(t){if(S.play&&t-last>=(D.ms[S.anim]||100)/S.speed){last=t;S.frame=(S.frame+1)%D.frames;
 if(S.frame===0&&S.all&&++laps>=2){laps=0;const has=D.anims.filter(a=>a.has),i=has.findIndex(a=>a.name===S.anim);setAnim(has[(i+1)%has.length].name,true);return requestAnimationFrame(tick)}
 draw()}requestAnimationFrame(tick)}
function setAnim(n,keepAll){S.anim=n;S.frame=0;if(!keepAll)S.all=false;controls();build()}
function controls(){const A=$('anims');A.querySelectorAll('button').forEach(b=>b.remove());
 const all=el('button',{className:S.all?'on':'',textContent:'All',title:'each rendered animation in turn, twice'});all.onclick=()=>{S.all=!S.all;laps=0;controls()};A.append(all);
 for(const an of D.anims){const b=el('button',{textContent:an.name.replace('_',' '),title:an.has?an.why:'not rendered yet',disabled:!an.has,className:an.name===S.anim?'on':''});b.onclick=()=>setAnim(an.name);A.append(b)}
 const sides=new Set();for(const r in D.races)for(const L of Object.values(D.races[r].layers))for(const k of[S.anim,S.anim+'+shield'])for(const s in(L[k]||{}))sides.add(s);
 const sd=$('sides');sd.innerHTML='';for(const s of['S','SW','W','NW','N','NE','E','SE']){const b=el('button',{textContent:s,disabled:!sides.has(s),className:s===S.side?'on':''});b.onclick=()=>{S.side=s;controls();build()};sd.append(b)}
 if(!sides.has(S.side)&&sides.size){S.side=[...sides][0]}
 const sz=$('sizes');sz.innerHTML='';for(const k of[1,2,3,4]){const b=el('button',{textContent:k+'x',className:k===S.k?'on':''});b.onclick=()=>{S.k=k;controls();build()};sz.append(b)}
 const sp=$('speeds');sp.innerHTML='';for(const v of[.25,.5,1,2]){const b=el('button',{textContent:v+'x',className:v===S.speed?'on':''});b.onclick=()=>{S.speed=v;controls()};sp.append(b)}
 $('play').textContent=S.play?'Pause':'Play';
 const dr=$('dress');dr.innerHTML='';dr.append(el('b',{},'Dress'));
 for(const r in D.races){const R=D.races[r],d=S.dress[r];
  for(const slot of R.slots){if(slot==='main_hand'||slot==='off_hand')continue;const opts=Object.entries(R.parts).filter(([,q])=>q.slot===slot).map(([p])=>p);if(!opts.length||['body','legs','feet'].includes(slot))continue;
   const s=el('select',{title:r+' '+slot});s.append(el('option',{value:'',textContent:r+' '+slot+': none'}));opts.forEach(p=>s.append(el('option',{value:p,textContent:r+' '+slot+': '+p,selected:d.wear[slot]===p})));
   s.onchange=()=>{if(s.value)d.wear[slot]=s.value;else delete d.wear[slot];build()};dr.append(s)}
  for(const[ch,list]of Object.entries(R.colours||{})){if(list.length<2)continue;const s=el('select',{title:r+' '+ch});list.forEach(c=>s.append(el('option',{value:c,textContent:r+' '+ch+' colour: '+c,selected:(d.pick[ch]||list[0])===c})));s.onchange=()=>{d.pick[ch]=s.value;build()};dr.append(s)}}
 const ws=el('select',{title:'what the shield columns hold in the other hand'});ws.append(el('option',{value:'',textContent:'shields with: nothing'}));
 const weps=new Set();for(const r in D.races)for(const[p,q]of Object.entries(D.races[r].parts))if(q.kind==='weapon')weps.add(p);
 weps.forEach(p=>ws.append(el('option',{value:p,textContent:'shields with: '+p,selected:S.with===p})));ws.onchange=()=>{S.with=ws.value;build()};dr.append(ws)}
$('play').onclick=()=>{S.play=!S.play;controls()};$('step').onclick=()=>{S.play=false;S.frame=(S.frame+1)%D.frames;controls();draw()};
$('foot').innerHTML='Drawn from the intake\\'s layer pictures as the game draws them: the nearer pixel wins, the race\\'s colours, a 1 px outline, the parts\\' shadows. A cell that says "not rendered" needs that part rendered in that animation and side. Models by Quaternius (CC0). '+D.credit.map(c=>c.replace(/[<>&]/g,'')).join(' ');
controls();build();requestAnimationFrame(tick);
</script></body></html>`;
writeFileSync(out, page);
console.log(`${out}: ${races.join(', ')}; ${strips} strips, ${(page.length / 1e6).toFixed(1)} MB; animations with pictures: ${D.anims.filter(x => x.has).map(x => x.name).join(', ')}`);
