# Puts an armour model that came WITHOUT a skeleton onto ours, for a race (first used for "Free Male Armor - 3 - Game
# Ready" by Kaan Tezcan, Sketchfab, CC BY 4.0; Michael, 2026-11-23: "try generate with the free_male_armor model"; then
# "Medivel_Armor" by vinhvan, CC BY 4.0).
#   python3.11 scripts/art/fit_armour.py --model <armour.glb> --race human|goblin --out <file.glb>
#        [--scale 0.68] [--at 0,0.02,0.926] [--assets <models folder>] [--lift 1.0] [--gap 0.5]
#        [--pieces "ArmArmor=Arms;ChestArmor=Chest;Pant=Pants"] [--name Armour3] [--mat A3] [--drop Sword]
#        [--pose sleeves:Arms | --pose wrists:Glove | --pose down:70] [--helmet-above 1.55] [--floor 0] [--flat 0.5] [--rigid 0.18,0.05] [--under <file>=<mesh>+<mesh>]
#   --pieces: which of the model's meshes make each piece ("A+B=Name": the meshes whose names start so; "*=Name": all the
#     others); a mesh named in --drop is left out. Objects are written <name>_<piece>, materials <mat>_<piece>.
#   --helmet-above Z: the loose parts (in the model's own units) whose middle is above Z and near the middle line become
#     their own piece, Helmet.
# The steps:
#   1 placed on the human: scaled by --scale and moved by --at (the armour's own units to ours; its shoulders on our
#     shoulders, its hems at our ankles)
#   2 its pose measured: the armour stands with its arms down. sleeves:<piece>: the line through the middle of each
#     sleeve gives the upper arm's and the forearm's way. wrists:<mesh>: the top of that mesh (a glove) on each side is
#     the wrist, and the arm runs straight from our shoulder to it. Our human body is posed so
#   3 weights: each armour point takes the bone weights of the nearest point of the posed body (shared between that face's
#     points as their nearness says)
#   3b --rigid: the pauldrons (past X, above Z) take one set of weights each, the mean of theirs; the rest (the
#     cuirass) loses its arm weights
#   4 stood in our rest (a T) again: each point moved back as its bones moved it (the posed bones undone, weighted)
#   5 pushed clear of the body (at least --gap pixels out, spread smoothly to the neighbours), and of what --under names
#     (the clothes worn under it, in that race's own files: a tunic, a shirt)
#   6 for the goblin: moved from the human's skeleton to the goblin's (each bone's move, stretched along the bone by its
#     length and across it by how much thicker the goblin's skin is there), then pushed clear of its skin, shorts and boots
#   6b no point lower than the race's soles (the renders stand everything loaded on its lowest point)
#   7b --flat: the texture replaced by one plain grey (for a texture with light baked in)
#   7 --lift: its textures made that much lighter (a dark model's tones otherwise all fall in a ramp's darkest end)
# Writes one .glb with a copy of the race's skeleton and the pieces.
import math
import os
import sys

import bpy
import bmesh  # noqa: E402 (after bpy: the module brings it)
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from character import load  # noqa: E402

args = sys.argv[1:]
def opt(name, default=None):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
MODEL, RACE, OUT = opt("--model"), opt("--race", "human"), opt("--out")
SCALE = float(opt("--scale", "0.68"))
AT = Vector(tuple(float(x) for x in opt("--at", "0,0.02,0.926").split(",")))
ASSETS = opt("--assets", "/mnt/project-files/characters/models")
LIFT = float(opt("--lift", "1.0"))
GAP_PX = float(opt("--gap", "0.5"))
PIECES = [(k.split("+"), v) for k, v in (x.split("=") for x in opt("--pieces", "ArmArmor=Arms;ChestArmor=Chest;Pant=Pants").split(";"))]
NAME, MAT = opt("--name", "Armour3"), opt("--mat", "A3")
DROP = [x for x in opt("--drop", "").split(",") if x]
POSE = opt("--pose", "sleeves:Arms")
HELMET = opt("--helmet-above")
FLOOR = opt("--floor")
FLAT = opt("--flat")
RIGID = opt("--rigid")
UNDER = opt("--under")   # "<file>=<mesh>+<mesh>": what is worn under it (in --assets), kept clear of too


def under_meshes():
    if not UNDER:
        return []
    f, names = UNDER.split("=")
    return [o for o in load(f"{ASSETS}/{f}") if o.type == "MESH" and o.name.split(".")[0] in names.split("+")]

bpy.ops.wm.read_factory_settings(use_empty=True)
base = load(f"{ASSETS}/quaternius_base/Superhero_Male_FullBody.gltf")
HA = next(o for o in base if o.type == "ARMATURE")
body = next(o for o in base if o.type == "MESH" and o.name.startswith("SuperHero_Male"))
gear = [o for o in load(MODEL) if o.type == "MESH"]

# 1 placed: the armour's points into the human skeleton's space, its meshes gathered into pieces
toH = HA.matrix_world.inverted()
place = lambda o, co: toH @ (AT + (o.matrix_world @ co) * SCALE)
def piece_of(o):
    if any(o.name.startswith(d) for d in DROP):
        return None
    for pre, nm in PIECES:
        if any(p != "*" and o.name.startswith(p) for p in pre):
            return nm
    return next((nm for pre, nm in PIECES if "*" in pre), None)
groups = {}
for o in gear:
    nm = piece_of(o)
    if nm:
        groups.setdefault(nm, []).append(o)
if HELMET:
    groups.setdefault("Helmet", [])
pieces = []
for nm, objs in groups.items():
    bm = bmesh.new()
    mats = []
    for o in objs:
        me = o.data.copy()
        for v in me.vertices:
            v.co = place(o, v.co)
        remap = []
        for m in me.materials:   # one material per source material: the importer's copies (w7_mat.001) are the same one
            key = m.name.split(".")[0] if m else None
            if key not in [k for k, _ in mats]:
                mats.append((key, m))
            remap.append([k for k, _ in mats].index(key))
        for f in me.polygons:
            f.material_index = remap[f.material_index] if remap else 0
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    me = bpy.data.meshes.new(f"{NAME}_{nm}")
    bm.to_mesh(me); bm.free()
    for i, (_, m) in enumerate(mats):
        mc = m.copy() if m else bpy.data.materials.new("none")
        mc.name = f"{MAT}_{nm}" + (f"_{i}" if i else "")
        me.materials.append(mc)
    ob = bpy.data.objects.new(f"{NAME}_{nm}", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = HA.matrix_world.copy()
    pieces.append(ob)
if HELMET:   # loose parts high on the middle line go to the Helmet piece
    hz = toH @ (AT + Vector((0, 0, float(HELMET))) * SCALE)
    helm = next(o for o in pieces if o.name.endswith("_Helmet"))
    hb = bmesh.new(); hmats = []
    for ob in pieces:
        if ob is helm:
            continue
        bm = bmesh.new(); bm.from_mesh(ob.data); seen = set(); go = []
        for f0 in bm.faces:
            if f0 in seen:
                continue
            part, stack = [], [f0]
            while stack:
                f = stack.pop()
                if f in seen:
                    continue
                seen.add(f); part.append(f)
                stack += [g for e in f.edges for g in e.link_faces if g not in seen]
            vs = {v for f in part for v in f.verts}
            c = sum((v.co for v in vs), Vector()) / len(vs)
            if c.z > hz.z and abs(c.x) < 0.22 * SCALE:
                go += part
        if go:
            # the helmet's faces copied out, then deleted here
            me2 = bpy.data.meshes.new("tmp")
            bm2 = bm.copy()
            bm2.faces.ensure_lookup_table(); bm.faces.ensure_lookup_table()
            idx = {f.index for f in go}
            bmesh.ops.delete(bm2, geom=[f for f in bm2.faces if f.index not in idx], context="FACES")
            for f in bm2.faces:   # each face onto the helmet's own copy of its material
                m = ob.data.materials[f.material_index] if ob.data.materials else None
                key = next((nd.image.name for nd in m.node_tree.nodes if nd.type == "TEX_IMAGE" and nd.image), m.name) if m and m.use_nodes else None
                if key not in hmats:
                    hmats.append(key)
                    mc = m.copy() if m else bpy.data.materials.new("none")
                    i = len(hmats) - 1
                    mc.name = f"{MAT}_Helmet" + (f"_{i}" if i else "")
                    helm.data.materials.append(mc)
                f.material_index = hmats.index(key)
            bm2.to_mesh(me2); bm2.free(); hb.from_mesh(me2); bpy.data.meshes.remove(me2)
            bmesh.ops.delete(bm, geom=go, context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(ob.data)
            print(f"{ob.name}: {len(go)} faces moved to the helmet")
        bm.free()
    hb.to_mesh(helm.data); hb.free()
# 2 the armour's pose: the middle of each sleeve, slice by slice across its length
bones = HA.data.bones
def sleeve_ways(side):
    sgn = 1 if side == "l" else -1
    kind, what = POSE.split(":")
    if kind == "down":   # no sleeves and no gloves (a breastplate with pauldrons): the arms hang that many degrees below the T
        a = math.radians(float(what))
        way = Vector((sgn * math.cos(a), 0, -math.sin(a)))
        return way, way
    if kind == "wrists":
        src = [place(o, v.co) for o in gear if o.name.startswith(what) for v in o.data.vertices]
        src = [p for p in src if sgn * p.x > 0]
        top = max(p.z for p in src)
        wrist = [p for p in src if p.z > top - 0.15 * (top - min(q.z for q in src))]
        wr = sum(wrist, Vector()) / len(wrist)
        way = (wr - bones[f"upperarm_{side}"].head_local).normalized()
        return way, way
    arms = next(o for o in pieces if o.name.endswith(what))
    sh, el, wr = (bones[f"{b}_{side}"].head_local for b in ("upperarm", "lowerarm", "hand"))
    pts = [v.co for v in arms.data.vertices if sgn * v.co.x > abs(sh.x) * 0.9]
    def mid(x):
        s = [p for p in pts if abs(sgn * p.x - x) < 0.012]
        return sum(s, Vector()) / len(s) if s else None
    span = max(sgn * p.x for p in pts)
    a, b, c, d = (mid(abs(sh.x) + f * (span - abs(sh.x))) for f in (0.1, 0.35, 0.55, 0.85))
    return (b - a).normalized(), (d - c).normalized()

bpy.context.view_layer.objects.active = HA
bpy.ops.object.mode_set(mode="POSE")
for side in "lr":
    up, fore = sleeve_ways(side)
    for name, way in ((f"upperarm_{side}", up), (f"lowerarm_{side}", fore)):
        pb = HA.pose.bones[name]
        bpy.context.view_layer.update()
        now = pb.matrix.copy()
        dir_now = (now.to_3x3() @ Vector((0, 1, 0))).normalized()
        turn = dir_now.rotation_difference(way).to_matrix().to_4x4()
        h = now.to_translation()
        pb.matrix = Matrix.Translation(h) @ turn @ Matrix.Translation(-h) @ now
        bpy.context.view_layer.update()
        print(f"{name}: posed {math.degrees(dir_now.angle(way)):.0f} degrees down to the armour's sleeve")
bpy.ops.object.mode_set(mode="OBJECT")
for o in gear:
    bpy.data.objects.remove(o)
bpy.context.view_layer.update()

# 3 weights from the posed body
dg = bpy.context.evaluated_depsgraph_get()
posed = body.evaluated_get(dg).to_mesh()
Bb = HA.matrix_world.inverted() @ body.matrix_world
bv = [Bb @ v.co for v in posed.vertices]
tris = []
for p in posed.polygons:
    vs = list(p.vertices)
    for k in range(1, len(vs) - 1):
        tris.append((vs[0], vs[k], vs[k + 1]))
tree = BVHTree.FromPolygons(bv, tris)
gnames = {g.index: g.name for g in body.vertex_groups}
wts = [{gnames[g.group]: g.weight for g in v.groups if g.weight > 0} for v in body.data.vertices]
for ob in pieces:
    for n in {n for w in wts for n in w}:
        ob.vertex_groups.new(name=n)
    for v in ob.data.vertices:
        q, n, ti, d = tree.find_nearest(v.co)
        a, b, c = (bv[i] for i in tris[ti])
        # barycentric weights of q in the triangle
        v0, v1, v2 = b - a, c - a, q - a
        d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
        den = d00 * d11 - d01 * d01 or 1e-12
        wb = (d11 * d20 - d01 * d21) / den; wc = (d00 * d21 - d01 * d20) / den; wa = 1 - wb - wc
        mix = {}
        for i, f in zip(tris[ti], (wa, wb, wc)):
            f = max(0.0, f)
            for nm, w in wts[i].items():
                mix[nm] = mix.get(nm, 0) + f * w
        tot = sum(mix.values()) or 1
        for nm, w in mix.items():
            if w / tot > 0.01:
                ob.vertex_groups[nm].add([v.index], w / tot, "REPLACE")

# 3b --rigid X,Z: the points out past X on each side and above Z (the model's own units: its pauldrons) move as one
#    piece, with the mean of their weights; a model made in bits (a shoulder plate in five pieces, some nearer the ribs,
#    some the arm) is otherwise torn apart as the arm moves
if RIGID:
    rx, rz = (float(x) for x in RIGID.split(","))
    t = toH @ (AT + Vector((rx, 0, rz)) * SCALE)
    for ob in pieces:
        gn = {g.index: g.name for g in ob.vertex_groups}
        for sgn in (1, -1):
            grp = [v for v in ob.data.vertices if sgn * v.co.x > abs(t.x) and v.co.z > t.z]
            mean = {}
            for v in grp:
                for g in v.groups:
                    mean[gn[g.group]] = mean.get(gn[g.group], 0) + g.weight / len(grp)
            for v in grp:
                for g in list(v.groups):
                    ob.vertex_groups[g.group].remove([v.index])
                for nm, w in mean.items():
                    ob.vertex_groups[nm].add([v.index], w, "REPLACE")
            top = sorted(mean.items(), key=lambda x: -x[1])[:3]
            print(f"{ob.name}: {len(grp)} points on the {'left' if sgn > 0 else 'right'} move as one: " + ", ".join(f"{n} {w:.2f}" for n, w in top))
        # the rest is the cuirass: it does not follow the arms (its sides lie against the hanging arms in the model's pose)
        arm = ("upperarm_", "lowerarm_", "hand_", "thumb_", "index_", "middle_", "ring_", "pinky_")
        freed = 0
        for v in ob.data.vertices:
            if abs(v.co.x) > abs(t.x) and v.co.z > t.z:
                continue
            gs = [(gn[g.group], g.weight) for g in v.groups]
            keep = [(n, w) for n, w in gs if not n.startswith(arm)]
            if len(keep) == len(gs):
                continue
            freed += 1
            for g in list(v.groups):
                ob.vertex_groups[g.group].remove([v.index])
            tot = sum(w for _, w in keep)
            for n, w in (keep if tot > 1e-6 else [("spine_03", 1.0)]):
                ob.vertex_groups[n].add([v.index], w / (tot or 1), "REPLACE")
        print(f"{ob.name}: {freed} points of the cuirass no longer follow the arms")

# 4 back to our rest: each point moved as its bones' pose is undone
undo = {pb.name: pb.bone.matrix_local @ pb.matrix.inverted() for pb in HA.pose.bones}
for ob in pieces:
    gn = {g.index: g.name for g in ob.vertex_groups}
    for v in ob.data.vertices:
        acc, tw = Vector(), 0
        for g in v.groups:
            acc += g.weight * (undo[gn[g.group]] @ v.co); tw += g.weight
        if tw:
            v.co = acc / tw
for pb in HA.pose.bones:
    pb.matrix_basis = Matrix()
bpy.context.view_layer.update()


def tree_of(objs, toA):
    vs, fs = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        me = o.evaluated_get(dg).to_mesh(); k = len(vs); W = toA @ o.matrix_world
        vs += [W @ v.co for v in me.vertices]; fs += [[k + i for i in p.vertices] for p in me.polygons]
    return BVHTree.FromPolygons(vs, fs)


def clear(ob, tree, A, margin, rings=8, fall=0.85):
    """Every point at least margin out of the tree's surface (all in A's space): the push each needs, spread to its
    neighbours, made away from the line of the bone that moves it most."""
    toA = A.matrix_world.inverted() @ ob.matrix_world; back = toA.inverted()
    need = {}
    for v in ob.data.vertices:
        p = toA @ v.co; q, n, fi, d = tree.find_nearest(p)
        need[v.index] = max(0.0, margin - (p - q).dot(n)) if q is not None and d < 0.3 else 0.0
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    for _ in range(rings):
        nxt = dict(need)
        for v in bm.verts:
            m = max((need[e.other_vert(v).index] for e in v.link_edges), default=0) * fall
            if m > nxt[v.index]:
                nxt[v.index] = m
        need = nxt
    bm.free()
    gn = {g.index: g.name for g in ob.vertex_groups}
    moved = 0
    for v in ob.data.vertices:
        if need[v.index] <= 0 or not v.groups:
            continue
        b = A.data.bones.get(gn[max(v.groups, key=lambda g: g.weight).group])
        if b is None:
            continue
        p = toA @ v.co; h, t = b.head_local, b.tail_local
        k = max(0, min(1, (p - h).dot(t - h) / max((t - h).length_squared, 1e-9)))
        d = p - (h + (t - h) * k)
        if d.length > 1e-6:
            v.co = back @ (p + d.normalized() * need[v.index]); moved += 1
    return moved


# 5 clear of the human body
HPX = 1.81 / 96
ht = tree_of([body] + (under_meshes() if RACE != "goblin" else []), HA.matrix_world.inverted())
for ob in pieces:
    print(f"{ob.name}: {len(ob.data.vertices)} points, {clear(ob, ht, HA, GAP_PX * HPX)} pushed clear of the human body")
A = HA

# 6 onto the goblin
if RACE == "goblin":
    gob = load(f"{ASSETS}/goblin_simple/goblin_ours.glb")
    GA = next(o for o in gob if o.type == "ARMATURE")
    gskin = next(o for o in gob if o.type == "MESH" and any(m and m.name.startswith("G_MatUp") for m in o.data.materials))
    gdown = next(o for o in gob if o.type == "MESH" and any(m and m.name.startswith("G_MatDown") for m in o.data.materials))

    def spread(mesh_ob, arm):
        names = {g.index: g.name for g in mesh_ob.vertex_groups}; acc = {}
        toA = arm.matrix_world.inverted() @ mesh_ob.matrix_world
        for v in mesh_ob.data.vertices:
            if not v.groups:
                continue
            b = names[max(v.groups, key=lambda g: g.weight).group]
            if b not in arm.data.bones:
                continue
            p = arm.data.bones[b].matrix_local.inverted() @ (toA @ v.co)
            a = acc.setdefault(b, [0, 0, 0]); a[0] += abs(p.x); a[1] += abs(p.z); a[2] += 1
        return {b: (a[0] / a[2], a[1] / a[2]) for b, a in acc.items() if a[2] >= 8}
    hs, gs = spread(body, HA), spread(gskin, GA)

    def ratio(b):
        while b is not None:
            if b.name in hs and b.name in gs:
                return [max(0.6, min(2.0, gs[b.name][k] / hs[b.name][k])) for k in (0, 1)]
            b = b.parent
        return [1, 1]
    mats = {}
    for b in HA.data.bones:
        g = GA.data.bones.get(b.name)
        if g is None:
            continue
        rx, rz = ratio(b)
        ry = max(0.6, min(2.0, g.length / b.length)) if b.length > 1e-6 else 1
        mats[b.name] = g.matrix_local @ Matrix.Diagonal((rx, ry, rz, 1)) @ b.matrix_local.inverted()
    toGA = GA.matrix_world.inverted() @ HA.matrix_world
    for ob in pieces:
        gn = {g.index: g.name for g in ob.vertex_groups}
        for v in ob.data.vertices:
            acc, tw = Vector(), 0
            for g in v.groups:
                m = mats.get(gn[g.group])
                if m is not None:
                    acc += g.weight * (m @ v.co); tw += g.weight
            v.co = toGA.inverted() @ (acc / tw) if tw else v.co
        ob.matrix_world = HA.matrix_world.copy()
    # now in the goblin skeleton's space (the two skeletons stand at the same place in the world)
    GPX = 2.15 / 48
    gt = tree_of([gskin, gdown] + under_meshes(), GA.matrix_world.inverted())
    for ob in pieces:
        print(f"{ob.name}: {clear(ob, gt, GA, GAP_PX * GPX, rings=12)} pushed clear of the goblin")
    A = GA

# 6b nothing under the soles: character.py stands everything it loads on its lowest point, so a hem or a boot below
#    the body's feet would lift every other part off the ground (and the layers would no longer meet)
#    (the goblin: its body's lowest point, always drawn. The human: the ground, 0, since the base's own feet are masked in
#    its renders and the outfits' shoes reach 0.004 below it; --floor sets another height, in the skeleton's units)
soles = float(FLOOR) if FLOOR else 0.0 if RACE != "goblin" else min(
    (o.matrix_world @ v.co).z for o in gob if o.type == "MESH" for v in o.data.vertices)
for ob in pieces:
    low = 0
    for v in ob.data.vertices:
        w = ob.matrix_world @ v.co
        if w.z < soles:
            v.co = ob.matrix_world.inverted() @ Vector((w.x, w.y, soles)); low += 1
    if low:
        print(f"{ob.name}: {low} points raised to the soles")

# 7b --flat V: the texture left out, one plain colour (V grey) instead (a model made from a picture has that picture's
#    light and shadows baked into its texture, which our own sun would then shade again)
if FLAT:
    for ob in pieces:
        for m in ob.data.materials:
            bsdf = next((nd for nd in m.node_tree.nodes if nd.type == "BSDF_PRINCIPLED"), None) if m and m.use_nodes else None
            if bsdf:
                for lk in list(bsdf.inputs["Base Color"].links):
                    m.node_tree.links.remove(lk)
                bsdf.inputs["Base Color"].default_value = (float(FLAT),) * 3 + (1,)
    print(f"textures left out: plain grey {FLAT}")

# 7 lighter textures
if LIFT != 1.0:
    seen = set()
    for ob in pieces:
        for m in ob.data.materials:
            for nd in (m.node_tree.nodes if m and m.use_nodes else []):
                if nd.type == "TEX_IMAGE" and nd.image and nd.image.name not in seen and nd.image.colorspace_settings.name == "sRGB":
                    seen.add(nd.image.name)
                    im = nd.image; px = list(im.pixels)
                    for i in range(0, len(px), 4):
                        for k in range(3):
                            px[i + k] = min(1.0, px[i + k] ** (1 / LIFT))
                    im.pixels[:] = px; im.update(); im.pack()
                    print(f"lifted {im.name} by {LIFT}")

# onto the skeleton, and out
for ob in pieces:
    W = ob.matrix_world.copy(); ob.parent = A; ob.matrix_world = W
    mod = ob.modifiers.new("Armature", "ARMATURE"); mod.object = A
for o in [o for o in bpy.data.objects if o not in pieces and o is not A]:
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in pieces + [A]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {OUT}")
