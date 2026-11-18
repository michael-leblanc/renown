// A page to try a place on a phone: a patch of land where you lay ground, tileset pieces, code-made props, items and characters,
// turn them, take them away, and tap to make a character walk there. One file, every picture inside it.
//   node scripts/art/scene.mjs [--out prototype/shots/scene.html]
// Reads the tileset pieces in game/client/art/tiles/, the code-made sprites in prototype/art/made/ (props.mjs, camp.mjs,
// furniture.mjs, shore.mjs, items.mjs write them), the Creator parts in game/client/art/creator/ and the test game's
// character data (tints, sizes, layer order; D121, D205). Water is a flat stand-in: the repo has no water tile yet.
// Holds bought art (the tileset, the Creator): never commit the page.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { readPng } from './png.mjs';
import { ITEMS, spritesOf } from './items.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const out = flag('--out', 'prototype/shots/scene.html');
const TILES = 'game/client/art/tiles/', MADE = 'prototype/art/made/', CRE = 'game/client/art/creator/', AX = 128, AY = 208;

/* ---------- PNG to data: address, cropped to what is drawn ---------- */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const chunk = (t, d) => { const body = Buffer.concat([Buffer.from(t), d]), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); let x = 0xffffffff; for (const b of body) x = CRC[(x ^ b) & 255] ^ (x >>> 8); c.writeUInt32BE((x ^ 0xffffffff) >>> 0); return Buffer.concat([l, body, c]); };
function uri(rgba, w, h) {
  const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const IMGS = [];                                         // every picture once: [data address, x, y] with x, y from the tile's middle
function pic(buf, w = 256, h = 256) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return -1;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) buf.copy(o, y * cw * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4);
  IMGS.push([uri(o, cw, ch), x0 - AX, y0 - AY]); return IMGS.length - 1;
}
const file = f => { const p = readPng(f); return Buffer.from(p.data); };
/** A strip of frames, each 256 x 256: cut to the box round what any frame draws, and kept as a strip. */
function strip(f, fps) {
  const p = readPng(f), n = p.width / 256, d = Buffer.from(p.data);
  let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
  for (let y = 0; y < 256; y++) for (let x = 0; x < p.width; x++) if (d[(y * p.width + x) * 4 + 3]) { const fx = x % 256; if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return -1;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = Buffer.alloc(cw * n * ch * 4);
  for (let k = 0; k < n; k++) for (let y = 0; y < ch; y++) d.copy(o, (y * cw * n + k * cw) * 4, ((y0 + y) * p.width + k * 256 + x0) * 4, ((y0 + y) * p.width + k * 256 + x1 + 1) * 4);
  IMGS.push([uri(o, cw * n, ch), x0 - AX, y0 - AY, n, fps]); return IMGS.length - 1;
}
const SIDES = ['S', 'E', 'N', 'W'];

/* ---------- the pieces ---------- */
const P = [];                                            // { n: name, g: group, k: 'g' ground or 'o' object, s: [picture per side or variant], sh: [shadow], l: side labels }
const add = (n, g, k, s, sh = [], l = null) => { if (s.some(i => i >= 0)) P.push({ n, g, k, s, sh, l }); };

// ground: the tileset's, and stand-in water and sand drawn here as a flat diamond
for (const n of ['Ground A2', 'Ground A1', 'Ground A22', 'Ground A18']) add(n, 'Ground', 'g', [pic(file(`${TILES}${n}_S.png`))]);
const diamond = (base, seed) => {
  const b = Buffer.alloc(256 * 256 * 4);
  for (let y = 176; y <= 240; y++) for (let x = 64; x <= 192; x++) {
    if (Math.abs(x - AX) / 64 + Math.abs(y - AY) / 32 > 1) continue;
    const w = Math.sin(x * .21 + y * .5 + seed) + Math.sin(x * .07 - y * .9 + seed * 2), t = w > 1.2 ? 1.12 : w < -1.3 ? .9 : 1, o = (y * 256 + x) * 4;
    b[o] = base[0] * t; b[o + 1] = base[1] * t; b[o + 2] = base[2] * t; b[o + 3] = 255;
  }
  return pic(b);
};
add('Sand (stand-in)', 'Ground', 'g', [diamond([176, 150, 104], 3)]);
// the animated pieces anim.mjs wrote: ground (water), props, effects
const ANIM = 'prototype/art/made/anim/', AM = existsSync(`${ANIM}anim.json`) ? JSON.parse(readFileSync(`${ANIM}anim.json`, 'utf8')) : {};
for (const [n, a] of Object.entries(AM)) {
  const s = a.sides.map(v => strip(`${ANIM}${n}_${v}.png`, a.fps)), sh = a.shadow ? a.sides.map(v => pic(file(`${ANIM}${a.shadow}_${v}.png`))) : [];
  if (a.ground) add(n, 'Ground', 'g', s, [], a.sides.length > 1 ? a.sides : null);
  else if (a.effect) add(n, 'Effects', 'f', s);
  else add(n, 'Animated', 'o', s, sh, a.sides);
}
if (existsSync(`${MADE}effects/Waking Glow.png`)) { const P0 = P.length; add('Waking Glow', 'Effects', 'f', [strip(`${MADE}effects/Waking Glow Front.png`, 8)]); if (P[P0]) P[P0].u = strip(`${MADE}effects/Waking Glow.png`, 8); }

// the tileset's pieces the repo holds
const TREE_SH = pic(file(`${TILES}Tree Shadow.png`));
for (const n of ['Tree A1', 'Tree A2', 'Tree D1']) add(n, 'Tileset', 'o', [pic(file(`${TILES}${n}_S.png`))], [TREE_SH]);
add('Stone A1', 'Tileset', 'o', [pic(file(`${TILES}Stone A1_S.png`))], [pic(file(`${TILES}Shadow5_S.png`))]);
add('Stone A2', 'Tileset', 'o', [pic(file(`${TILES}Stone A2_S.png`))], [pic(file(`${TILES}Shadow4_S.png`))]);
for (const n of ['Wall A1', 'Wall A4', 'Wall A15', 'Wall A16', 'Door A1']) add(n, 'Tileset', 'o', SIDES.map(s => pic(file(`${TILES}${n}_${s}.png`))), [], SIDES);

// the code-made props: every name in prototype/art/made with four sides, and its shadow
const names = [...new Set(readdirSync(MADE).filter(f => /_[SENW]\.png$/.test(f)).map(f => f.slice(0, -6)))].filter(n => !/Shadow/.test(n)).sort();
for (const n of names) {
  const shName = [n.replace(/ (A\d+)/, ' Shadow $1'), n.replace(/ A\d+$/, ' Shadow')].find(s => existsSync(`${MADE}${s}_S.png`));
  add(n, 'Made', 'o', SIDES.map(s => existsSync(`${MADE}${n}_${s}.png`) ? pic(file(`${MADE}${n}_${s}.png`)) : -1), shName ? SIDES.map(s => pic(file(`${MADE}${shName}_${s}.png`))) : [], SIDES);
}
// the items, one picture per metal or dye (Turn picks the next one)
for (const n of Object.keys(ITEMS)) {
  const ss = spritesOf(n).filter(s => existsSync(`${MADE}items/${s.file}.png`)); if (!ss.length) continue;
  const sh = existsSync(`${MADE}items/${n} Shadow.png`) ? [pic(file(`${MADE}items/${n} Shadow.png`))] : [];
  add(n, 'Items', 'o', ss.map(s => pic(file(`${MADE}items/${s.file}.png`))), sh, ss.map(s => s.label || ''));
}

/* ---------- the characters: the test game's three races, Idle and Walk, all layers stacked per side ---------- */
const D = JSON.parse(readFileSync('prototype/character/character_data.json', 'utf8')), GREY = D.sheet.grey_ref * 255;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const RACES = Object.entries(D.races).map(([name, r]) => {
  const sheets = {};
  for (const anim of ['Idle', 'Walk']) {
    const W = readPng(`${CRE}NakedBody/${anim}.png`).width, H = 8 * 128, o = Buffer.alloc(W * H * 4);
    const parts = Object.fromEntries(D.parts.map(p => [p, readPng(`${CRE}${p}/${anim}.png`)]));
    D.directions.forEach((dir, row) => {
      for (const p of D.layer_order[dir]) {
        const s = parts[p], t = p === 'Shadow' ? null : hex(r.tints[p] || '#b9b9b9'), al = p === 'Shadow' ? D.shadow_alpha : 1;
        for (let y = row * 128; y < row * 128 + 128; y++) for (let x = 0; x < Math.min(W, s.width); x++) {
          const i = (y * s.width + x) * 4, a = s.data[i + 3] / 255 * al; if (!a) continue;
          const c = t ? t.map((v, k) => Math.min(255, s.data[i + k] * v / GREY)) : [0, 0, 0], q = (y * W + x) * 4, A = o[q + 3] / 255, na = a + A * (1 - a);
          for (let k = 0; k < 3; k++) o[q + k] = Math.round((c[k] * a + o[q + k] * A * (1 - a)) / na);
          o[q + 3] = Math.round(na * 255);
        }
      }
    });
    sheets[anim] = { u: uri(o, W, H), n: W / 128 };
  }
  return { name, scale: r.scale, sheets };
});

const data = { imgs: IMGS, pieces: P, races: RACES.map(r => ({ name: r.name, scale: r.scale, sheets: r.sheets })), dirs: D.directions, steps: D.direction_grid_step, spriteScale: D.sprite_scale, foot: D.sheet.foot_origin, shadowAlpha: 0.3, tileSeconds: 0.6, idleFps: D.anim_fps.Idle, walkFps: 15.4 };

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Renown: try a place</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#1c1a17;color:#ece8d6;font:15px/1.3 system-ui,sans-serif;overflow:hidden}
#wrap{display:flex;flex-direction:column;height:100%}
canvas{flex:1;min-height:0;width:100%;touch-action:none;display:block;background:#24221e}
#bar{display:flex;gap:6px;padding:6px;overflow-x:auto;background:#2e2b27;flex:none}
#tabs{display:flex;gap:6px;padding:0 6px 6px;overflow-x:auto;background:#2e2b27;flex:none}
#pal{display:flex;gap:6px;padding:6px;overflow-x:auto;background:#262420;flex:none;height:92px}
button{flex:none;background:#3d3934;color:#ece8d6;border:1px solid #57524a;border-radius:8px;padding:8px 11px;font:inherit;min-height:40px}
button.on{background:#7a5c2e;border-color:#c9a25a}
.pc{flex:none;width:76px;height:78px;border:1px solid #4a463f;border-radius:8px;background:#34312c;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px}
.pc.on{border-color:#c9a25a;background:#4d3e26}
.pc img{max-width:68px;max-height:54px;image-rendering:pixelated}
.pc span{font-size:10px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px}
#msg{position:fixed;left:8px;top:8px;background:#000a;padding:5px 9px;border-radius:6px;font-size:13px;pointer-events:none}
</style></head><body><div id="wrap">
<canvas id="c"></canvas>
<div id="bar"></div><div id="tabs"></div><div id="pal"></div></div><div id="msg"></div>
<script>
const D=${JSON.stringify(data)};
const N=14, cv=document.getElementById('c'), cx=cv.getContext('2d'), msg=document.getElementById('msg');
const imgs=D.imgs.map(([u,x,y,n,fps])=>{const i=new Image();i.src=u;return{i,x,y,n:n||1,fps:fps||1};});let NOW=0;
D.races.forEach(r=>{for(const a in r.sheets){const i=new Image();i.src=r.sheets[a].u;r.sheets[a].img=i;}});
const byName=n=>D.pieces.findIndex(p=>p.n===n);
let ground,gside,obj,fx,chars,mode='place',sel=byName('Ground A2'),selRace=-1,grid=false,zoom=1,panX=0,panY=0,active=0;
function blank(){ground=Array.from({length:N},()=>Array(N).fill(byName('Ground A2')));gside=Array.from({length:N},()=>Array(N).fill(0));obj=Array.from({length:N},()=>Array(N).fill(null));fx=Array.from({length:N},()=>Array(N).fill(null));chars=[];}
function starter(){blank();const s=byName('Sand (stand-in)'),deep=byName('Water A1'),shal=byName('Water A2'),shore=byName('Water Shore A1');
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(i>=11)ground[i][j]=deep;else if(i===10)ground[i][j]=shal;else if(i===9){ground[i][j]=shore;gside[i][j]=2;}else if(i===8)ground[i][j]=s;}
 const fxp=(n,i,j)=>{const p=byName(n);if(p>=0)fx[i][j]=p;};
 const put=(n,i,j,side=0)=>{const p=byName(n);if(p>=0)obj[i][j]={p,side};};
 put('Jetty A1',9,6);put('Jetty A1',10,6);put('Jetty A1',11,6);put('Jetty End A1',12,6);
 put('Crate A1',8,4);put('Barrel A1',8,8);put('Tree A1',3,3);put('Tree A2',2,9);put('Stone A1',5,11);put('Campfire A1 Lit',5,6);put('Tent A1',3,6,1);put('Log Seat A1',5,4);put('Bedroll A1',4,8);put('Torch A1',7,5);put('Lantern Post A1',7,9);put('Fish Rack A1',7,11);put('Net Poles A1',6,13);put('Pennant A1',6,2);put('Chopping Block A1',1,6);put('Campfire A1 Out',2,12);fxp('Smoke A1',2,12);
 for(let i=1;i<6;i++)put('Fence A1',i,1);
 chars=[{r:0,i:7,j:6,fi:7,fj:6,dir:0,path:[],t:0}];}
function save(){try{localStorage.setItem('renown-scene',JSON.stringify({gside,fx:fx.map(r=>r.map(p=>p===null?null:D.pieces[p].n)),ground:ground.map(r=>r.map(p=>D.pieces[p].n)),obj:obj.map(r=>r.map(o=>o&&{n:D.pieces[o.p].n,side:o.side})),chars:chars.map(c=>({r:c.r,i:c.i,j:c.j,dir:c.dir}))}));say('Saved');}catch(e){say('Could not save here');}}
function load(){try{const s=JSON.parse(localStorage.getItem('renown-scene'));if(!s)return false;blank();
 s.ground.forEach((r,i)=>r.forEach((n,j)=>{const p=byName(n);if(p>=0)ground[i][j]=p;}));if(s.gside)gside=s.gside;if(s.fx)s.fx.forEach((r,i)=>r.forEach((n,j)=>{const p=n&&byName(n);if(p>=0&&n)fx[i][j]=p;}));
 s.obj.forEach((r,i)=>r.forEach((o,j)=>{if(o){const p=byName(o.n);if(p>=0)obj[i][j]={p,side:o.side};}}));
 chars=s.chars.map(c=>({...c,fi:c.i,fj:c.j,path:[],t:0}));return true;}catch(e){return false;}}
let sayT=0;function say(t){msg.textContent=t;msg.style.display='block';sayT=performance.now();}
// screen place of a tile's middle, before zoom and pan
const tx=(i,j)=>(i-j)*64, ty=(i,j)=>(i+j)*32;
function resize(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;}
function fit(){resize();const w=cv.width,h=cv.height;zoom=Math.min(w/(8*128),h/(8*64));const c=chars[active]||{i:N/2,j:N/2};panX=w/2-tx(c.i,c.j)*zoom;panY=h/2-(ty(c.i,c.j)-40)*zoom;}
function all(){resize();const w=cv.width,h=cv.height;zoom=Math.min(w/(N*128+40),h/(N*64+200));panX=w/2;panY=h/2-(ty(N/2,N/2)-60)*zoom;}
function toTile(px,py){const d=devicePixelRatio||1,X=(px*d-panX)/zoom,Y=(py*d-panY)/zoom;return[Math.round((X/64+Y/32)/2),Math.round((Y/32-X/64)/2)];}
function drawPic(k,X,Y,a=1){if(k<0||k===undefined)return;const m=imgs[k];if(!m.i.complete)return;cx.globalAlpha=a;
 if(m.n>1){const w=m.i.width/m.n,f=Math.floor(NOW/1000*m.fps)%m.n;cx.drawImage(m.i,f*w,0,w,m.i.height,X+m.x,Y+m.y,w,m.i.height);}else cx.drawImage(m.i,X+m.x,Y+m.y);cx.globalAlpha=1;}
function frame(now){
 NOW=now;const dt=Math.min(.1,(now-(frame.last||now))/1000);frame.last=now;
 for(const c of chars){if(c.path.length){c.t+=dt/D.tileSeconds;const[ni,nj]=c.path[0];
   const st=[ni-c.i,nj-c.j];c.dir=D.steps.findIndex(s=>s[0]===st[0]&&s[1]===st[1]);
   if(c.t>=1){c.i=ni;c.j=nj;c.path.shift();c.t=c.path.length?c.t-1:0;}
   const[a,b]=c.path.length?c.path[0]:[c.i,c.j];c.fi=c.i+(a-c.i)*c.t;c.fj=c.j+(b-c.j)*c.t;}else{c.fi=c.i;c.fj=c.j;}}
 cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#24221e';cx.fillRect(0,0,cv.width,cv.height);
 cx.setTransform(zoom,0,0,zoom,panX,panY);cx.imageSmoothingEnabled=false;
 const order=[];for(let s=0;s<2*N-1;s++)for(let i=0;i<N;i++){const j=s-i;if(j>=0&&j<N)order.push([i,j]);}
 for(const[i,j]of order){const g=D.pieces[ground[i][j]];drawPic(g.s[Math.min(gside[i][j]||0,g.s.length-1)],tx(i,j),ty(i,j));}
 if(grid){cx.strokeStyle='#ffffff30';cx.lineWidth=1/zoom;for(const[i,j]of order){const X=tx(i,j),Y=ty(i,j);cx.beginPath();cx.moveTo(X,Y-32);cx.lineTo(X+64,Y);cx.lineTo(X,Y+32);cx.lineTo(X-64,Y);cx.closePath();cx.stroke();}}
 for(const[i,j]of order){const o=obj[i][j];if(!o)continue;const p=D.pieces[o.p];if(p.sh.length)drawPic(p.sh[Math.min(o.side,p.sh.length-1)],tx(i,j),ty(i,j),D.shadowAlpha);}
 for(const[i,j]of order){const f=fx[i][j];if(f!==null&&D.pieces[f].u!==undefined)drawPic(D.pieces[f].u,tx(i,j),ty(i,j));}
 const things=[];for(const[i,j]of order){if(obj[i][j])things.push([i+j,0,i,j]);if(fx[i][j]!==null)things.push([i+j+.02,2,i,j]);}chars.forEach((c,k)=>things.push([c.fi+c.fj+.01,1,k]));
 things.sort((a,b)=>a[0]-b[0]);
 for(const t of things){if(t[1]===2){drawPic(D.pieces[fx[t[2]][t[3]]].s[0],tx(t[2],t[3]),ty(t[2],t[3]));}else if(!t[1]){const o=obj[t[2]][t[3]],p=D.pieces[o.p];drawPic(p.s[o.side],tx(t[2],t[3]),ty(t[2],t[3]));}
  else{const c=chars[t[2]],r=D.races[c.r],sh=r.sheets[c.path.length?'Walk':'Idle'];if(!sh.img.complete)continue;
   const f=Math.floor(now/1000*(c.path.length?D.walkFps:D.idleFps))%sh.n,sx=D.spriteScale*r.scale[0],sy=D.spriteScale*r.scale[1],X=tx(c.fi,c.fj),Y=ty(c.fi,c.fj);
   cx.drawImage(sh.img,f*128,c.dir*128,128,128,X-D.foot[0]*sx,Y-D.foot[1]*sy,128*sx,128*sy);
   if(t[2]===active&&chars.length>1){cx.fillStyle='#c9a25a';cx.beginPath();cx.arc(X,Y-150*sy/2.5,5,0,7);cx.fill();}}}
 if(sayT&&now-sayT>1800){msg.style.display='none';sayT=0;}
 requestAnimationFrame(frame);}
function tap(i,j){if(i<0||j<0||i>=N||j>=N)return;
 if(mode==='place'){if(selRace>=0){chars.push({r:selRace,i,j,fi:i,fj:j,dir:2,path:[],t:0});active=chars.length-1;say(D.races[selRace].name+' placed');return;}
  const p=D.pieces[sel];if(p.k==='g'){ground[i][j]=sel;gside[i][j]=0;}else if(p.k==='f')fx[i][j]=sel;else obj[i][j]={p:sel,side:0};}
 else if(mode==='erase'){const k=chars.findIndex(c=>c.i===i&&c.j===j);if(k>=0){chars.splice(k,1);active=0;}else if(obj[i][j])obj[i][j]=null;else fx[i][j]=null;}
 else if(mode==='turn'){const k=chars.findIndex(c=>c.i===i&&c.j===j);if(k>=0){chars[k].dir=(chars[k].dir+1)%8;return;}
  const o=obj[i][j];if(!o){const g=D.pieces[ground[i][j]];if(g.s.length>1){gside[i][j]=((gside[i][j]||0)+1)%g.s.length;say(g.n+' · '+g.l[gside[i][j]]);}return;}if(o){const p=D.pieces[o.p];o.side=(o.side+1)%p.s.length;if(p.s[o.side]<0)o.side=(o.side+1)%p.s.length;if(p.l)say(p.n+(p.l[o.side]?' · '+p.l[o.side]:''));}}
 else if(mode==='walk'){const k=chars.findIndex(c=>c.i===i&&c.j===j);if(k>=0){active=k;say(D.races[chars[k].r].name+' picked');return;}
  const c=chars[active];if(!c)return say('Place a character first');let a=c.path.length?c.path[c.path.length-1]:[c.i,c.j];const path=c.path.length?[c.path[0]]:[];a=path.length?path[0]:[c.i,c.j];
  while(a[0]!==i||a[1]!==j){a=[a[0]+Math.sign(i-a[0]),a[1]+Math.sign(j-a[1])];path.push(a);}c.path=path;}
 else{const o=obj[i][j],k=chars.findIndex(c=>c.i===i&&c.j===j);say(k>=0?D.races[chars[k].r].name:o?D.pieces[o.p].n+(D.pieces[o.p].l&&D.pieces[o.p].l[o.side]?' · '+D.pieces[o.p].l[o.side]:''):D.pieces[ground[i][j]].n);}}
// touch: tap, drag to move the view, pinch to zoom
const pts=new Map();let moved=false,pinch=0,start=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved=false;start=[e.clientX,e.clientY];if(pts.size===2){const[a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const d=devicePixelRatio||1,p=pts.get(e.pointerId);
 if(pts.size===2){pts.set(e.pointerId,[e.clientX,e.clientY]);const[a,b]=[...pts.values()],h=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch){zoomAt((a[0]+b[0])/2,(a[1]+b[1])/2,h/pinch);}pinch=h;moved=true;return;}
 if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>8)moved=true;if(moved){panX+=(e.clientX-p[0])*d;panY+=(e.clientY-p[1])*d;}pts.set(e.pointerId,[e.clientX,e.clientY]);});
cv.addEventListener('pointerup',e=>{const was=pts.size;pts.delete(e.pointerId);if(pts.size<2)pinch=0;if(was===1&&!moved){const r=cv.getBoundingClientRect();tap(...toTile(e.clientX-r.left,e.clientY-r.top));}});
cv.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);pinch=0;});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.15:1/1.15);},{passive:false});
function zoomAt(px,py,f){const d=devicePixelRatio||1,r=cv.getBoundingClientRect(),X=(px-r.left)*d,Y=(py-r.top)*d,nz=Math.max(.15,Math.min(6,zoom*f));panX=X-(X-panX)*nz/zoom;panY=Y-(Y-panY)*nz/zoom;zoom=nz;}
// the buttons
const bar=document.getElementById('bar'),tabs=document.getElementById('tabs'),pal=document.getElementById('pal');
const MODES=[['place','Place'],['erase','Erase'],['turn','Turn'],['walk','Walk'],['look','Look']];
function btn(t,f,parent=bar){const b=document.createElement('button');b.textContent=t;b.onclick=f;parent.appendChild(b);return b;}
const mb=MODES.map(([m,t])=>btn(t,()=>{mode=m;mb.forEach(x=>x.classList.toggle('on',x.textContent===t));}));mb[0].classList.add('on');
btn('Grid',e=>{grid=!grid;e.target.classList.toggle('on',grid);});btn('Fill ground',()=>{if(D.pieces[sel]&&D.pieces[sel].k==='g'&&selRace<0){for(let i=0;i<N;i++)for(let j=0;j<N;j++){ground[i][j]=sel;gside[i][j]=0;}}else say('Pick a ground first');});
btn('Near',fit);btn('All',all);btn('Save',save);btn('Load',()=>{if(load())say('Loaded');else say('Nothing saved');});btn('Clear',()=>{blank();});btn('Start over',()=>{starter();});
const GROUPS=['Ground','Animated','Made','Tileset','Items','Effects','People'];let tab='Ground';
const tb=GROUPS.map(g=>btn(g,()=>{tab=g;tb.forEach(x=>x.classList.toggle('on',x.textContent===g));showPal();},tabs));tb[0].classList.add('on');
function card(k,name,on,f){const d=document.createElement('div');d.className='pc'+(on?' on':'');const m=imgs[k];let im;
 if(m.n>1){im=document.createElement('canvas');const w=()=>{const fw=m.i.width/m.n;im.width=fw;im.height=m.i.height;im.getContext('2d').drawImage(m.i,0,0,fw,m.i.height,0,0,fw,m.i.height);};if(m.i.complete)w();else m.i.addEventListener('load',w);im.style.maxWidth='68px';im.style.maxHeight='54px';im.style.imageRendering='pixelated';}
 else{im=document.createElement('img');im.src=D.imgs[k][0];}const s=document.createElement('span');s.textContent=name;d.append(im,s);d.onclick=f;pal.appendChild(d);}
function showPal(){pal.innerHTML='';
 if(tab==='People'){D.races.forEach((r,k)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');const draw=()=>{g.drawImage(r.sheets.Idle.img,0,2*128,128,128,0,0,128,128);};if(r.sheets.Idle.img.complete)draw();else r.sheets.Idle.img.onload=draw;
  const d=document.createElement('div');d.className='pc'+(selRace===k?' on':'');c.style.width='60px';c.style.height='60px';c.style.imageRendering='pixelated';const s=document.createElement('span');s.textContent=r.name;d.append(c,s);d.onclick=()=>{selRace=k;mode='place';mb.forEach(x=>x.classList.toggle('on',x.textContent==='Place'));showPal();};pal.appendChild(d);});return;}
 D.pieces.forEach((p,k)=>{if(p.g!==tab)return;const first=p.s.find(i=>i>=0);card(first,p.n,selRace<0&&sel===k,()=>{sel=k;selRace=-1;mode='place';mb.forEach(x=>x.classList.toggle('on',x.textContent==='Place'));showPal();});});}
addEventListener('resize',()=>{const z=zoom;resize();});
if(!load())starter();fit();showPal();say('Tap to place · drag to move · pinch to zoom');requestAnimationFrame(frame);
</script></body></html>`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out}: ${P.length} pieces, ${RACES.length} races, ${(page.length / 1e6).toFixed(1)} MB`);
