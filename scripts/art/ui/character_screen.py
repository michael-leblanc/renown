#!/usr/bin/env python3
"""The agreed draft of the character screen (Michael, 2026-11-18; D239 to D241): one picture to look at.

    python3 scripts/art/ui/character_screen.py [--out prototype/shots/ui-character-screen.png] [--scale 2]

Run it from the repo's root. Needs Python 3 with Pillow and numpy (pip install pillow numpy): the drafts were
made with them in a chat, and this is that draft kept as it was shown, not yet the pieces the game draws.
The Node rewrite that writes those pieces (frame, stage, slot, medallion, strap, satchel) is still to do.

What it draws: the satchel layout. A lit stage across the top with the character on it (the Creator's parts
in the human's test tints, D121), a round bandage slot (D169), race, then a short list of label and value;
the four stats as bronze medallions down the right; the nine worn-gear slots in a curved row on a strap, the
two hands bigger at the ends; the pack (12 + 8, D124) as an open stitched leather satchel.
Text is Alegreya (scripts/art/ui/fonts/, OFL 1.1): a label in KEY's colour, its value in VAL's.
Every number on it (stats, health, run, counts) is made up for the draft.

The picture holds bought art (the Creator character, the tileset's grass): it goes to a git-ignored folder
and is never committed. Everything else on it is made here by maths.
"""
import argparse, json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

K = 3                                   # everything is drawn K times bigger, then shrunk
HERE = os.path.dirname(os.path.abspath(__file__))
ITEMS_DIR = 'prototype/art/made/items/pack/'          # the pack pictures (D237), made by items.mjs
CREATOR_DIR = 'game/client/art/creator/'              # bought art already in the repo
CHARACTER_DATA = 'prototype/character/character_data.json'
GRASS = 'game/client/art/tiles/'

KEY, VAL = (196, 160, 98), (242, 234, 214)            # a label, and its value (D241)
EDGE = (150, 130, 96)                                 # the thin gold edge of a filled slot
# A slot's background takes its item's material. Claude's idea, in every draft Michael liked, never asked:
# Renown has no rarity to colour a slot by (D132).
MAT = {'iron': (52, 58, 66), 'bronze': (70, 52, 30), 'cloth': (56, 56, 34), 'leather': (64, 44, 30), 'wood': (58, 46, 30), 'gold': (72, 60, 24), None: (16, 16, 16)}
METALS = {                                            # pale to dark
  'bronze': [(250, 222, 160), (214, 170, 98), (160, 112, 52), (96, 62, 26), (52, 32, 14)],
  'steel': [(200, 200, 196), (130, 130, 126), (80, 80, 78), (44, 44, 44), (18, 18, 18)],
}
# The draft's character: what it wears, and what is in its pack. Worn items are not also in the pack.
WORN = {'Head': (None, None), 'Chest': ('Tunic Blue', 'cloth'), 'Hands': (None, None), 'Legs': ('Trousers Undyed', 'cloth'), 'Feet': ('Shoes', 'leather'),
        'Back': (None, None), 'Belt': ('Belt', 'leather'), 'Main hand': ('Long Sword Iron', 'iron'), 'Off hand': ('Round Shield', 'wood')}
GEAR_ROW = ['Main hand', 'Head', 'Chest', 'Hands', 'Back', 'Belt', 'Legs', 'Feet', 'Off hand']
PACK = [('Coins', 'gold'), ('Arrows', 'wood'), ('Short Bow', 'wood'), ('Leather Tunic', 'leather'), ('Hood Green', 'cloth'), ('Helmet Iron', 'iron'), ('Axe Bronze', 'bronze')] \
     + [(None, None)] * 5 + [('Trousers Red', 'cloth')] + [(None, None)] * 7
COUNTS = {'Coins': '37', 'Arrows': '24'}
LIST = [('Background', 'Well-woken'), ('Name', 'Unknown'), ('Health', '32 / 44'), ('Run', '55%')]
STATS = [('Strength', '14', 'STR'), ('Agility', '11', 'AGI'), ('Endurance', '12', 'END'), ('Intellect', '9', 'INT')]

# ---------- noise, metal, wear ----------
_G = np.random.RandomState(7).rand(512, 512)
def vnoise(x, y):
  """Smooth noise, 0 to 1, the same every run."""
  x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  g = lambda a, b: _G[b % 512, a % 512]
  return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy

def metal(mask, kind, w, h):
  """A mask (white = metal) as brushed metal lit from the top left, with a dark rim."""
  m = np.asarray(mask, float) / 255
  ys = np.linspace(0, 1, h)[:, None] * np.ones((1, w)); r = np.array(METALS[kind], float)
  t = np.clip(.15 + .75 * ys + .08 * np.sin(ys * 14 + np.linspace(0, 3, w)[None]), 0, 1)
  i = np.clip((t * (len(r) - 1)).astype(int), 0, len(r) - 2); f = (t * (len(r) - 1) - i)[..., None]
  col = r[i] * (1 - f) + r[i + 1] * f
  gy, gx = np.gradient(np.asarray(mask.filter(ImageFilter.GaussianBlur(2 * K)), float) / 255)
  col = col * (1 + np.clip(-(gx * .7 + gy) * 18 * K / 3, -.6, .9))[..., None]
  col = col * (.55 + .45 * np.asarray(mask.filter(ImageFilter.MinFilter(3)), float) / 255)[..., None]
  return Image.fromarray(np.dstack([np.clip(col, 0, 255), m * 255]).astype(np.uint8), 'RGBA')

def grime(img, amt):
  """Wear on a metal picture: blotches and fine scratches."""
  a = np.asarray(img).astype(float); H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
  a[..., :3] *= (1 - amt) + amt * (vnoise(xx / (5 * K), yy / (5 * K)) * .6 + vnoise(xx / (1.3 * K), yy / (1.3 * K)) * .4)[..., None]
  a[..., :3] += ((vnoise(xx / (40 * K), yy / (.6 * K)) > .82) * .35)[..., None] * 60 * (a[..., 3:] > 0)
  return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

# ---------- text ----------
# Small text drawn straight at 11 px gets uneven gaps between letters from the drawing library, not from the
# font. So text is drawn 4 times bigger and shrunk, which keeps the font's own spacing.
def font(size):
  """Headings and numbers (15 px and up) in Alegreya SC, the rest in Alegreya; both bold."""
  if size >= 15: return ImageFont.truetype(os.path.join(HERE, 'fonts/AlegreyaSC-Bold.woff'), round(size * 1.05))
  return ImageFont.truetype(os.path.join(HERE, 'fonts/Alegreya-Bold.woff'), round(size * (1.1 if size > 10 else 1.15)))
def text_width(t, f): return ImageDraw.Draw(Image.new('L', (1, 1))).textlength(t, font=f.font_variant(size=f.size * 4)) / 4
def text(im, xy, t, f, fill, stroke=0, stroke_fill=None):
  f4 = f.font_variant(size=f.size * 4); sw = stroke * 4
  w = int(ImageDraw.Draw(im).textlength(t, font=f4)) + 8 * sw + 16; h = f.size * 4 * 2
  tmp = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(tmp).text((sw + 4, sw + 4), t, font=f4, fill=tuple(fill[:3]) + (255,), stroke_width=sw, stroke_fill=stroke_fill)
  im.alpha_composite(tmp.resize((w // 4 + 1, h // 4), Image.LANCZOS), (int(round(xy[0])) - (sw + 4) // 4, int(round(xy[1])) - (sw + 4) // 4))

# ---------- the game's own pictures ----------
def icon(name, size):
  im = Image.open(ITEMS_DIR + name + '.png').convert('RGBA').crop((102, 102, 154, 154))
  return im.resize((56, 56)).crop((4, 4, 52, 52)).resize((size, size), Image.LANCZOS)
def character(direction='S', frame=0, scale=4):
  """The test game's human from the Creator's parts, each part's grey swapped for its tint (D121)."""
  cd = json.load(open(CHARACTER_DATA)); hx = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
  tints = dict(cd['races']['human']['tints']); tints['Shield1'] = '#7a5230'       # a wooden round shield (D220)
  di = cd['directions'].index(direction); out = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
  for p in cd['layer_order'][direction]:
    if p == 'Shadow': continue
    a = np.asarray(Image.open(f'{CREATOR_DIR}{p}/Idle.png').convert('RGBA').crop((frame * 128, di * 128, frame * 128 + 128, di * 128 + 128))).astype(float)
    a[..., :3] = np.clip(a[..., :3] * np.array(hx(tints[p]), float) / (cd['sheet']['grey_ref'] * 255), 0, 255)
    out.alpha_composite(Image.fromarray(a.astype(np.uint8), 'RGBA'))
  out = out.crop(out.getbbox())
  return out.resize((out.width * scale, out.height * scale), Image.NEAREST)
def world(W, H):
  """The game's grass with a tree and a rock, dimmed: what the screen opens over."""
  g = Image.open(GRASS + 'Ground A2_S.png').convert('RGBA'); bg = Image.new('RGBA', (W, H), (30, 32, 36, 255))
  for j in range(-2, H // 32 + 4):
    for i in range(-2, W // 128 + 3):
      x = i * 128 + (64 if j % 2 else 0) - 128; y = j * 32 - 208
      if -256 < x < W and -256 < y < H: bg.alpha_composite(g, (x, y))
  for t, p in [('Tree A1_S', (250, -40)), ('Stone A1_S', (-60, 250))]: bg.alpha_composite(Image.open(GRASS + t + '.png').convert('RGBA'), p)
  bg.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, 120)))
  return bg

# ---------- the panel ----------
class Panel:
  """A panel drawn K times its size: textures into img, metal shapes into the mask fm, slots and medallions kept
  as lists; render() puts them together and shrinks the lot. Sizes and places are in the panel's own pixels."""
  def __init__(s, w, h):
    s.w, s.h, s.W, s.H = w, h, w * K, h * K
    s.yy, s.xx = np.mgrid[0:s.H, 0:s.W].astype(np.float32)
    s.img = s.tex((24, 31, 33)); s.fm = Image.new('L', (s.W, s.H), 0); s.fd = ImageDraw.Draw(s.fm)
    s.cells, s.medals, s.post = [], [], []
  def tex(s, rgb, a=12, b=8):
    n = (vnoise(s.xx / (14 * K), s.yy / (14 * K)) - .5) * a + (vnoise(s.xx / (2 * K), s.yy / (2 * K)) - .5) * b
    return np.clip(np.array(rgb, np.float32)[None, None] + n[..., None], 0, 255)
  def rect(s, x0, y0, x1, y1):
    m = np.zeros((s.H, s.W), bool); m[int(y0 * K):int(y1 * K), int(x0 * K):int(x1 * K)] = True; return m
  def stage(s, m, cx, cy, rx, ry, c0=(22, 17, 14), c1=(96, 62, 40)):
    """A dark stage with a pool of warm, smoky light."""
    glow = np.clip(1 - np.hypot((s.xx - cx * K) / (rx * K), (s.yy - cy * K) / (ry * K)), 0, 1) ** 1.6
    smoke = vnoise(s.xx / (30 * K) + np.sin(s.yy / (40 * K)), s.yy / (30 * K))
    s.img[m] = (np.array(c0, np.float32)[None, None] + (glow * (.75 + .5 * smoke))[..., None] * np.array(c1, np.float32))[m]
  def trim(s, x0, y0, x1, y1, w=1.5): s.fd.rectangle((x0 * K, y0 * K, x1 * K, y1 * K), outline=255, width=int(w * K))
  def spike(s, cx, cy, ang, L=14, w=3):
    a = math.radians(ang); px, py = -math.sin(a), math.cos(a)
    s.fd.polygon([(cx * K + px * w * K, cy * K + py * w * K), (cx * K + math.cos(a) * L * K, cy * K + math.sin(a) * L * K), (cx * K - px * w * K, cy * K - py * w * K)], fill=255)
  def outer(s):
    """The frame: two thin lines, a spike each way and a stud at every corner."""
    s.trim(4, 4, s.w - 4, s.h - 4, 3); s.trim(10, 10, s.w - 10, s.h - 10, 1)
    for cx, cy, a1, a2 in [(4, 4, -90, 180), (s.w - 4, 4, -90, 0), (4, s.h - 4, 90, 180), (s.w - 4, s.h - 4, 90, 0)]:
      s.spike(cx, cy, a1, 16); s.spike(cx, cy, a2, 16); s.fd.ellipse(((cx - 5) * K, (cy - 5) * K, (cx + 5) * K, (cy + 5) * K), fill=255)
  def cell(s, x, y, w, h, mat, item=None, label=None, circle=False, count=None): s.cells.append((x, y, w, h, mat, item, label, circle, count))
  def medal(s, cx, cy, sym): s.medals.append((cx, cy, sym))
  def render(s):
    base = Image.fromarray(np.dstack([s.img, np.full((s.H, s.W), 255, np.float32)]).astype(np.uint8), 'RGBA'); d = ImageDraw.Draw(base)
    for (x, y, w, h, mat, item, label, circle, count) in s.cells:          # a slot: its material's colour, paler in the middle
      X0, Y0, X1, Y1 = x * K, y * K, (x + w) * K, (y + h) * K; cw, ch = int(X1 - X0), int(Y1 - Y0); gy, gx = np.mgrid[0:ch, 0:cw]
      r = np.hypot((gx - cw / 2) / (cw / 2), (gy - ch / 2) / (ch / 2))
      t = np.clip(np.array(MAT[mat], np.float32)[None, None] * (1.35 - .6 * r)[..., None] + (vnoise(gx / (4 * K), gy / (4 * K)) - .5)[..., None] * 10, 0, 255)
      tile = Image.fromarray(np.dstack([t, np.full((ch, cw), 255)]).astype(np.uint8), 'RGBA')
      if circle:
        mk = Image.new('L', (cw, ch), 0); ImageDraw.Draw(mk).ellipse((0, 0, cw - 1, ch - 1), fill=255); base.paste(tile, (int(X0), int(Y0)), mk)
        d.ellipse((X0, Y0, X1, Y1), outline=EDGE + (200,), width=int(1.5 * K)); d.ellipse((X0 + 2 * K, Y0 + 2 * K, X1 - 2 * K, Y1 - 2 * K), outline=(0, 0, 0, 180), width=K)
      else:
        base.paste(tile, (int(X0), int(Y0)))
        d.rectangle((X0, Y0, X1, Y1), outline=EDGE + (200,) if mat else (70, 66, 60, 200), width=int(1.5 * K))
        d.rectangle((X0 + 2 * K, Y0 + 2 * K, X1 - 2 * K, Y1 - 2 * K), outline=(0, 0, 0, 170), width=K)
    for (cx, cy, sym) in s.medals:                                         # a stat's medallion: a bronze ring and a sign
      R = 19 * K; mk = Image.new('L', (s.W, s.H), 0); md = ImageDraw.Draw(mk); X, Y, k = cx * K, cy * K, K
      md.ellipse((X - R, Y - R, X + R, Y + R), outline=255, width=int(2.5 * K))
      if sym == 'STR':                                                     # crossed swords: damage (D159)
        for sg in (1, -1):
          md.line([(X - 9 * k * sg, Y + 9 * k), (X + 9 * k * sg, Y - 9 * k)], fill=255, width=int(2.5 * k))
          md.line([(X - 5 * k * sg - 3 * k, Y + 5 * k - 3 * k * sg), (X - 5 * k * sg + 3 * k, Y + 5 * k + 3 * k * sg)], fill=255, width=2 * k)
      if sym == 'AGI': md.ellipse((X - 4 * k, Y - 11 * k, X + 4 * k, Y + 8 * k), fill=255); md.line([(X + 6 * k, Y - 12 * k), (X - 5 * k, Y + 12 * k)], fill=0, width=k)   # a feather: hit and dodge
      if sym == 'END': md.ellipse((X - 9 * k, Y - 7 * k, X, Y + 2 * k), fill=255); md.ellipse((X, Y - 7 * k, X + 9 * k, Y + 2 * k), fill=255); md.polygon([(X - 9 * k, Y - k), (X + 9 * k, Y - k), (X, Y + 10 * k)], fill=255)   # a heart: health
      if sym == 'INT': md.polygon([(X - 11 * k, Y - 6 * k), (X, Y - 3 * k), (X, Y + 8 * k), (X - 11 * k, Y + 5 * k)], fill=255); md.polygon([(X + 11 * k, Y - 6 * k), (X + k, Y - 3 * k), (X + k, Y + 8 * k), (X + 11 * k, Y + 5 * k)], fill=255)   # an open book: learning
      bg = Image.new('L', (s.W, s.H), 0); ImageDraw.Draw(bg).ellipse((X - R, Y - R, X + R, Y + R), fill=255)
      base.paste(Image.new('RGBA', (s.W, s.H), (26, 24, 22, 255)), (0, 0), bg); base.alpha_composite(metal(mk, 'bronze', s.W, s.H))
    sh = Image.new('RGBA', (s.W, s.H), (0, 0, 0, 0)); sh.putalpha(s.fm.filter(ImageFilter.GaussianBlur(2 * K)).point(lambda v: v * .9))
    base.alpha_composite(sh, (K, 2 * K)); base.alpha_composite(grime(metal(s.fm, 'steel', s.W, s.H), .35))
    for f in s.post: f(base)
    out = base.resize((s.w, s.h), Image.LANCZOS)
    for (x, y, w, h, mat, item, label, circle, count) in s.cells:          # item pictures, counts and empty slots' names, at final size
      if item:
        sz = min(48, w - 4, h - 4); out.alpha_composite(icon(item, sz), (int(x + w / 2 - sz / 2), int(y + h / 2 - sz / 2)))
        if count: text(out, (x + w - 16, y + h - 15), count, font(10), (240, 232, 215), 2, (5, 5, 5))
      elif label:
        f = font(9); text(out, (x + (w - text_width(label, f)) / 2, y + h / 2 - 6), label, f, (110, 104, 94))
    return out

def character_screen():
  p = Panel(620, 760)
  p.stage(p.rect(22, 22, 598, 430), 310, 230, 260, 260)
  for i, (_, _, sym) in enumerate(STATS): p.medal(552, 90 + i * 70, sym)
  for i, n in enumerate(GEAR_ROW):                                        # the gear row sags in the middle, like pouches on a strap
    t = i / (len(GEAR_ROW) - 1); x = 40 + t * 500; y = 400 + math.sin(t * math.pi) * 44
    w, h = (60, 86) if n in ('Main hand', 'Off hand') else (52, 66)
    item, mat = WORN[n]; p.cell(x + 30 - w / 2, y - h / 2 + 30, w, h, mat, item, n)
  p.fd.arc((40 * K, 260 * K, 580 * K, 510 * K), 20, 160, fill=255, width=2 * K)          # the strap
  sm = Image.new('L', (p.W, p.H), 0); ImageDraw.Draw(sm).rounded_rectangle((22 * K, 540 * K, 598 * K, 742 * K), 24 * K, fill=255); sat = np.asarray(sm) > 0
  hide = (vnoise(p.xx / (1.2 * K), p.yy / (1.2 * K)) - .5) * 20 + (vnoise(p.xx / (9 * K), p.yy / (9 * K)) - .5) * 18
  p.img[sat] = np.clip(np.array([66, 42, 27], np.float32)[None, None] + hide[..., None], 0, 255)[sat]             # the satchel's leather
  p.fd.rounded_rectangle((280 * K, 528 * K, 340 * K, 556 * K), 4 * K, outline=255, width=3 * K)                     # its buckle
  for i, (item, mat) in enumerate(PACK): p.cell(40 + (i % 10) * 54, 578 + (i // 10) * 76, 50, 70, mat, item, None, False, COUNTS.get(item))
  def stitch(base):
    m = Image.new('L', (p.W, p.H), 0); ImageDraw.Draw(m).rounded_rectangle((30 * K, 548 * K, 590 * K, 734 * K), 18 * K, outline=255, width=K)
    a = np.asarray(m, np.float32) * (((p.xx + p.yy) % (8 * K)) < 4 * K)
    base.alpha_composite(Image.fromarray(np.dstack([np.full((p.H, p.W, 3), 196), a]).astype(np.uint8), 'RGBA'))
  p.post.append(stitch)
  p.cell(40, 40, 52, 52, 'cloth', 'Bandage', None, True, '3')
  p.outer()
  pan = p.render()
  ch = character('S', 0, 4); pan.alpha_composite(ch, (int(310 - ch.width / 2), int(360 - ch.height)))
  text(pan, (104, 44), 'Human', font(19), VAL)
  for i, (k, v) in enumerate(LIST): text(pan, (40, 108 + i * 19), k, font(11), KEY); text(pan, (118, 108 + i * 19), v, font(11), VAL)
  for i, (k, v, _) in enumerate(STATS):
    y = 90 + i * 70; text(pan, (526 - text_width(k, font(11)), y - 15), k, font(11), KEY); text(pan, (526 - text_width(v, font(16)), y), v, font(16), VAL)
  f = font(15); w = text_width('Pack', f); text(pan, (40, 549), 'Pack', f, KEY); text(pan, (40 + w + 8, 549), '13 / 20', f, VAL)
  w = text_width('37', f); text(pan, (566 - w, 549), '37', f, VAL); text(pan, (566 - w - 8 - text_width('Coins', f), 549), 'Coins', f, KEY)
  return pan

if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--out', default='prototype/shots/ui-character-screen.png'); ap.add_argument('--scale', type=int, default=2)
  a = ap.parse_args(); pan = character_screen()
  sec = world(pan.width + 60, pan.height + 40)
  sh = Image.new('RGBA', (pan.width + 40, pan.height + 40), (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle((20, 24, pan.width + 20, pan.height + 24), fill=(0, 0, 0, 200))
  sec.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)), (10, 0)); sec.alpha_composite(pan, (30, 20))
  os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
  sec.resize((sec.width * a.scale, sec.height * a.scale), Image.LANCZOS).save(a.out)
  print(f'{a.out} ({sec.width * a.scale} x {sec.height * a.scale})')
