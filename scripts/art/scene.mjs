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
function strip(f, fps, loop = true, W = 256, ax = AX, ay = AY, crop = true) {
  const p = readPng(f), H = p.height, n = p.width / W, d = Buffer.from(p.data);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < p.width; x++) if (d[(y * p.width + x) * 4 + 3]) { const fx = x % W; if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return -1;
  if (!crop) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }   // weather squares must keep their whole size to repeat
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cols = Math.min(n, Math.max(1, Math.floor(4000 / cw))), rows = Math.ceil(n / cols), o = Buffer.alloc(cw * cols * ch * rows * 4);   // frames in a grid no wider than 4000 px: phones refuse very wide pictures
  for (let k = 0; k < n; k++) for (let y = 0; y < ch; y++) d.copy(o, (((k / cols | 0) * ch + y) * cw * cols + (k % cols) * cw) * 4, ((y0 + y) * p.width + k * W + x0) * 4, ((y0 + y) * p.width + k * W + x1 + 1) * 4);
  IMGS.push([uri(o, cw * cols, ch * rows), x0 - ax, y0 - ay, n, fps, loop ? 1 : 0, cols, cw, ch]); return IMGS.length - 1;
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
const OVER = {}; let LIGHT = -1;
for (const [n, a] of Object.entries(AM)) {
  if (a.overlay) { const k = strip(`${ANIM}${n}_S.png`, a.fps, true, a.w || 256, 0, 0, false); OVER[a.surface ? 'Water' + n.split(' ')[1] : /Splash/.test(n) ? 'Splash' : n.split(' ')[0]] = k; continue; }   // weather: whole squares, not cut
  if (a.light) { LIGHT = strip(`${ANIM}${n}_S.png`, a.fps); continue; }
  const s = a.sides.map(v => strip(`${ANIM}${n}_${v}.png`, a.fps, a.loop !== false, a.w || 256, a.ax || AX, a.ay || AY)), sh = a.shadow ? a.sides.map(v => strip(`${ANIM}${a.shadow}_${v}.png`, 1, true, a.w || 256, a.ax || AX, a.ay || AY)) : [];
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
    const n = W / 128; let bx0 = 128, by0 = 128, bx1 = -1, by1 = -1;   // the box round what any frame draws, so the sheet is small
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o[(y * W + x) * 4 + 3]) { const fx = x % 128, fy = y % 128; if (fx < bx0) bx0 = fx; if (fx > bx1) bx1 = fx; if (fy < by0) by0 = fy; if (fy > by1) by1 = fy; }
    const cw = bx1 - bx0 + 1, ch = by1 - by0 + 1, c = Buffer.alloc(cw * n * ch * 8 * 4);
    for (let r8 = 0; r8 < 8; r8++) for (let f = 0; f < n; f++) for (let y = 0; y < ch; y++) o.copy(c, ((r8 * ch + y) * cw * n + f * cw) * 4, ((r8 * 128 + by0 + y) * W + f * 128 + bx0) * 4, ((r8 * 128 + by0 + y) * W + f * 128 + bx1 + 1) * 4);
    sheets[anim] = { u: uri(c, cw * n, ch * 8), n, cw, ch, ox: bx0, oy: by0 };
  }
  return { name, scale: r.scale, sheets };
});

const data = { over: OVER, light: LIGHT, imgs: IMGS, pieces: P, races: RACES.map(r => ({ name: r.name, scale: r.scale, sheets: r.sheets })), dirs: D.directions, steps: D.direction_grid_step, spriteScale: D.sprite_scale, foot: D.sheet.foot_origin, shadowAlpha: 0.3, tileSeconds: 0.6, idleFps: D.anim_fps.Idle, walkFps: 15.4 };

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
const imgs=D.imgs.map(([u,x,y,n,fps,l,cols,fw,fh])=>({_i:null,get i(){if(!this._i){this._i=new Image();this._i.src=u;}return this._i;},x,y,n:n||1,fps:fps||1,l:l!==0,cols:cols||1,fw,fh}));   // each picture is decoded only when first drawn
const FR=(m,f)=>[(f%m.cols)*m.fw,(f/m.cols|0)*m.fh];let NOW=0,night=false,weather={Rain:false,Fog:false,Leaves:false};
const LIT=/Lit|Torch|Brazier|Lantern|Cooking|Candle|Hearth|Forge/;
// weather that lands: each raindrop and leaf falls to a real spot on the land; on water a drop makes rings, on ground a splash;
// a leaf lies where it lands for a while, or floats and drifts on water (how 2D games do it: particles that collide with the ground)
const W={rain:[],hits:[],tops:[],leaves:[],landed:[],onObj:[],drips:[]},LEAFC=[['#a65a22','#6e3512'],['#c98a2b','#7d5114'],['#8a962e','#4f5a16'],['#d9a640','#8a6420']];
let WET=0;const LAND=/Tent|Stall|Table|Crate|Barrel|Jetty|Log|Bedroll|Counter|Shelf|Bed|Fence|Chest|Wall|Door|Stool|Block|Rack|Cart/,PIX={},TOPS={};
function pix(k){if(PIX[k]!==undefined)return PIX[k];const m=imgs[k];if(!m||!m.i.complete)return null;const c=document.createElement('canvas');c.width=m.i.width;c.height=m.i.height;const g=c.getContext('2d');g.drawImage(m.i,0,0);return PIX[k]={c,g,d:g.getImageData(0,0,c.width,c.height)};}
// where a drop or a leaf stops: on top of a thing standing on that tile (a tent's roof, a table, the jetty), found from the sprite's own pixels
function topAt(X,Y){const i=Math.round((X/64+Y/32)/2),j=Math.round((Y/32-X/64)/2);if(i<0||j<0||i>=N||j>=N)return null;const o=obj[i][j];if(!o)return null;const p=D.pieces[o.p];if(!LAND.test(p.n))return null;
 const k=p.s[o.side],m=imgs[k];if(!m)return null;const fw=m.fw,col=Math.round(X-tx(i,j)-m.x);if(col<0||col>=fw)return null;const key=k+':'+col;
 if(TOPS[key]===undefined){const P=pix(k);if(!P)return null;let r=-1;for(let y=0;y<m.fh;y++)if(P.d.data[(y*P.c.width+col)*4+3]>40){r=y;break;}TOPS[key]=r;}
 if(TOPS[key]<0)return null;const sy=ty(i,j)+m.y+TOPS[key];return sy<Y-2?{sy,i,j}:null;}
// wet: a darker, a little richer copy of each picture, its top edges catching the light; drawn over the dry one as the rain goes on
const WETOK=new Set(),WETC={},FLAT=new Set();   // FLAT: ground tiles, which darken but get no glint (it would draw the tile grid)
function wetOf(k){if(WETC[k]!==undefined)return WETC[k];const P=pix(k);if(!P)return null;const c=document.createElement('canvas');c.width=P.c.width;c.height=P.c.height;const g=c.getContext('2d'),id=g.createImageData(c.width,c.height),d=id.data,s=P.d.data,w=c.width;
 for(let y=0;y<c.height;y++)for(let x=0;x<w;x++){const o=(y*w+x)*4;if(!s[o+3])continue;let r=s[o],gg=s[o+1],b=s[o+2];const l=(r+gg+b)/3;r=(l+(r-l)*1.25)*.6;gg=(l+(gg-l)*1.25)*.63;b=(l+(b-l)*1.25)*.72;
  const hi=!FLAT.has(k)&&l>150&&((x*7+y*13)%11===0);   // a few glints where the surface faces the sky (the palest pixels)
  if(hi||!FLAT.has(k)&&(y===0||s[o-w*4+3]<40)&&((x+y)%2===0)){r=r*.45+140;gg=gg*.45+150;b=b*.45+165;}   // a glint along the top edges, every other pixel
  d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=s[o+3];}
 g.putImageData(id,0,0);return WETC[k]=c;}
// puddles: hollows in the ground that fill as it rains and dry after; a drop landing in one makes rings
const DRIPS={};   // per picture: lower edges a drop can fall from (an opaque pixel with nothing under it, well above the ground)
function dripsOf(k){if(DRIPS[k]!==undefined)return DRIPS[k];const P=pix(k);if(!P)return null;const m=imgs[k],fw=m.fw,h=m.fh,d=P.d.data,out=[];
 for(let y=0;y<h-1;y++)for(let x=0;x<fw;x++){const o=(y*P.c.width+x)*4;if(d[o+3]>40&&d[o+P.c.width*4+3]<40&&m.y+y<-14)out.push([m.x+x,m.y+y]);}
 return DRIPS[k]=out;}
const PUD=[];function makePuddles(){PUD.length=0;let tries=0;while(PUD.length<12&&tries++<400){const i=Math.random()*N|0,j=Math.random()*N|0;const g=D.pieces[ground[i][j]].n;if(obj[i][j]||/Water/.test(g))continue;
  const rx=18+Math.random()*20,cxp=tx(i,j)+(Math.random()-.5)*50,cyp=ty(i,j)+(Math.random()-.5)*20,cells=[],ph=Math.random()*6.3;
  for(let y=-rx/2;y<=rx/2;y+=2)for(let x=-rx;x<=rx;x+=2){const a=Math.atan2(y*2,x),q=Math.hypot(x/rx,y*2/rx)/(1+.22*Math.sin(3*a+ph)+.12*Math.sin(5*a+ph*2));if(q<1)cells.push([x,y,q]);}
  PUD.push({x:cxp,y:cyp,rx,cells});}}
function inPuddle(X,Y){const f=Math.max(0,(WET-.25)/.75);if(!f)return false;for(const p of PUD){const dx=(X-p.x)/(p.rx*f),dy=(Y-p.y)*2/(p.rx*f);if(dx*dx+dy*dy<.8)return true;}return false;}
function drawPuddles(){const f=Math.max(0,(WET-.25)/.75);if(!f)return;for(const p of PUD)for(const[x,y,q]of p.cells){if(q>f)continue;cx.fillStyle=q>f-.18?'rgba(84,96,92,.45)':(q<f*.35&&((x+y)/2)%3===0)?'rgba(170,186,200,.55)':'rgba(110,128,146,.6)';cx.fillRect(Math.round(p.x+x),Math.round(p.y+y),2,2);}}   // a dark wet rim, the water reflecting a grey sky
// open water: drawn as one surface in world space (two textures scrolled against each other), not tile by tile, so the pattern never
// lines up with the grid; shallower near land, foam lapping wherever water meets land, and what stands near the water reflected in it
const PAT={};function pat(key){if(PAT[key])return PAT[key];const k=D.over[key];if(k===undefined)return null;const m=imgs[k];if(!m.i.complete)return null;return PAT[key]=cx.createPattern(m.i,'repeat');}
const isW=(i,j)=>i>=0&&j>=0&&i<N&&j<N&&/Water/.test(D.pieces[ground[i][j]].n);
const DIA=(p,X,Y)=>{p.moveTo(X,Y-32);p.lineTo(X+64,Y);p.lineTo(X,Y+32);p.lineTo(X-64,Y);p.closePath();};
function frameOf(m){return m.n>1?(m.l?Math.floor(NOW/1000*m.fps)%m.n:Math.min(m.n-1,Math.floor((NOW/1000%(m.n/m.fps+1.2))*m.fps))):0;}
function reflect(im,sx,sy,sw,sh,dx,dy,dw,dh,X,Y,secs,seed){   // a picture mirrored about the ground line Y, in thin bands that sway, fainter further from the base
 for(let r=0;r<sh;r+=2){const top=dy+r*dh/sh,h=Y-top;if(h<=0)continue;const wob=Math.round(Math.sin(r*.22+secs*2.6+seed)*Math.min(3,h*.025));cx.globalAlpha=Math.max(0,.34-h*.0012);cx.drawImage(im,sx,sy+r,sw,Math.min(2,sh-r),dx+wob,Y+h-2*dh/sh,dw,2*dh/sh);}cx.globalAlpha=1;}
function drawWater(secs){const base=pat('WaterBase'),gl=pat('WaterGlints');if(!base||!gl)return false;
 const path=new Path2D(),near=[];let any=false;for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(isW(i,j)){any=true;DIA(path,tx(i,j),ty(i,j));}
 if(!any)return true;
 base.setTransform(new DOMMatrix([1,0,0,1,Math.round(secs*3)%512,Math.round(secs*1.2)%512]));cx.fillStyle=base;cx.fill(path);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!isW(i,j))continue;let d=3;for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<N&&jj<N&&!isW(ii,jj))d=Math.min(d,Math.max(Math.abs(a),Math.abs(b)));}
  if(d<3){const p=new Path2D();DIA(p,tx(i,j),ty(i,j));cx.fillStyle=d===1?'rgba(92,168,160,.26)':'rgba(92,168,160,.12)';cx.fill(p);}}   // shallower near land
 gl.setTransform(new DOMMatrix([1,0,0,1,Math.round(secs*8)%512,Math.round(secs*2)%512]));cx.fillStyle=gl;cx.fill(path);
 gl.setTransform(new DOMMatrix([2,0,0,2,Math.round(-secs*5+130),Math.round(secs*3+70)]));cx.globalAlpha=.45;cx.fill(path);cx.globalAlpha=1;   // a second, bigger, slower layer the other way: the two never line up
 // reflections of everything within three tiles of the water, clipped to the water
 cx.save();cx.clip(path);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const o=obj[i][j];if(!o)continue;let close=false;for(let a=-3;a<=3&&!close;a++)for(let b=-3;b<=3;b++)if(isW(i+a,j+b)){close=true;break;}if(!close)continue;
  const m=imgs[D.pieces[o.p].s[o.side]];if(!m||!m.i.complete)continue;const[fx0,fy0]=FR(m,frameOf(m)),X=tx(i,j),Y=ty(i,j);reflect(m.i,fx0,fy0,m.fw,m.fh,X+m.x,Y+m.y,m.fw,m.fh,X,Y,secs,i*3+j);}
 for(const c of chars){const r=D.races[c.r],sh=r.sheets[c.path.length?'Walk':'Idle'];if(!sh.img.complete)continue;const f=Math.floor(NOW/1000*(c.path.length?D.walkFps:D.idleFps))%sh.n,sx=D.spriteScale*r.scale[0],sy=D.spriteScale*r.scale[1],X=tx(c.fi,c.fj),Y=ty(c.fi,c.fj);
  reflect(sh.img,f*sh.cw,c.dir*sh.ch,sh.cw,sh.ch,X-(D.foot[0]-sh.ox)*sx,Y-(D.foot[1]-sh.oy)*sy,sh.cw*sx,sh.ch*sy,X,Y,secs,c.i);}
 cx.restore();
 // foam: wherever water meets land, a pale line that laps in and out, a darker wet line behind it; its waves follow the world, so they run on from tile to tile
 const E=[[-1,0,[-64,0],[0,-32]],[1,0,[64,0],[0,32]],[0,-1,[0,-32],[64,0]],[0,1,[0,32],[-64,0]]];
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!isW(i,j))continue;const X=tx(i,j),Y=ty(i,j);for(const[a,b,A,B]of E){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N||isW(ii,jj))continue;
   const ax=X+A[0],ay=Y+A[1],bx=X+B[0],by=Y+B[1],mx=(ax+bx)/2,my=(ay+by)/2,nl=Math.hypot(X-mx,Y-my),nx=(X-mx)/nl,ny=(Y-my)/nl;
   for(let s=0;s<=1;s+=1/48){const px=ax+(bx-ax)*s,py=ay+(by-ay)*s,w=Math.sin(px*.07+py*.05+secs*1.4)+.6*Math.sin(px*.13-py*.11-secs*2.1),d=3+2.2*(1+w);
    cx.fillStyle='rgba(220,236,230,.85)';cx.fillRect(Math.round(px+nx*d),Math.round(py+ny*d),2,1);cx.fillStyle='rgba(120,160,160,.45)';cx.fillRect(Math.round(px+nx*(d+3)),Math.round(py+ny*(d+3)),2,1);}}}
 return true;}
function onWater(X,Y){const i=Math.round((X/64+Y/32)/2),j=Math.round((Y/32-X/64)/2);if(i<0||j<0||i>=N||j>=N)return null;return /Water/.test(D.pieces[ground[i][j]].n);}
function spot(){const i=Math.random()*N-.5,j=Math.random()*N-.5;return[(i-j)*64,(i+j)*32];}
D.pieces.forEach(p=>{if(/Water|Smoke|Steam|Glow|Ripples|Flash|Spark|Puff|Bandage/.test(p.n)||LIT.test(p.n)||p.k==='f')return;for(const k of p.s)if(k>=0){WETOK.add(k);if(p.k==='g')FLAT.add(k);}});
function stepWeather(dt,secs){
 if(weather.Rain){const want=N*N*2;while(W.rain.length<want){const[x,y]=spot();W.rain.push({x,y,h:Math.random()*320,v:950+Math.random()*350});}
  for(const r of W.rain){r.h-=r.v*dt;if(r.top===undefined){const T=topAt(r.x,r.y);r.top=T?r.y-T.sy:0;}
   if(r.h<=r.top){if(r.top)W.tops.push({x:r.x|0,y:(r.y-r.top)|0,t:0});else{const w=onWater(r.x,r.y);if(w!==null&&Math.random()<.6)W.hits.push({x:r.x|0,y:r.y|0,t:0,w:w||inPuddle(r.x,r.y)});}
    const[x,y]=spot();r.x=x;r.y=y;r.h=280+Math.random()*60;r.top=undefined;}}}
 else W.rain.length=0;
 for(const h of W.hits)h.t+=dt;W.hits=W.hits.filter(h=>h.t<(h.w?.7:.25));for(const h of W.tops)h.t+=dt;W.tops=W.tops.filter(h=>h.t<.2);
 if(WET>.3){for(let i=0;i<N;i++)for(let j=0;j<N;j++){const o=obj[i][j];if(!o)continue;const p=D.pieces[o.p];if(!(LAND.test(p.n)||/^Tree/.test(p.n)))continue;const E=dripsOf(p.s[o.side]);if(!E||!E.length)continue;
   if(Math.random()<Math.min(.5,E.length*.015*WET*dt*(weather.Rain?1:.4))){const[ex,ey]=E[Math.random()*E.length|0];W.drips.push({x:tx(i,j)+ex,y:ty(i,j)+ey,fall:-ey,t:0});}}}   // off eaves, awnings, table edges and leaves
 for(const q of W.drips){q.t+=dt;q.d=(q.d||0)+(60+600*q.t)*dt;if(q.d>=q.fall){q.done=true;W.hits.push({x:q.x|0,y:(q.y+q.fall)|0,t:0,w:inPuddle(q.x,q.y+q.fall)});}}W.drips=W.drips.filter(q=>!q.done);
 WET=weather.Rain?Math.min(1,WET+dt/25):Math.max(0,WET-dt/90);if(WET>0&&!PUD.length)makePuddles();if(!WET)PUD.length=0;   // wet in about 25 s of rain, dry in about 90 s
 if(weather.Leaves){const trees=[];for(let i=0;i<N;i++)for(let j=0;j<N;j++){const o=obj[i][j];if(o&&/^Tree/.test(D.pieces[o.p].n))trees.push([i,j]);}
  const rate=trees.length?trees.length*2+1.5:3;if(Math.random()<rate*dt){let x,y,h;
   if(trees.length){const[i,j]=trees[Math.random()*trees.length|0];x=tx(i,j)+(Math.random()-.5)*90;y=ty(i,j)+(Math.random()-.5)*40;h=90+Math.random()*90;}   // from a tree's crown
   else{[x,y]=spot();h=250;}
   W.leaves.push({x,y,h,ph:Math.random()*6.3,c:Math.random()*4|0,v:28+Math.random()*16});}
  for(const l of W.leaves){l.h-=l.v*dt;l.x+=(18+16*Math.sin(secs*1.7+l.ph))*dt;l.y+=4*Math.sin(secs*1.1+l.ph)*dt;   // wind and sway
   const T=topAt(l.x,l.y);if(T&&l.y-l.h>=T.sy){l.done=true;W.onObj.push({x:l.x,y:T.sy,i:T.i,j:T.j,c:l.c,t:0});continue;}   // caught on a roof, a table, the jetty
   if(l.h<=0){const w=onWater(l.x,l.y);l.done=true;if(w===null)continue;const wet=w||inPuddle(l.x,l.y);W.landed.push({x:l.x,y:l.y,c:l.c,w:wet,t:0,ph:l.ph});if(wet)W.hits.push({x:l.x|0,y:l.y|0,t:0,w:true});}}
  W.leaves=W.leaves.filter(l=>!l.done);}
 else W.leaves.length=0;
 for(const l of W.landed){l.t+=dt;if(l.w&&!inPuddle(l.x,l.y)&&onWater(l.x,l.y)){l.x+=7*dt;l.y+=2.5*dt;}}W.landed=W.landed.filter(l=>l.t<(l.w?10:14)&&(weather.Leaves||l.t<3));
 for(const l of W.onObj)l.t+=dt;W.onObj=W.onObj.filter(l=>l.t<20&&(weather.Leaves||l.t<3));}
const LEAFSHAPE=[[[0,0],[1,0],[-1,1],[0,1],[1,1],[0,2]],[[0,0],[1,1],[0,1],[-1,2],[0,2]],[[0,0],[0,1],[0,2]],[[0,0],[-1,1],[0,1],[1,2],[0,2]]];
function drawLeaf(x,y,c,shape,a){const[col,dark]=LEAFC[c];cx.globalAlpha=a;const X=Math.round(x/2)*2,Y=Math.round(y/2)*2;for(const[dx,dy]of LEAFSHAPE[shape]){cx.fillStyle=dy===2?dark:col;cx.fillRect(X+dx*2,Y+dy*2,2,2);}cx.globalAlpha=1;}   // a leaf pixel is 2 x 2, like the tileset's foliage
function drawLanded(){   // on the ground, under everything standing: puddles, splashes, rings on water, leaves lying flat or floating
 drawPuddles();
 for(const h of W.hits){if(h.w){const u=h.t/.7,a=(1-u)*.8;cx.strokeStyle='rgba(200,222,226,'+a+')';cx.lineWidth=1;for(const k of[0,1]){const r=2+u*9-k*4;if(r<=0)continue;cx.beginPath();cx.ellipse(h.x+.5,h.y+.5,r,r*.5,0,0,6.3);cx.stroke();}}
  else{const f=h.t<.08?0:h.t<.16?1:2;cx.fillStyle='rgba(205,214,224,.75)';if(f===0)cx.fillRect(h.x,h.y,1,1);if(f===1){cx.fillRect(h.x-1,h.y-1,1,1);cx.fillRect(h.x+1,h.y-1,1,1);}if(f===2){cx.fillRect(h.x-2,h.y-2,1,1);cx.fillRect(h.x+2,h.y-2,1,1);}}}
 for(const l of W.landed){const a=Math.min(1,(l.w?10:14)-l.t);drawLeaf(l.x,l.y+(l.w?Math.sin(NOW/600+l.ph)*.6:0),l.c,l.w?0:2,a);}}const dark=document.createElement('canvas'),dx=dark.getContext('2d');
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
 for(let i=1;i<6;i++)put('Fence A1',i,1);put('Windmill A1',1,11);put('Market Stall A1',3,10);put('Water Wheel A1',9,3);put('Chest A1 Opening',2,4);put('Door A2 Opening',1,8);fxp('Steam A1',5,6);fxp('Bandage A1',6,9);
 chars=[{r:0,i:7,j:6,fi:7,fj:6,dir:0,path:[],t:0},{r:1,i:6,j:9,fi:6,fj:9,dir:2,path:[],t:0}];}
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
function drawPic(k,X,Y,a=1){if(k<0||k===undefined)return;const m=imgs[k];if(!m.i.complete)return;
 const blit=(im,al)=>{cx.globalAlpha=al;if(m.n>1){const f=m.l?Math.floor(NOW/1000*m.fps)%m.n:Math.min(m.n-1,Math.floor((NOW/1000%(m.n/m.fps+1.2))*m.fps)),[sx,sy]=FR(m,f);cx.drawImage(im,sx,sy,m.fw,m.fh,X+m.x,Y+m.y,m.fw,m.fh);}else cx.drawImage(im,X+m.x,Y+m.y);};
 blit(m.i,a);if(WET>.01&&a===1&&WETOK.has(k)){const c=wetOf(k);if(c)blit(c,WET*.85);}cx.globalAlpha=1;}
function frame(now){
 NOW=now;const dt=Math.min(.1,(now-(frame.last||now))/1000);frame.last=now;stepWeather(dt,now/1000);
 for(const c of chars){if(c.path.length){c.t+=dt/D.tileSeconds;const[ni,nj]=c.path[0];
   const st=[ni-c.i,nj-c.j];c.dir=D.steps.findIndex(s=>s[0]===st[0]&&s[1]===st[1]);
   if(c.t>=1){c.i=ni;c.j=nj;c.path.shift();c.t=c.path.length?c.t-1:0;}
   const[a,b]=c.path.length?c.path[0]:[c.i,c.j];c.fi=c.i+(a-c.i)*c.t;c.fj=c.j+(b-c.j)*c.t;}else{c.fi=c.i;c.fj=c.j;}}
 cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#24221e';cx.fillRect(0,0,cv.width,cv.height);
 cx.setTransform(zoom,0,0,zoom,panX,panY);cx.imageSmoothingEnabled=false;
 const order=[];for(let s=0;s<2*N-1;s++)for(let i=0;i<N;i++){const j=s-i;if(j>=0&&j<N)order.push([i,j]);}
 const surf=pat('WaterBase')&&pat('WaterGlints');for(const[i,j]of order){if(surf&&isW(i,j))continue;const g=D.pieces[ground[i][j]];drawPic(g.s[Math.min(gside[i][j]||0,g.s.length-1)],tx(i,j),ty(i,j));}
 if(surf)drawWater(now/1000);
 drawLanded();
 if(grid){cx.strokeStyle='#ffffff30';cx.lineWidth=1/zoom;for(const[i,j]of order){const X=tx(i,j),Y=ty(i,j);cx.beginPath();cx.moveTo(X,Y-32);cx.lineTo(X+64,Y);cx.lineTo(X,Y+32);cx.lineTo(X-64,Y);cx.closePath();cx.stroke();}}
 for(const[i,j]of order){const o=obj[i][j];if(!o)continue;const p=D.pieces[o.p];if(p.sh.length)drawPic(p.sh[Math.min(o.side,p.sh.length-1)],tx(i,j),ty(i,j),D.shadowAlpha);}
 for(const[i,j]of order){const f=fx[i][j];if(f!==null&&D.pieces[f].u!==undefined)drawPic(D.pieces[f].u,tx(i,j),ty(i,j));}
 const things=[];for(const[i,j]of order){if(obj[i][j])things.push([i+j,0,i,j]);if(fx[i][j]!==null)things.push([i+j+.02,2,i,j]);}chars.forEach((c,k)=>things.push([c.fi+c.fj+.01,1,k]));
 things.sort((a,b)=>a[0]-b[0]);
 for(const t of things){if(t[1]===2){drawPic(D.pieces[fx[t[2]][t[3]]].s[0],tx(t[2],t[3]),ty(t[2],t[3]));}else if(!t[1]){const o=obj[t[2]][t[3]],p=D.pieces[o.p];drawPic(p.s[o.side],tx(t[2],t[3]),ty(t[2],t[3]));for(const l of W.onObj)if(l.i===t[2]&&l.j===t[3])drawLeaf(l.x,l.y-2,l.c,0,Math.min(1,20-l.t));}
  else{const c=chars[t[2]],r=D.races[c.r],sh=r.sheets[c.path.length?'Walk':'Idle'];if(!sh.img.complete)continue;
   const f=Math.floor(now/1000*(c.path.length?D.walkFps:D.idleFps))%sh.n,sx=D.spriteScale*r.scale[0],sy=D.spriteScale*r.scale[1],X=tx(c.fi,c.fj),Y=ty(c.fi,c.fj);
   cx.drawImage(sh.img,f*sh.cw,c.dir*sh.ch,sh.cw,sh.ch,X-(D.foot[0]-sh.ox)*sx,Y-(D.foot[1]-sh.oy)*sy,sh.cw*sx,sh.ch*sy);
   if(t[2]===active&&chars.length>1){cx.fillStyle='#c9a25a';cx.beginPath();cx.arc(X,Y-150*sy/2.5,5,0,7);cx.fill();}}}
 // weather: overcast for rain, layers of rain and splashes, fog drifting in two layers, leaves blowing; all in world space so a pixel stays a pixel
 const vx0=-panX/zoom,vy0=-panY/zoom,vx1=(cv.width-panX)/zoom,vy1=(cv.height-panY)/zoom,secs=now/1000;
 const tile=(k,ox,oy,sc,a)=>{const m=imgs[k];if(!m||!m.i.complete)return;const f=Math.floor(secs*m.fps)%m.n,[fx0,fy0]=FR(m,f),T=m.fh*sc;cx.globalAlpha=a;
  ox=Math.round(ox/sc)*sc;oy=Math.round(oy/sc)*sc;/* move in whole texture pixels: a dithered layer moved by fractions of a pixel shimmers */const sx=((ox%T)+T)%T,sy=((oy%T)+T)%T;for(let y=Math.floor((vy0-sy)/T)*T+sy;y<vy1;y+=T)for(let x=Math.floor((vx0-sx)/T)*T+sx;x<vx1;x+=T)cx.drawImage(m.i,fx0,fy0,m.fw,m.fh,x,y,T,T);cx.globalAlpha=1;};
 cx.fillStyle='rgba(190,210,225,.85)';for(const q of W.drips)cx.fillRect(Math.round(q.x),Math.round(q.y+(q.d||0)),1,2);   // drips falling, also a while after the rain
 if(weather.Rain){cx.globalCompositeOperation='multiply';cx.fillStyle='rgb(176,186,204)';cx.fillRect(vx0,vy0,vx1-vx0,vy1-vy0);cx.globalCompositeOperation='source-over';
  if(D.over.Rain!==undefined)tile(D.over.Rain,97,41,1.5,.3);   // far rain, faint, over the whole view
  cx.fillStyle='rgba(210,220,230,.8)';for(const h of W.tops){if(h.t<.1)cx.fillRect(h.x,h.y,1,1);else{cx.fillRect(h.x-1,h.y-1,1,1);cx.fillRect(h.x+1,h.y-1,1,1);}}   // drops bursting on roofs and tables
  cx.strokeStyle='rgba(196,208,222,.6)';cx.lineWidth=1;cx.beginPath();for(const r of W.rain){const x=Math.round(r.x+r.h*.5)+.5,y=Math.round(r.y-r.h);cx.moveTo(x,y);cx.lineTo(x+6,y-12);}cx.stroke();}   // each drop on its way down to its spot, slanted
 if(weather.Fog&&D.over.Fog!==undefined){cx.fillStyle='rgba(214,220,226,.16)';cx.fillRect(vx0,vy0,vx1-vx0,vy1-vy0);tile(D.over.Fog,secs*4,secs*1.5,1,.85);tile(D.over.Fog,-secs*7+200,secs*2+120,2,.5);/* slow drift, two layers at different speeds */}
 for(const l of W.leaves)drawLeaf(l.x,l.y-l.h,l.c,(Math.floor(secs*8+l.ph*3))%4,1);   // leaves still falling, turning over
 // night: the picture multiplied by a dark blue, light added back round every fire with a real falloff, dithered in steps (a retro look)
 if(night){const S=3,lw=Math.ceil(cv.width/S),lh=Math.ceil(cv.height/S);
  if(dark.width!==lw||dark.height!==lh){dark.width=lw;dark.height=lh;dark.data=dx.createImageData(lw,lh);}
  const lights=[];for(const[i,j]of order){const o=obj[i][j],n=o&&D.pieces[o.p].n;if(n&&LIT.test(n))lights.push([tx(i,j),ty(i,j),/Candle/.test(n)?.35:/Lantern/.test(n)?.6:/Torch/.test(n)?.8:/Forge|Hearth|Brazier/.test(n)?1:1.15,i*7+j,/Candle|Lantern|Torch/.test(n)?95:40]);
   const f=fx[i][j];if(f!==null&&/Glow/.test(D.pieces[f].n))lights.push([tx(i,j),ty(i,j),.5,i*7+j,20]);}
  const L=lights.map(([X,Y,k,sd])=>{const fl=1+.05*Math.sin(secs*7.3+sd)+.035*Math.sin(secs*13.1+sd*2)+.02*Math.sin(secs*23+sd);return[(X*zoom+panX)/S,(Y*zoom+panY)/S,k*300*zoom/S*fl];});
  const d=dark.data.data,AMB=[46,58,104],WARM=[255,214,160],B=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){let v=0;for(const[lx,ly,r]of L){const ddx=(x-lx)/r,ddy=(y-ly)/(r*.5),d2=ddx*ddx+ddy*ddy;if(d2<1)v+=(1/(1+9*d2)-.1)/.9*(1-d2);}
   v=Math.min(1,v);const q=Math.floor(v*6+(B[(y&3)*4+(x&3)]+.5)/16)/6,o=(y*lw+x)*4;for(let c=0;c<3;c++)d[o+c]=AMB[c]+(WARM[c]-AMB[c])*q;d[o+3]=255;}
  dx.putImageData(dark.data,0,0);cx.setTransform(1,0,0,1,0,0);cx.imageSmoothingEnabled=false;cx.globalCompositeOperation='multiply';cx.drawImage(dark,0,0,lw*S,lh*S);
  // a little glow round each flame itself, so fire still looks bright
  cx.globalCompositeOperation='lighter';for(const[X,Y,k,sd,up]of lights){const sx=X*zoom+panX,sy=(Y-up)*zoom+panY,r=k*60*zoom,g=cx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,'rgba(255,170,80,.35)');g.addColorStop(1,'rgba(255,120,40,0)');cx.fillStyle=g;cx.fillRect(sx-r,sy-r,2*r,2*r);}
  cx.globalCompositeOperation='source-over';}
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
btn('Grid',e=>{grid=!grid;e.target.classList.toggle('on',grid);});btn('Night',e=>{night=!night;e.target.classList.toggle('on',night);});for(const w of ['Rain','Fog','Leaves'])btn(w,e=>{weather[w]=!weather[w];e.target.classList.toggle('on',weather[w]);});btn('Fill ground',()=>{if(D.pieces[sel]&&D.pieces[sel].k==='g'&&selRace<0){for(let i=0;i<N;i++)for(let j=0;j<N;j++){ground[i][j]=sel;gside[i][j]=0;}}else say('Pick a ground first');});
btn('Near',fit);btn('All',all);btn('Save',save);btn('Load',()=>{if(load())say('Loaded');else say('Nothing saved');});btn('Clear',()=>{blank();});btn('Start over',()=>{starter();});
const GROUPS=['Ground','Animated','Made','Tileset','Items','Effects','People'];let tab='Ground';
const tb=GROUPS.map(g=>btn(g,()=>{tab=g;tb.forEach(x=>x.classList.toggle('on',x.textContent===g));showPal();},tabs));tb[0].classList.add('on');
function card(k,name,on,f){const d=document.createElement('div');d.className='pc'+(on?' on':'');const m=imgs[k];let im;
 if(m.n>1){im=document.createElement('canvas');const w=()=>{im.width=m.fw;im.height=m.fh;im.getContext('2d').drawImage(m.i,0,0,m.fw,m.fh,0,0,m.fw,m.fh);};if(m.i.complete)w();else m.i.addEventListener('load',w);im.style.maxWidth='68px';im.style.maxHeight='54px';im.style.imageRendering='pixelated';}
 else{im=document.createElement('img');im.src=D.imgs[k][0];}const s=document.createElement('span');s.textContent=name;d.append(im,s);d.onclick=f;pal.appendChild(d);}
function showPal(){pal.innerHTML='';
 if(tab==='People'){D.races.forEach((r,k)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');const draw=()=>{const S=r.sheets.Idle;g.drawImage(S.img,0,2*S.ch,S.cw,S.ch,S.ox,S.oy,S.cw,S.ch);};if(r.sheets.Idle.img.complete)draw();else r.sheets.Idle.img.onload=draw;
  const d=document.createElement('div');d.className='pc'+(selRace===k?' on':'');c.style.width='60px';c.style.height='60px';c.style.imageRendering='pixelated';const s=document.createElement('span');s.textContent=r.name;d.append(c,s);d.onclick=()=>{selRace=k;mode='place';mb.forEach(x=>x.classList.toggle('on',x.textContent==='Place'));showPal();};pal.appendChild(d);});return;}
 D.pieces.forEach((p,k)=>{if(p.g!==tab)return;const first=p.s.find(i=>i>=0);card(first,p.n,selRace<0&&sel===k,()=>{sel=k;selRace=-1;mode='place';mb.forEach(x=>x.classList.toggle('on',x.textContent==='Place'));showPal();});});}
addEventListener('resize',()=>{const z=zoom;resize();});
if(!load())starter();fit();showPal();say('Tap to place · drag to move · pinch to zoom');requestAnimationFrame(frame);
</script></body></html>`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out}: ${P.length} pieces, ${RACES.length} races, ${(page.length / 1e6).toFixed(1)} MB`);
