// A page to look at the items on a phone: one file, the pictures inside it. It reads the sprites items.mjs wrote, so run that first.
//   node scripts/art/items.mjs && node scripts/art/items_page.mjs [--items game/client/art/made/items] [--out scripts/art/out/items.html]
// An 8 by 8 patch of grass with a human and every item lying on it (tap one to see its name), zoom buttons, a pack, then every item big: on the
// ground and in the pack, with its metals or dyes to pick. Holds the green tileset's grass and the Creator's body for the human: bought
// art, never commit the page.
import { ITEMS, spritesOf, box } from './items.mjs';
import { readPng } from './png.mjs';
import { SIZE } from './kit.mjs';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const dir = flag('--items', 'game/client/art/made/items'), path = flag('--out', 'scripts/art/out/items.html');
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const body = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(body)); return Buffer.concat([l, body, c]); };
const uri = (rgba, w, h) => { const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6; const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64'); };
const crop = (buf, [bx, by, bw, bh]) => { const o = Buffer.alloc(bw * bh * 4); for (let y = 0; y < bh; y++) buf.copy(o, y * bw * 4, ((by + y) * SIZE + bx) * 4, ((by + y) * SIZE + bx + bw) * 4); return o; };

// the items, read back from their sprites; each ground picture keeps the tile's middle at 128,208 so the page can stand it on a tile
const items = Object.keys(ITEMS).map(nm => {
  const ss = spritesOf(nm), read = f => { if (!existsSync(f)) { console.error(`${f} is missing: run node scripts/art/items.mjs first.`); process.exit(1); } return readPng(f).data; };
  const so = read(`${dir}/${nm} Shadow.png`), pics = ss.map(s => read(`${dir}/${s.file}.png`)), packs = ITEMS[nm].pack ? ss.map(s => read(`${dir}/pack/${s.file}.png`)) : null;   // the sack is never in a pack
  const b = box(so, ...pics), pb = packs && box(...packs);
  return { nm, x: b[0], y: b[1], shadow: uri(crop(so, b), b[2], b[3]), metals: ss.map((s, i) => ({ m: s.label, src: uri(crop(pics[i], b), b[2], b[3]), pack: packs ? uri(crop(packs[i], pb), pb[2], pb[3]) : null })) };
});
// the human, standing, facing the viewer, at the game's size, in a 256 px picture with the feet on the tile's middle
const CRE = 'game/client/art/creator/', man = Buffer.alloc(SIZE * SIZE * 4);
const lay = (x, y, c, a) => { if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return; const o = (y * SIZE + x) * 4, A = man[o + 3] / 255, na = a + A * (1 - a); for (let k = 0; k < 3; k++) man[o + k] = Math.round((c[k] * a + man[o + k] * A * (1 - a)) / na); man[o + 3] = Math.round(na * 255); };
for (const [part, tint] of [['Shadow', null], ['NakedBody', [232, 180, 140]], ['Legs1', [91, 70, 54]], ['Shoes1', [58, 42, 32]], ['Chest1', [63, 111, 181]], ['Head1', [107, 74, 43]]]) {
  if (!existsSync(`${CRE}${part}/Idle.png`)) continue;
  const p = readPng(`${CRE}${part}/Idle.png`);
  for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) { const s = ((2 * 128 + Math.floor(y / 2.5)) * p.width + Math.floor(x / 2.5)) * 4, a = p.data[s + 3] / 255 * (tint ? 1 : .35); if (a) lay(128 + x - 165, 208 + y - 215, tint ? tint.map((t, k) => Math.min(255, p.data[s + k] * t / 185)) : [0, 0, 0], a); }
}
const grass = readPng('game/client/art/tiles/Ground A2_S.png');
const data = { items, man: uri(man, SIZE, SIZE), grass: uri(grass.data, SIZE, SIZE) };
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renown: items on the ground and in the pack</title>
<style>
body{margin:0;background:#2e2b27;color:#ece8d6;font:15px/1.35 system-ui,sans-serif}
header{padding:10px 12px 4px}h1{font-size:17px;margin:0 0 2px}p{margin:2px 0;color:#b9b3a0;font-size:13px}
.bar{display:flex;gap:6px;align-items:center;padding:6px 12px;position:sticky;top:0;background:#2e2b27;z-index:2}
button{background:#4a453d;color:#ece8d6;border:1px solid #6a6458;border-radius:7px;padding:7px 11px;font-size:14px}
button.on{background:#7c6a3a;border-color:#c4a85a}
#wrap{overflow:auto;-webkit-overflow-scrolling:touch;border-top:1px solid #444;border-bottom:1px solid #444;background:#1c1b19}
canvas{image-rendering:pixelated;display:block}
#tap{min-height:20px;padding:4px 12px;color:#f1d46e}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:12px}
.card{background:#3a362f;border-radius:10px;padding:8px}.card.hl{outline:2px solid #f1d46e}
.card .pics{display:flex;gap:4px}.card .pic{background:#46602c;border-radius:6px;display:flex;align-items:center;justify-content:center;height:130px;flex:1.4;overflow:hidden;position:relative}.card .pk{background:#3e3529;flex:1}
h2{font-size:16px;margin:14px 12px 2px}.sub{padding:0 12px}
#inv{display:grid;grid-template-columns:repeat(4,58px);gap:3px;background:#3e3529;border:2px solid #5c4f3c;border-radius:6px;padding:6px;margin:8px 12px;width:max-content}
#inv div{width:58px;height:52px;display:flex;align-items:center;justify-content:center;background:#463b2e;border-radius:3px}#inv img{image-rendering:pixelated}
.card img{image-rendering:pixelated;position:absolute;max-width:96%;max-height:96%;object-fit:contain}
.card b{display:block;margin:6px 0 4px}.ms{display:flex;gap:4px;flex-wrap:wrap}.ms button{padding:4px 8px;font-size:12px}
</style></head><body>
<header><h1>Items: ground and pack</h1><p>On the ground (laid flat, the UO way) around a human. 2× is the game's own size on a phone; Fit fills the screen. Tap an item to see its name, drag to look around. Then the pack (the RuneScape way), then each item big: on the ground, and in the pack, with its metals or dyes to pick.</p></header>
<div class="bar"><span>Zoom</span><button data-z="0" class="on">Fit</button><button data-z="1">1×</button><button data-z="2">2×</button><button data-z="3">3×</button><button data-z="4">4×</button></div>
<div id="wrap"><canvas id="c"></canvas></div><div id="tap"></div>
<h2>In the pack</h2><p class="sub">The RuneScape way: the same drawing turned to face you, long things drawn smaller to fit a slot.</p><div id="inv"></div>
<h2>Each item</h2>
<div class="grid" id="grid"></div>
<script>
const D=${JSON.stringify(data)};
const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
const N=8,T=[64,32],W=N*128,H=N*64+30,OX=(N-1)*64-64,OY=-150;
const at=(x,y)=>[OX+(x-y)*T[0],OY+(x+y)*T[1]];
// where things stand: the human, then the items in rows
const spots=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if((x+y)%2===0&&!(x===4&&y===4))spots.push([x,y]);
const man=[4,4];let pick=[],zoom=0;
(async()=>{
 const g=await load(D.grass),m=await load(D.man);
 const its=await Promise.all(D.items.map(async it=>({...it,sh:await load(it.shadow),pics:await Promise.all(it.metals.map(x=>load(x.src)))})));
 pick=its.map(it=>it.metals[0].m==='undyed'?0:it.pics.length-1);
 const c=document.getElementById('c'),ctx=c.getContext('2d');c.width=W;c.height=H;
 function draw(){ctx.clearRect(0,0,W,H);
for(let r=0;r<2*N-1;r++)for(let x=0;x<N;x++){const y=r-x;if(y<0||y>=N)continue;const[px,py]=at(x,y);ctx.drawImage(g,px,py);}
const things=[{k:'man',t:man}].concat(its.map((it,i)=>({k:i,t:spots[i]}))).sort((a,b)=>(a.t[0]+a.t[1])-(b.t[0]+b.t[1]));
for(const th of things){const[px,py]=at(...th.t);
 if(th.k==='man'){ctx.drawImage(m,px,py);continue;}
 const it=its[th.k];ctx.globalAlpha=.3;ctx.drawImage(it.sh,px+it.x,py+it.y);ctx.globalAlpha=1;ctx.drawImage(it.pics[pick[th.k]],px+it.x,py+it.y);}
const z=zoom||Math.min(4,2*document.getElementById('wrap').clientWidth/W);c.style.width=(W*z/2)+'px';c.style.height=(H*z/2)+'px';}
 // shown at zoom/2 CSS px a picture px (phones have about 2 screen px a CSS px), so 2x is the game's own size on a phone
 document.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{zoom=+b.dataset.z;document.querySelectorAll('[data-z]').forEach(o=>o.classList.toggle('on',o===b));draw();});
 c.onclick=e=>{const r=c.getBoundingClientRect(),px=(e.clientX-r.left)*W/r.width,py=(e.clientY-r.top)*H/r.height;
let best=-1,bd=1e9;its.forEach((it,i)=>{const[sx,sy]=at(...spots[i]);const d=Math.hypot(px-sx-128,(py-sy-200)*1.6);if(d<bd){bd=d;best=i;}});
if(bd<90){document.getElementById('tap').textContent=its[best].nm+(its[best].metals[pick[best]].m?' ('+its[best].metals[pick[best]].m+')':'');
 document.querySelectorAll('.card').forEach((cd,i)=>cd.classList.toggle('hl',i===best));}else document.getElementById('tap').textContent='';};
 const grid=document.getElementById('grid'),inv=document.getElementById('inv');
 its.forEach((it,i)=>{const cd=document.createElement('div');cd.className='card';
const w=it.pics[0].width,h=it.pics[0].height,k=Math.max(1,Math.floor(Math.min(100/w,110/h)));
cd.innerHTML='<div class="pics"><div class="pic"></div><div class="pic pk"></div></div><b>'+(i+1)+'. '+it.nm+'</b><div class="ms"></div>';
const pic=cd.querySelector('.pic'),pk=new Image(),pkb=cd.querySelector('.pk');pk.style.position='absolute';pkb.append(pk);const slot=document.createElement('div'),sl=new Image();slot.append(sl);if(it.metals[0].pack)inv.append(slot);else pkb.textContent='never in a pack';slot.onclick=()=>{document.getElementById('tap').textContent=it.nm;cd.scrollIntoView({behavior:'smooth',block:'center'});};const sh=it.sh.cloneNode();sh.style.cssText='opacity:.3;filter:brightness(0);width:'+w*k+'px';const im=new Image();im.style.width=w*k+'px';pic.append(sh,im);
const set=j=>{pick[i]=j;im.src=it.metals[j].src;if(it.metals[j].pack)pk.src=sl.src=it.metals[j].pack;pk.onload=()=>{const k=Math.max(1,Math.floor(Math.min(70/pk.naturalWidth,110/pk.naturalHeight)));pk.style.width=pk.naturalWidth*k+'px';};cd.querySelectorAll('.ms button').forEach((b,q)=>b.classList.toggle('on',q===j));draw();};
if(it.metals.length>1)it.metals.forEach((mm,j)=>{const b=document.createElement('button');b.textContent=mm.m;b.onclick=()=>set(j);cd.querySelector('.ms').append(b);});
grid.append(cd);set(pick[i]);});
 draw();const wrap=document.getElementById('wrap');wrap.scrollLeft=(wrap.scrollWidth-wrap.clientWidth)/2;
})();
</script></body></html>`;
mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, page); console.log(`Page: ${path} (${(page.length / 1024).toFixed(0)} KB)`);
