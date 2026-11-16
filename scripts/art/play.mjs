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
const out = flag('--out', 'prototype/shots/held-play.html'), onlyRaces = flag('--races', ''), WEAR = argv.includes('--wear'), onlyAnims = flag('--anims', ''), [startPart, startAnim, startMetal] = flag('--start', ',').split(',');
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
const data = { start: { part: startPart || '', anim: startAnim || 'Attack1' }, F, frames: D.sheet.frames, dirs: D.directions, scale: D.sprite_scale, fps: D.anim_fps, parts: parts.map(m => ({ part: m.part, name: m.name, slot: m.slot, metals: m.metals, first: m.part === startPart && METALS.includes(startMetal) ? startMetal : m.metal })), metals: Object.fromEntries(METALS.map(k => [k, METAL[k]])), races: races.map(r => ({ name: r.name, scale: r.scale, wear: r.wear })), foot: D.sheet.foot_origin, anims: {} };
// where the weapon and the shield go in the pile on each side: 0 behind the body, 1 in front of it (the hands go over a weapon in front, and a shield in front goes over the hands)
const slotOf = (dir, re) => { const L = D.layer_order[dir]; return L.findIndex(p => re.test(p)) > L.indexOf('NakedBody') ? 1 : 0; };
// plain names for the parts (scripts/art/creator_parts.json), shown in the lists as "Horned helmet (Head14)"
const NAMES = JSON.parse(readFileSync(new URL('./creator_parts.json', import.meta.url), 'utf8'));
const named = p => NAMES[p] ? { part: p, name: `${NAMES[p].name}${NAMES[p].covers_face ? ', covers face' : ''}${NAMES[p].unsure ? ' ?' : ''} (${p})` } : { part: p, name: p };
const PRESETS = WEAR && existsSync(new URL('./creator_presets.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('./creator_presets.json', import.meta.url), 'utf8')).presets : [];
if (WEAR) data.wear = { root: relative(dirname(resolve(out)), resolve(CRE)).split('\\').join('/'), grey: GREY, slots: SLOTS.map(([key, label, prefix]) => ({ key, label, parts: numbered(prefix).map(named) })), bows: numbered('Ranged').map(named), back: D.directions.map(d => ['NW', 'N', 'NE'].includes(d) ? 1 : 0), presets: PRESETS.filter(p => races.some(r => r.name === p.race)) };
data.front = { weapon: D.directions.map(d => slotOf(d, /^Melee/)), shield: D.directions.map(d => slotOf(d, /^Shield/)) };
data.shieldOver = D.directions.map(d => { const L = D.layer_order[d]; return L.findIndex(p => /^Shield/.test(p)) > L.findIndex(p => /^Melee/.test(p)) ? 1 : 0; });
// the walk's rate keeps the planted foot still on the ground: the game works it out per side from the walk speed (D205)
data.walkFps = D.direction_grid_step.map(([gx, gy], d) => Math.hypot((gx - gy) * D.tile_px[0] / 2, (gx + gy) * D.tile_px[1] / 2) / D.tile_seconds / (D.foot_px_per_frame[d] * D.sprite_scale) * D.walk_fps_multiplier);
for (const a of anims) {
  const held = {}; for (const m of parts) { const f = `${SKIN}${m.part}/${a}.png`; if (existsSync(f)) { const p = readPng(f); held[m.part] = uri(p.data, p.width, p.height); } }
  const body = {}; for (const r of races) if (r.body.every(p => existsSync(`${CRE}${p}/${a}.png`))) body[r.name] = WEAR ? { body: stack(r.body, a, 1, r.tints) } : { body: stack(r.body, a, 1, r.tints), hands: stack([HANDS], a, 1, r.tints) };
  data.anims[a] = { shadow: stack(['Shadow'], a, D.shadow_alpha), races: body, held };
  console.log(`${a}: shadow, ${Object.keys(body).join(', ')}, and ${Object.keys(held).length} held parts`);
}

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renown: held parts in motion</title>
<style>
:root{color-scheme:light dark;--bg:#f4f2ec;--fg:#22201c;--mut:#6b665c;--line:#d5d0c4;--card:#fff}
@media(prefers-color-scheme:dark){:root{--bg:#1c1b18;--fg:#ece8dc;--mut:#a39d8f;--line:#3a3832;--card:#262521}}
*{box-sizing:border-box}body{margin:0;padding:14px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}
h1{font-size:16px;margin:0 0 2px}p{margin:0 0 10px;color:var(--mut)}
.bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:0 0 10px;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:8px}
label{display:flex;gap:6px;align-items:center;color:var(--mut)}select,button,input{font:inherit;color:var(--fg)}select,button{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 8px}button{cursor:pointer;min-width:34px}
.grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(var(--cell),1fr))}
figure{margin:0;background:#46602c;border-radius:6px;overflow:hidden;position:relative}canvas{display:block;width:100%;image-rendering:pixelated;image-rendering:crisp-edges}
figcaption{position:absolute;left:6px;top:4px;font-size:12px;color:#e8e6d8;text-shadow:0 1px 2px #0008}
#fr{font-variant-numeric:tabular-nums;min-width:11ch;color:var(--mut)}
</style></head><body>
<h1>Held parts in motion</h1><p>The test game's characters at their sizes (D205), all 8 sides, at the game's speed. The weapon and shield are the repainted Creator parts, the weapon scaled with the body (D121). The skeleton is a stand-in look. With worn parts: each slot picks a Creator part and its colour (the parts are grey, tinted as the game does); a bow shoots with Attack3.</p>
<div class="bar">
<label>Weapon <select id="weapon"></select></label>
<label id="metalL">Metal <select id="metal"></select></label>
<label><input type="checkbox" id="shield"> <span id="shieldName">Shield</span></label>
<label>Race <select id="race"></select></label>
<label id="sideL">Side <select id="side"></select></label>
<label>Animation <select id="anim"></select></label>
<label>Speed <select id="speed"><option value="0.25">&frac14;</option><option value="0.5">&frac12;</option><option value="1" selected>game speed</option><option value="2">2&times;</option></select></label>
<label>Size <select id="size"><option value="1">game size</option><option value="2">twice</option></select></label>
<button id="prev" title="One frame back">&#9664;</button><button id="play">Pause</button><button id="next" title="One frame on">&#9654;</button><span id="fr"></span>
</div>
<div class="bar" id="wearBar" style="display:none"></div>
<div class="grid" id="grid"></div>
<script>
const D=${JSON.stringify(data)};
const $=id=>document.getElementById(id),F=D.F,imgs={},cv=[];
const img=src=>{if(!src)return null;if(!imgs[src]){const i=new Image();i.src=src;imgs[src]=i;}return imgs[src];};
const weapons=D.parts.filter(p=>p.slot==='weapon'),shield=D.parts.find(p=>p.slot==='shield');
$('weapon').innerHTML=weapons.map(p=>'<option value="'+p.part+'">'+p.name+'</option>').join('')+(D.wear&&D.wear.bows.length?'<optgroup label="Bows (Creator, tinted)">'+D.wear.bows.map(b=>'<option value="'+b.part+'">'+b.name+'</option>').join('')+'</optgroup>':'')+'<option value="">Empty hand</option>';
// worn parts: loaded from the Creator folder beside the page, tinted the way the game does (grey x colour / grey_ref), made once per sheet and colour
const tints=new Map(),W=D.wear,wsrc=(part,a)=>W.root+'/'+part+'/'+a+'.png';
const tinted=(src,hex)=>{const i=img(src);if(!i||!i.complete||!i.naturalWidth)return null;const k=src+hex;if(!tints.has(k)){const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d');g.drawImage(i,0,0);g.globalCompositeOperation='multiply';g.fillStyle='rgb('+[1,3,5].map(o=>Math.min(255,Math.round(parseInt(hex.slice(o,o+2),16)*255/W.grey))).join(',')+')';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='destination-in';g.drawImage(i,0,0);tints.set(k,c);}return tints.get(k);};
if(W){const b=$('wearBar');b.style.display='';b.innerHTML=(W.presets.length?'<label>Preset <select id="preset"><option value="">choose a look</option>'+W.presets.map((p,i)=>'<option value="'+i+'">'+p.name+'</option>').join('')+'</select></label>':'')+W.slots.map(s=>'<label>'+s.label+' <select id="w_'+s.key+'"><option value="">none</option>'+s.parts.map(p=>'<option value="'+p.part+'">'+p.name+'</option>').join('')+'</select><input type="color" id="c_'+s.key+'"></label>').join('')+(W.bows.length?'<label>Bow colour <input type="color" id="c_bow" value="#7a5230"></label>':'');}
const wearDefaults=()=>{if(!W)return;const r=D.races.find(x=>x.name===$('race').value)||D.races[0];for(const s of W.slots){const [p,c]=r.wear[s.key];$('w_'+s.key).value=p;$('c_'+s.key).value=c;}};
const fillMetal=()=>{const p=weapons.find(q=>q.part===$('weapon').value),keep=$('metal').value;$('metalL').style.display=p&&p.metals?'':'none';$('metal').innerHTML=p&&p.metals?p.metals.map(v=>'<option>'+v+'</option>').join(''):'';if(p&&p.metals)$('metal').value=p.metals.includes(keep)?keep:p.first;};
// a sheet in iron's colours, with iron's six swapped for a metal's six: made once per sheet and metal, as the game's shader does on every frame
const swapped=new Map();
const inMetal=(src,metal)=>{const i=img(src);if(!i||!metal||metal==='iron')return i;if(!i.complete||!i.naturalWidth)return null;let m=swapped.get(i);if(!m)swapped.set(i,m={});if(!m[metal]){const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);const d=g.getImageData(0,0,c.width,c.height),p=d.data,from=D.metals.iron,to=D.metals[metal];for(let o=0;o<p.length;o+=4){if(!p[o+3])continue;for(let k=0;k<from.length;k++)if(p[o]===from[k][0]&&p[o+1]===from[k][1]&&p[o+2]===from[k][2]){p[o]=to[k][0];p[o+1]=to[k][1];p[o+2]=to[k][2];break;}}g.putImageData(d,0,0);m[metal]=c;}return m[metal];};
$('race').innerHTML=D.races.map(r=>'<option value="'+r.name+'">'+r.name[0].toUpperCase()+r.name.slice(1)+'</option>').join('')+(D.races.length>1?'<option value="*">All, side by side</option>':'');
$('side').innerHTML=D.dirs.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('');$('side').value=D.dirs.indexOf('SE');
const isAttack=a=>/^(Attack|Kick|Special)/.test(a);   // the attacks first in the list, the rest under them
const animList=()=>{const r=$('race').value,ok=a=>r==='*'?Object.keys(D.anims[a].races).length:D.anims[a].races[r],keep=$('anim').value,L=Object.keys(D.anims).filter(ok);
  $('anim').innerHTML='<optgroup label="Attacks">'+L.filter(isAttack).map(a=>'<option>'+a+'</option>').join('')+'</optgroup><optgroup label="Other">'+L.filter(a=>!isAttack(a)).map(a=>'<option>'+a+'</option>').join('')+'</optgroup>';
  if(L.includes(keep))$('anim').value=keep;};animList();
if(D.anims[D.start.anim])$('anim').value=D.start.anim;if(weapons.some(p=>p.part===D.start.part))$('weapon').value=D.start.part;fillMetal();$('weapon').onchange=fillMetal;
if(shield)$('shieldName').textContent=shield.name;else $('shield').parentNode.style.display='none';
// a cell holds the biggest race: every race is drawn at its own size around the same foot point, so sizes compare cell to cell
const TOP=12,BOT=124;   // the rows of a frame a character, its weapon and its shadow use: the rest is cut off
const MX=Math.max(...D.races.map(r=>r.scale[0])),MY=Math.max(...D.races.map(r=>r.scale[1])),CW=Math.ceil(F*MX),CH=Math.ceil((BOT-TOP)*MY),FX=D.foot[0]*MX,FY=(D.foot[1]-TOP)*MY;
let cells=[];   // [canvas context, race, side]
function build(){
  const r=$('race').value;$('grid').innerHTML='';cells=[];$('sideL').style.display=r==='*'?'':'none';
  const list=r==='*'?D.races.map(x=>[x,+$('side').value]):D.dirs.map((_,i)=>[D.races.find(x=>x.name===r),i]);
  for(const [race,side] of list){const f=document.createElement('figure'),c=document.createElement('canvas');c.width=CW;c.height=CH;f.appendChild(c);const cap=document.createElement('figcaption');cap.textContent=r==='*'?race.name+' · '+D.dirs[side]:D.dirs[side];f.appendChild(cap);$('grid').appendChild(f);const g=c.getContext('2d');g.imageSmoothingEnabled=false;cells.push([g,race,side]);}
  sizeCell();animList();
}
const sizeCell=()=>$('grid').style.setProperty('--cell',Math.round(CW*D.scale*$('size').value)+'px');$('size').onchange=sizeCell;
$('race').onchange=()=>{wearDefaults();build();};$('side').onchange=build;wearDefaults();build();
// a preset sets the race, every slot (a slot it leaves out is emptied), the weapon and its metal, the shield and the animation
if(W&&W.presets.length)$('preset').onchange=()=>{const P=W.presets[$('preset').value];if(!P)return;
  if(D.races.some(r=>r.name===P.race)&&$('race').value!=='*')$('race').value=P.race;wearDefaults();build();
  for(const s of W.slots){const v=(P.wear||{})[s.key];$('w_'+s.key).value=v?v[0]:'';if(v)$('c_'+s.key).value=v[1];}
  if(P.weapon!==undefined&&[...$('weapon').options].some(o=>o.value===P.weapon))$('weapon').value=P.weapon;fillMetal();
  if(P.metal&&[...$('metal').options].some(o=>o.value===P.metal))$('metal').value=P.metal;if(P.bow&&$('c_bow'))$('c_bow').value=P.bow;
  $('shield').checked=!!P.shield;if(P.anim&&[...$('anim').options].some(o=>o.value===P.anim))$('anim').value=P.anim;clock=0;step=0;};
let playing=true,clock=0,last=performance.now(),step=0;
const fpsOf=(a,d)=>a==='Walk'?D.walkFps[d]:(D.fps[a]||12);   // an animation the game gives no rate plays at 12 frames a second
function draw(){
  const a=$('anim').value,A=D.anims[a],w=$('weapon').value,sh=$('shield').checked&&shield?shield.part:'',shown=[];if(!A)return;
  for(const [g,race,d] of cells){
    const fr=((Math.floor(clock*fpsOf(a,d))+step)%D.frames+D.frames)%D.frames,R=A.races[race.name];shown.push(fr);
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,CW,CH);if(!R)continue;
    const [sx,sy]=race.scale;g.setTransform(sx,0,0,sy,FX-D.foot[0]*sx,FY-D.foot[1]*sy);   // the race's size, feet on the same spot
    const lay=i=>{if(i&&(i.width&&!('complete' in i)||i.complete&&i.naturalWidth))g.drawImage(i,fr*F,d*F,F,F,0,0,F,F);},put=s=>lay(img(s));
    const held=front=>{const L=[];if(w&&D.front.weapon[d]===front)L.push(inMetal(A.held[w],$('metal').value));if(sh&&front===0&&D.front.shield[d]===0)L[D.shieldOver[d]?'push':'unshift'](img(A.held[sh]));L.forEach(lay);};
    // a shield in front of the body goes over the hands: the hand that holds it is behind it (the Creator's hands sheet has both hands)
    if(!W){put(A.shadow);held(0);put(R.body);held(1);put(R.hands);if(sh&&D.front.shield[d]===1)lay(img(A.held[sh]));continue;}
    // the worn parts in the test game's order (legs, shoes, chest, belt, head), the hip item after the belt, a back item behind
    // the body unless the character faces away; a bow sits where a weapon does
    const wear=k=>{const p=$('w_'+k).value;if(p)lay(tinted(wsrc(p,a),$('c_'+k).value));},bow=W.bows.some(b=>b.part===w);
    const heldW=front=>{if(bow){if(D.front.weapon[d]===front)lay(tinted(wsrc(w,a),$('c_bow').value));const L=[];if(sh&&front===0&&D.front.shield[d]===0)L.push(img(A.held[sh]));L.forEach(lay);}else held(front);};
    put(A.shadow);heldW(0);if(!W.back[d])wear('back');put(R.body);wear('legs');wear('shoes');wear('chest');wear('belt');wear('hip');if(W.back[d])wear('back');wear('head');heldW(1);wear('hands');if(sh&&D.front.shield[d]===1)lay(img(A.held[sh]));
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
