// A page that plays the test game's human holding the repainted parts: every animation the body's sheets are there for, from all
// 8 sides at once, at the game's size and speed. The way to judge a repaint in motion (held.mjs shows single frames).
//   node scripts/art/play.mjs <Creator folder> <repainted folder> [--start Melee24,Attack6,steel] [--out prototype/shots/held-play.html]
//   e.g. node scripts/art/reskin.mjs <Spritesheets> /tmp/reskin && node scripts/art/play.mjs <Spritesheets> /tmp/reskin
// <Creator folder> holds <Part>/<Animation>.png for the body (the Creator's own Spritesheets folder, or prototype/art/creator/);
// <repainted folder> is what reskin.mjs wrote. An animation is offered when every body part has its sheet.
// A part that comes in metals gets a Metal choice: its sheet is in iron's colours, and the page swaps iron's six colours for the
// metal's six as it draws, which is what the game does (D225).
// --start: the part, the animation and the metal the page opens on (otherwise the first weapon, Attack1 and the metal in MATCHED).
// The characters are the test game's human, orc and goblin (tints, size, layer order and speeds from
// prototype/character/character_data.json; D121, D205), and a skeleton when the Creator folder has its body (NakedBody2; D80):
// a stand-in look, bone-coloured, no hair and no shirt, the human's size. A Race choice picks one, or all side by side from one side.
// --races human,orc limits the races (the page holds a body sheet per race and animation, so fewer races make it smaller).
// --wear adds every worn Creator part (head, chest, legs, shoes, hands, belt, back, hip) and the bows as choices, each with a colour.
// The page then reads those sheets from the Creator folder itself, by a path relative to the page, so keep the two where they are.
// --anims Idle,Walk,Attack3 limits the animations (the page holds the body and the repainted parts for each one).
// The page is one file with the sheets inside it: bought art, so it goes to a git-ignored folder and is never committed.
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, relative, resolve } from 'node:path';
import { readPng } from './png.mjs';
import { MATCHED, METAL, METALS, IN_METALS } from './items.mjs';

const argv = process.argv.slice(2), flag = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : argv[i + 1]; };
const [CRE, SKIN] = argv.filter((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--'))).map(p => p.replace(/\/?$/, '/'));
if (!CRE || !SKIN) { console.error('Usage: node scripts/art/play.mjs <Creator folder> <repainted folder> [--out file.html]'); process.exit(1); }
const out = flag('--out', 'prototype/shots/held-play.html'), onlyRaces = flag('--races', ''), WEAR = argv.includes('--wear'), onlyAnims = flag('--anims', ''), WALK_SECONDS = +flag('--walk-seconds', 0.6), [startPart, startAnim, startMetal] = flag('--start', ',').split(',');
const D = JSON.parse(readFileSync('prototype/character/character_data.json', 'utf8')), F = D.sheet.frame_px, GREY = D.sheet.grey_ref * 255;
const BODY = D.parts.filter(p => !/^(Shadow|Hands|Melee|Shield)/.test(p)), HANDS = D.parts.find(p => p.startsWith('Hands'));   // the body's layers keep one order on every side
// each race: its body's layers, its tints and its size. The skeleton is a stand-in (not in the test game's data): the Creator's
// skeleton body in place of the human one, bone-coloured, without the hair and the shirt so the bones show.
const SKELETON = { body: 'NakedBody2', drop: ['Head1', 'Chest1'], bone: '#d6cdb4' };
const RACES = Object.entries(D.races).map(([name, r]) => ({ name, scale: r.scale, tints: r.tints, body: BODY }));
if (existsSync(`${CRE}${SKELETON.body}`)) RACES.push({ name: 'skeleton', scale: [1, 1], tints: { ...D.races.human.tints, [SKELETON.body]: SKELETON.bone, [HANDS]: SKELETON.bone }, body: BODY.filter(p => !SKELETON.drop.includes(p)).map(p => p === 'NakedBody' ? SKELETON.body : p) });
const races = RACES.filter(r => !onlyRaces || onlyRaces.split(',').includes(r.name));
// --wear: every worn part the Creator folder has becomes a choice in the page, slot by slot, each with its colour. The page loads those
// sheets from the Creator folder itself (relative to the page) and tints them as it draws, so they are not inside the page.
const SLOTS = [['head', 'Head', 'Head'], ['chest', 'Chest', 'Chest'], ['legs', 'Legs', 'Legs'], ['shoes', 'Shoes', 'Shoes'], ['hands', 'Hands', 'Hands'], ['belt', 'Belt', 'Belt'], ['back', 'Back', 'Bag'], ['hip', 'Hip', 'Offhand']];
const numbered = prefix => existsSync(CRE) ? readdirSync(CRE).filter(n => new RegExp(`^${prefix}\\d+$`).test(n)).sort((a, b) => +a.slice(prefix.length) - +b.slice(prefix.length)) : [];
if (WEAR) for (const r of races) {
  const bare = r.body.filter(p => /^NakedBody/.test(p)), t = r.tints, skeleton = r.name === 'skeleton';
  r.wear = Object.fromEntries(SLOTS.map(([key, , prefix]) => { const def = r.body.concat(HANDS).find(p => p.startsWith(prefix)); return [key, def && !(skeleton && key === 'hands') ? [def, t[def] || '#b9b9b9'] : ['', '#b9b9b9']]; }));
  r.body = bare;
}
if (!races.length) { console.error(`--races: none of "${onlyRaces}". The races are ${RACES.map(r => r.name).join(', ')}.`); process.exit(1); }
const parts = MATCHED.filter(m => existsSync(`${SKIN}${m.part}/`)).map(m => ({ ...m, metals: IN_METALS.includes(m.kind) ? METALS : null }));
if (!parts.length) { console.error(`No repainted part in ${SKIN}. Run reskin.mjs first.`); process.exit(1); }
const anims = readdirSync(`${CRE}NakedBody`).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).filter(a => (WEAR ? ['Shadow', 'NakedBody'] : ['Shadow', ...BODY, HANDS]).every(p => existsSync(`${CRE}${p}/${a}.png`))).filter(a => !onlyAnims || onlyAnims.split(',').includes(a)).sort();
if (!anims.length) { console.error(`No animation in ${CRE} has all the body's sheets (${['Shadow', ...BODY, HANDS].join(', ')}).`); process.exit(1); }

// a PNG as a data: address, written here so the page needs no file beside it
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); let c = 0xffffffff; for (const b of body) c = CRC[(c ^ b) & 255] ^ (c >>> 8); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0); return Buffer.concat([len, body, crc]); };
function uri(rgba, w, h) {
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  const rows = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
// the body's grey parts laid over each other with a race's tints: one sheet for the body, one for the hands, one for the shadow
function stack(names, anim, alpha = 1, TINT = {}) {
  let o = null, W = 0, H = 0;
  for (const n of names) {
    const p = readPng(`${CRE}${n}/${anim}.png`), t = TINT[n] ? [1, 3, 5].map(i => parseInt(TINT[n].slice(i, i + 2), 16)) : null; o ??= Buffer.alloc((W = p.width) * (H = p.height) * 4);
    for (let i = 0; i < W * H * 4; i += 4) { const a = p.data[i + 3] / 255 * alpha; if (!a) continue; const b = o[i + 3] / 255, na = a + b * (1 - a); for (let k = 0; k < 3; k++) { const c = t ? Math.min(255, p.data[i + k] * t[k] / GREY) : p.data[i + k]; o[i + k] = Math.round((c * a + o[i + k] * b * (1 - a)) / na); } o[i + 3] = Math.round(na * 255); }
  }
  return uri(o, W, H);
}
const data = { start: { part: startPart || '', anim: startAnim || 'Attack1', metal: METALS.includes(startMetal) ? startMetal : '' }, F, frames: D.sheet.frames, dirs: D.directions, scale: D.sprite_scale, fps: D.anim_fps, parts: parts.map(m => ({ part: m.part, name: m.name, slot: m.slot, metals: m.metals, first: m.part === startPart && METALS.includes(startMetal) ? startMetal : m.metal })), metals: Object.fromEntries(METALS.map(k => [k, METAL[k]])), races: races.map(r => ({ name: r.name, scale: r.scale, wear: r.wear })), foot: D.sheet.foot_origin, anims: {} };
// where the weapon and the shield go in the pile on each side: 0 behind the body, 1 in front of it (the hands go over a weapon in front, and a shield in front goes over the hands)
const slotOf = (dir, re) => { const L = D.layer_order[dir]; return L.findIndex(p => re.test(p)) > L.indexOf('NakedBody') ? 1 : 0; };
// plain names for the parts (scripts/art/creator_parts.json), shown in the lists as "Horned helmet" with "Head14, covers face" on hover
const NAMES = JSON.parse(readFileSync(new URL('./creator_parts.json', import.meta.url), 'utf8'));
const named = p => NAMES[p] ? { part: p, name: `${NAMES[p].name}${NAMES[p].unsure ? ' ?' : ''}`, tip: `${p}${NAMES[p].covers_face ? ', covers face' : ''}` } : { part: p, name: p, tip: p };
const PRESETS = WEAR && existsSync(new URL('./creator_presets.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('./creator_presets.json', import.meta.url), 'utf8')).presets : [];
if (WEAR) data.wear = { root: relative(dirname(resolve(out)), resolve(CRE)).split('\\').join('/'), grey: GREY, slots: SLOTS.map(([key, label, prefix]) => ({ key, label, parts: numbered(prefix).map(named) })), bows: numbered('Ranged').map(named), back: D.directions.map(d => ['NW', 'N', 'NE'].includes(d) ? 1 : 0), presets: PRESETS.filter(p => races.some(r => r.name === p.race)) };
data.front = { weapon: D.directions.map(d => slotOf(d, /^Melee/)), shield: D.directions.map(d => slotOf(d, /^Shield/)) };
data.shieldOver = D.directions.map(d => { const L = D.layer_order[d]; return L.findIndex(p => /^Shield/.test(p)) > L.findIndex(p => /^Melee/.test(p)) ? 1 : 0; });
// the walk's rate keeps the planted foot still on the ground: the game works it out per side from the walk speed (D205)
// Walk and Run (D226): running is the test game's speed (tile_seconds, 0.30 s a tile), walking takes WALK_SECONDS a tile (0.60).
// Each plays at the rate that keeps the planted foot on the ground on a straight step. Run's stride is Run's foot travel against Walk's, measured
// roughly on 2026-11-16 by the feet's spread over a cycle and averaged over opposite sides: an estimate, to check by eye.
const RUN_STRIDE = [1.26, 1.08, 1.0, 1.08, 1.26, 1.08, 1.0, 1.08];
const footFps = (seconds, d) => { const [gx, gy] = D.direction_grid_step[d]; return Math.hypot((gx - gy) * D.tile_px[0] / 2, (gx + gy) * D.tile_px[1] / 2) / seconds / (D.foot_px_per_frame[d] * D.sprite_scale) * D.walk_fps_multiplier; };
// One leg pace on every side (D227): the rate of a straight grid step (SE), as in RuneScape and UO; moving left, right, up or
// down on screen is a grid diagonal that covers more ground in the same time, so the feet slide a little there.
const SE = D.directions.indexOf('SE');
data.walkFps = D.directions.map(() => footFps(WALK_SECONDS, SE));
data.runFps = D.directions.map(() => footFps(D.tile_seconds, SE) / RUN_STRIDE[SE]);
for (const a of anims) {
  const held = {}; for (const m of parts) { const f = `${SKIN}${m.part}/${a}.png`; if (existsSync(f)) { const p = readPng(f); held[m.part] = uri(p.data, p.width, p.height); } }
  const body = {}; for (const r of races) if (r.body.every(p => existsSync(`${CRE}${p}/${a}.png`))) body[r.name] = WEAR ? { body: stack(r.body, a, 1, r.tints) } : { body: stack(r.body, a, 1, r.tints), hands: stack([HANDS], a, 1, r.tints) };
  data.anims[a] = { shadow: stack(['Shadow'], a, D.shadow_alpha), races: body, held };
  console.log(`${a}: shadow, ${Object.keys(body).join(', ')}, and ${Object.keys(held).length} held parts`);
}

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renown: characters in motion</title>
<style>
:root{color-scheme:light dark;--bg:#f4f2ec;--fg:#22201c;--mut:#6b665c;--line:#d5d0c4;--card:#fff}
@media(prefers-color-scheme:dark){:root{--bg:#1c1b18;--fg:#ece8dc;--mut:#a39d8f;--line:#3a3832;--card:#262521}}
*{box-sizing:border-box}body{margin:0;padding:14px;background:var(--bg);color:var(--fg);font:13px/1.4 system-ui,sans-serif}
header{margin:0 0 12px}h1{font-size:16px;margin:0}header p{margin:2px 0 0;color:var(--mut);max-width:90ch}
.app{display:grid;grid-template-columns:290px 1fr;gap:14px;align-items:start}
aside{position:sticky;top:10px;max-height:calc(100vh - 20px);overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:4px 12px 12px}
section{padding:10px 0 4px}section+section{border-top:1px solid var(--line)}
h2{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);margin:0 0 6px}
.row{display:grid;grid-template-columns:62px minmax(0,1fr) 30px;gap:6px;align-items:center;margin:5px 0}.row>span{color:var(--mut)}.row.wide{grid-template-columns:62px minmax(0,1fr)}
select,button,input{font:inherit;color:var(--fg)}select,button{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 6px}select{width:100%;min-width:0;text-overflow:ellipsis}
input[type=color]{width:30px;height:26px;padding:1px;border:1px solid var(--line);border-radius:6px;background:var(--bg);cursor:pointer}
.buttons{display:flex;gap:6px;align-items:center;margin-top:8px}button{cursor:pointer;min-width:34px}#play{flex:1}#fr{font-variant-numeric:tabular-nums;color:var(--mut);margin-top:4px}
.grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(var(--cell),1fr))}
figure{margin:0;background:#46602c;border-radius:8px;overflow:hidden;position:relative}canvas{display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges}
figcaption{position:absolute;left:8px;top:5px;font-size:11px;color:#e8e6d8;text-shadow:0 1px 2px #0008}
.hide{display:none!important}
@media(max-width:760px){.app{grid-template-columns:1fr}aside{position:static;max-height:none}}
</style></head><body>
<header><h1>Characters in motion</h1><p>The test game's characters at their sizes (D205), at the game's speed, from all 8 sides or side by side. Held weapons and shields are the repainted Creator parts (metals swapped as the game does, D225); worn parts are grey and tinted. A bow shoots with Attack3.</p></header>
<div class="app"><aside>
<section><h2>Look</h2>
<div class="row wide" id="presetRow"><span>Preset</span><select id="preset"></select></div>
<div class="row wide"><span>Race</span><select id="race"></select></div>
</section>
<section><h2>In hand</h2>
<div class="row wide"><span>Weapon</span><select id="weapon"></select></div>
<div class="row wide" id="metalL"><span>Metal</span><select id="metal"></select></div>
<div class="row" id="bowL"><span>Bow</span><span></span><input type="color" id="c_bow" value="#7a5230" title="Bow colour"></div>
<div class="row wide" id="shieldL"><span>Shield</span><select id="shield"></select></div>
<div class="row wide" id="shMetalL"><span>Metal</span><select id="shMetal"></select></div>
</section>
<section id="wearSec"><h2>Worn</h2><div id="wearRows"></div></section>
<section><h2>Play</h2>
<div class="row wide"><span>Animation</span><select id="anim"></select></div>
<div class="row wide" id="sideL"><span>Side</span><select id="side"></select></div>
<div class="row wide"><span>Speed</span><select id="speed"><option value="0.25">&frac14;</option><option value="0.5">&frac12;</option><option value="1" selected>game speed</option><option value="2">2&times;</option></select></div>
<div class="row wide"><span>Size</span><select id="size"><option value="1">game size</option><option value="2">twice</option></select></div>
<div class="buttons"><button id="prev" title="One frame back">&#9664;</button><button id="play">Pause</button><button id="next" title="One frame on">&#9654;</button></div>
<div id="fr"></div>
</section>
</aside>
<main class="grid" id="grid"></main></div>
<script>
const D=${JSON.stringify(data)};
const $=id=>document.getElementById(id),F=D.F,imgs={},W=D.wear,show=(id,on)=>$(id).classList.toggle('hide',!on);
const img=src=>{if(!src)return null;if(!imgs[src]){const i=new Image();i.src=src;imgs[src]=i;}return imgs[src];};
const weapons=D.parts.filter(p=>p.slot==='weapon'),shields=D.parts.filter(p=>p.slot==='shield'),isBow=w=>!!W&&W.bows.some(b=>b.part===w);
const opts=(list,sel)=>list.map(([v,t,tip])=>'<option value="'+v+'"'+(tip?' title="'+tip+'"':'')+(v===sel?' selected':'')+'>'+t+'</option>').join('');
$('weapon').innerHTML='<optgroup label="Weapons">'+opts(weapons.map(p=>[p.part,p.name]))+'</optgroup>'+(W&&W.bows.length?'<optgroup label="Bows">'+opts(W.bows.map(b=>[b.part,b.name,b.tip]))+'</optgroup>':'')+'<option value="">Empty hand</option>';
$('shield').innerHTML='<option value="">none</option>'+opts(shields.map(p=>[p.part,p.name]));show('shieldL',shields.length);
// a metal list for a part that comes in metals, kept on the metal already picked when it can be
const metalFor=(sel,p,keep)=>{if(p&&p.metals){$(sel).innerHTML=opts(p.metals.map(v=>[v,v]));$(sel).value=p.metals.includes(keep)?keep:p.first;}return !!(p&&p.metals);};
const fillMetal=()=>{const w=$('weapon').value;show('metalL',metalFor('metal',weapons.find(q=>q.part===w),$('metal').value));show('bowL',isBow(w));};
const fillShMetal=()=>show('shMetalL',metalFor('shMetal',shields.find(q=>q.part===$('shield').value),$('shMetal').value));
$('weapon').onchange=fillMetal;$('shield').onchange=fillShMetal;
// a sheet in iron's colours, with iron's six swapped for a metal's six: made once per sheet and metal, as the game's shader does on every frame
const swapped=new Map();
const inMetal=(src,metal)=>{const i=img(src);if(!i||!metal||metal==='iron')return i;if(!i.complete||!i.naturalWidth)return null;let m=swapped.get(i);if(!m)swapped.set(i,m={});if(!m[metal]){const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);const d=g.getImageData(0,0,c.width,c.height),p=d.data,from=D.metals.iron,to=D.metals[metal];for(let o=0;o<p.length;o+=4){if(!p[o+3])continue;for(let k=0;k<from.length;k++)if(p[o]===from[k][0]&&p[o+1]===from[k][1]&&p[o+2]===from[k][2]){p[o]=to[k][0];p[o+1]=to[k][1];p[o+2]=to[k][2];break;}}g.putImageData(d,0,0);m[metal]=c;}return m[metal];};
// worn parts: loaded from the Creator folder beside the page, tinted the way the game does (grey x colour / grey_ref), made once per sheet and colour
const tints=new Map(),wsrc=(part,a)=>W.root+'/'+part+'/'+a+'.png';
const tinted=(src,hex)=>{const i=img(src);if(!i||!i.complete||!i.naturalWidth)return null;const k=src+hex;if(!tints.has(k)){const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d');g.drawImage(i,0,0);g.globalCompositeOperation='multiply';g.fillStyle='rgb('+[1,3,5].map(o=>Math.min(255,Math.round(parseInt(hex.slice(o,o+2),16)*255/W.grey))).join(',')+')';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='destination-in';g.drawImage(i,0,0);tints.set(k,c);}return tints.get(k);};
show('wearSec',!!W);show('presetRow',!!(W&&W.presets.length));
if(W){$('wearRows').innerHTML=W.slots.map(s=>'<div class="row"><span>'+s.label+'</span><select id="w_'+s.key+'"><option value="">none</option>'+opts(s.parts.map(p=>[p.part,p.name,p.tip]))+'</select><input type="color" id="c_'+s.key+'" title="'+s.label+' colour"></div>').join('');
  $('preset').innerHTML='<option value="">choose a look</option>'+opts(W.presets.map((p,i)=>[String(i),p.name]));}
const wearDefaults=()=>{if(!W)return;const r=D.races.find(x=>x.name===$('race').value)||D.races[0];for(const s of W.slots){const [p,c]=r.wear[s.key];$('w_'+s.key).value=p;$('c_'+s.key).value=c;}};
$('race').innerHTML=opts(D.races.map(r=>[r.name,r.name[0].toUpperCase()+r.name.slice(1)]))+(D.races.length>1?'<option value="*">All, side by side</option>':'');
$('side').innerHTML=opts(D.dirs.map((d,i)=>[String(i),d]));$('side').value=D.dirs.indexOf('SE');
const isAttack=a=>/^(Attack|Kick|Special)/.test(a);   // the attacks first in the list, the rest under them
const animList=()=>{const r=$('race').value,ok=a=>r==='*'?Object.keys(D.anims[a].races).length:D.anims[a].races[r],keep=$('anim').value,L=Object.keys(D.anims).filter(ok);
  $('anim').innerHTML='<optgroup label="Attacks">'+opts(L.filter(isAttack).map(a=>[a,a]))+'</optgroup><optgroup label="Other">'+opts(L.filter(a=>!isAttack(a)).map(a=>[a,a]))+'</optgroup>';
  if(L.includes(keep))$('anim').value=keep;};animList();
if(D.anims[D.start.anim])$('anim').value=D.start.anim;if(weapons.some(p=>p.part===D.start.part))$('weapon').value=D.start.part;fillMetal();fillShMetal();
if(D.start.part&&weapons.some(p=>p.part===D.start.part)&&D.start.metal)$('metal').value=D.start.metal;
// a cell holds the biggest race: every race is drawn at its own size around the same foot point, so sizes compare cell to cell
const TOP=12,BOT=124;   // the rows of a frame a character, its weapon and its shadow use: the rest is cut off
const MX=Math.max(...D.races.map(r=>r.scale[0])),MY=Math.max(...D.races.map(r=>r.scale[1])),CW=Math.ceil(F*MX),CH=Math.ceil((BOT-TOP)*MY),FX=D.foot[0]*MX,FY=(D.foot[1]-TOP)*MY;
let cells=[];   // [canvas context, race, side]
function build(){
  const r=$('race').value;$('grid').innerHTML='';cells=[];show('sideL',r==='*');
  const list=r==='*'?D.races.map(x=>[x,+$('side').value]):D.dirs.map((_,i)=>[D.races.find(x=>x.name===r),i]);
  for(const [race,side] of list){const f=document.createElement('figure'),c=document.createElement('canvas');c.width=CW;c.height=CH;f.appendChild(c);const cap=document.createElement('figcaption');cap.textContent=r==='*'?race.name+' · '+D.dirs[side]:D.dirs[side];f.appendChild(cap);$('grid').appendChild(f);const g=c.getContext('2d');g.imageSmoothingEnabled=false;cells.push([g,race,side]);}
  sizeCell();animList();
}
const sizeCell=()=>$('grid').style.setProperty('--cell',Math.round(CW*D.scale*$('size').value)+'px');$('size').onchange=sizeCell;
$('race').onchange=()=>{wearDefaults();build();};$('side').onchange=build;wearDefaults();build();
let playing=true,clock=0,last=performance.now(),step=0;
// a preset sets the race, every slot (a slot it leaves out is emptied), the weapon and its metal, the shield and its metal, and the animation
if(W&&W.presets.length)$('preset').onchange=()=>{const P=W.presets[$('preset').value];if(!P)return;
  if(D.races.some(r=>r.name===P.race)&&$('race').value!=='*')$('race').value=P.race;wearDefaults();build();
  for(const s of W.slots){const v=(P.wear||{})[s.key];$('w_'+s.key).value=v?v[0]:'';if(v)$('c_'+s.key).value=v[1];}
  const has=(id,v)=>[...$(id).options].some(o=>o.value===v);
  if(P.weapon!==undefined&&has('weapon',P.weapon))$('weapon').value=P.weapon;fillMetal();if(P.metal&&has('metal',P.metal))$('metal').value=P.metal;if(P.bow)$('c_bow').value=P.bow;
  const sh=P.shield===true?(shields[0]||{}).part||'':P.shield||'';$('shield').value=has('shield',sh)?sh:'';fillShMetal();if(P.shieldMetal&&has('shMetal',P.shieldMetal))$('shMetal').value=P.shieldMetal;
  if(P.anim&&has('anim',P.anim))$('anim').value=P.anim;clock=0;step=0;};
const fpsOf=(a,d)=>a==='Walk'?D.walkFps[d]:a==='Run'?D.runFps[d]:(D.fps[a]||12);   // Walk and Run keep the foot on the ground (D226); an animation the game gives no rate plays at 12 frames a second
function draw(){
  const a=$('anim').value,A=D.anims[a],w=$('weapon').value,sh=$('shield').value,bow=isBow(w),shown=[];if(!A)return;
  const shP=shields.find(p=>p.part===sh),shImg=()=>shP?(shP.metals?inMetal(A.held[sh],$('shMetal').value):img(A.held[sh])):null;
  for(const [g,race,d] of cells){
    const fr=((Math.floor(clock*fpsOf(a,d))+step)%D.frames+D.frames)%D.frames,R=A.races[race.name];shown.push(fr);
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,CW,CH);if(!R)continue;
    const [sx,sy]=race.scale;g.setTransform(sx,0,0,sy,FX-D.foot[0]*sx,FY-D.foot[1]*sy);   // the race's size, feet on the same spot
    const lay=i=>{if(i&&(i.width&&!('complete' in i)||i.complete&&i.naturalWidth))g.drawImage(i,fr*F,d*F,F,F,0,0,F,F);},put=s=>lay(img(s));
    // the weapon (a repainted part in its metal, or a tinted bow) and a shield on the far side, behind or in front of the body
    const held=front=>{const L=[];if(w&&D.front.weapon[d]===front)L.push(bow?tinted(wsrc(w,a),$('c_bow').value):inMetal(A.held[w],$('metal').value));if(shP&&front===0&&D.front.shield[d]===0)L[D.shieldOver[d]?'push':'unshift'](shImg());L.forEach(lay);};
    // a shield in front of the body goes over the hands: the hand that holds it is behind it (the Creator's hands sheet has both hands)
    if(!W){put(A.shadow);held(0);put(R.body);held(1);put(R.hands);if(shP&&D.front.shield[d]===1)lay(shImg());continue;}
    // the worn parts in the test game's order (legs, shoes, chest, belt, head), the hip item after the belt, a back item behind
    // the body unless the character faces away
    const wear=k=>{const p=$('w_'+k).value;if(p)lay(tinted(wsrc(p,a),$('c_'+k).value));};
    put(A.shadow);held(0);if(!W.back[d])wear('back');put(R.body);wear('legs');wear('shoes');wear('chest');wear('belt');wear('hip');if(W.back[d])wear('back');wear('head');held(1);wear('hands');if(shP&&D.front.shield[d]===1)lay(shImg());
  }
  $('fr').textContent='frame '+(shown[0]??0)+' of '+(D.frames-1);
}
function tick(now){const dt=(now-last)/1000;last=now;if(playing)clock+=dt*$('speed').value;draw();requestAnimationFrame(tick);}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('prev').onclick=()=>{playing=false;$('play').textContent='Play';step--;};$('next').onclick=()=>{playing=false;$('play').textContent='Play';step++;};
$('anim').onchange=()=>{clock=0;step=0;};
requestAnimationFrame(tick);
</script></body></html>`;

mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, page);
console.log(`Page: ${out} (${(page.length / 1048576).toFixed(1)} MB; ${anims.length} animations, ${parts.length} parts, ${races.map(r => r.name).join(', ')}${WEAR ? `; worn parts and bows read from ${data.wear.root}/ beside it` : ''}). Open it in a browser.`);
