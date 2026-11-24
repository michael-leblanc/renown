# A solid piece (a pauldron, a buckle plate) from a model that came without a skeleton, hung on ONE bone of a race's
# skeleton like a held weapon: it is moved, turned and sized as one piece and follows that bone alone, never bent.
#   python3.11 scripts/art/fit_rigid.py --model <file.glb> --race goblin --bone upperarm_r --out <file.glb>
#        [--keep "x::-0.25;z:0.08:"] [--scale 1.1 | --scale x,y,z] [--at -0.40,0.105,1.56] [--turn 0,0,0] [--pivot x,y,z] [--shift x,y,z] [--from x,y,z] [--trim <file>=<mesh>+<mesh>] [--clear G [--clear-bend R]] [--merge 0.003]
#        [--flat 0.45] [--strap 0.45,0.025,0.012,0.006] [--name Pauldron] [--mat TP] [--assets <models folder>]
#   --keep: only the model's loose bits whose middle is inside these bounds (x, y, z in the model's own units, as Blender
#     imports it: z up; "a:b", either end may be left out): to take one piece out of a bigger model (one pauldron of a
#     chest piece). Prints how many bits it kept.
#   --scale: model units to skeleton units. --at: where the kept piece's middle (its bounding box's) goes, in the
#     skeleton's own units at rest (a T). --turn: degrees about x, y, z, about its middle, before it is placed; with
#     --pivot, about that point after it is placed (a piece made for arms hanging down, placed so, then turned up with
#     the arm into our T about the shoulder joint: --pivot at the bone's head, --turn 0,72,0 for the right arm).
#   --merge: points nearer than this (model units) joined, then every face shaded smooth (a generated model comes in
#     hundreds of loose triangles, whose facets made dark specks at 1x). --flat: the texture left out, one plain grey
#     instead (a generated texture's fine detail turns into scattered pixels once snapped to a ramp).
#   --strap F,W,T,G: a leather band made here round the bone, F of the way from its head to its tail, W wide, T thick,
#     G off the skin (skeleton units): what holds the piece on. Its own material, <mat>_Leather.
#   Materials: <mat>_Metal (the piece), <mat>_Leather (the strap): the wardrobe gives each its ramps.
# The skeleton is the race's body file in --assets (human: quaternius_base/Superhero_Male_FullBody.gltf; goblin:
# goblin_simple/goblin_ours.glb); the output holds the piece, the strap and that skeleton, weighted 1 to --bone.
import math
import sys

import bpy  # first: bmesh and mathutils come with it
import bmesh
from mathutils import Euler, Matrix, Vector

A_ = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]


def opt(name, default=None):
    return A_[A_.index(name) + 1] if name in A_ else default


MODEL, RACE, BONE, OUT = opt("--model"), opt("--race", "goblin"), opt("--bone"), opt("--out")
if not (MODEL and BONE and OUT):
    raise SystemExit(__doc__ if __doc__ else "python3.11 scripts/art/fit_rigid.py --model <file> --race goblin --bone upperarm_r --out <file>")
ASSETS = opt("--assets", "/mnt/project-files/characters/models")
KEEP, AT, TURN = opt("--keep"), opt("--at"), opt("--turn", "0,0,0")
SCALE = [float(x) for x in opt("--scale", "1").split(",")] * 3   # one size, or x,y,z (wider, deeper: over a belly)
MERGE, FLAT, STRAP = float(opt("--merge", "0")), opt("--flat"), opt("--strap")
NAME, MAT = opt("--name", "Rigid"), opt("--mat", "TR")
BODY = {"human": "quaternius_base/Superhero_Male_FullBody.gltf", "goblin": "goblin_simple/goblin_ours.glb"}[RACE]

bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


body = load(f"{ASSETS}/{BODY}")
ARM = next(o for o in body if o.type == "ARMATURE")
skin = [o for o in body if o.type == "MESH" and len(o.data.vertices) > 100]
model = [o for o in load(MODEL) if o.type == "MESH"]

# one mesh, in its own units as imported
bpy.ops.object.select_all(action="DESELECT")
for o in model:
    o.select_set(True)
bpy.context.view_layer.objects.active = model[0]
if len(model) > 1:
    bpy.ops.object.join()
ob = model[0]
ob.data.transform(ob.matrix_world); ob.matrix_world = Matrix.Identity(4); ob.parent = None
ob.name = NAME

# --keep: the loose bits whose middle is inside the bounds
bm = bmesh.new(); bm.from_mesh(ob.data)
if KEEP:
    lim = {}
    for c in KEEP.split(";"):
        ax, a, b = c.split(":")
        lim["xyz".index(ax)] = (float(a) if a else -1e9, float(b) if b else 1e9)
    seen, kill, kept, bits = set(), [], 0, 0
    for v0 in bm.verts:
        if v0 in seen:
            continue
        st, grp = [v0], []
        while st:
            v = st.pop()
            if v in seen:
                continue
            seen.add(v); grp.append(v); st += [e.other_vert(v) for e in v.link_edges]
        mid = sum((v.co for v in grp), Vector()) / len(grp); bits += 1
        if all(lo <= mid[k] <= hi for k, (lo, hi) in lim.items()):
            kept += 1
        else:
            kill += grp
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    print(f"kept {kept} of {bits} loose bits ({len(bm.verts)} points)")
if MERGE:
    n0 = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=MERGE)
    print(f"merged {n0 - len(bm.verts)} points within {MERGE}")
SPIKE_ = (opt("--spike") or "1").split(",")   # "F[,x,y,z]": the piece's most pointed bump (its spike) made F times as
SPIKE = float(SPIKE_[0])                        # long; toward x,y,z (model units' axes) if given, else its own way
if SPIKE != 1:
    from mathutils.kdtree import KDTree
    bm.verts.ensure_lookup_table(); bm.normal_update()
    kd = KDTree(len(bm.verts))
    for i, v in enumerate(bm.verts):
        kd.insert(v.co, i)
    kd.balance()
    span = max((max(v.co[k] for v in bm.verts) - min(v.co[k] for v in bm.verts)) for k in range(3)); rr = span / 8
    def prominence(v):   # how far it stands out of the mean of the points round it
        near = kd.find_range(v.co, rr)
        mean = sum((c for c, i, d in near), Vector()) / len(near)
        return (v.co - mean).length if (v.co - mean).dot(v.normal) > 0 else 0
    tip = max(bm.verts, key=prominence)
    d = span / 8; region = [v for v in bm.verts if (v.co - tip.co).length < d]
    rim = [v for v in region if (v.co - tip.co).length > 0.75 * d] or region
    base = sum((v.co for v in rim), Vector()) / len(rim); axis = (tip.co - base).normalized()
    to = Vector([float(x) for x in SPIKE_[1:4]]).normalized() if len(SPIKE_) == 4 else axis
    t0, was, turn = tip.co.copy(), {v: v.co.copy() for v in region}, axis.rotation_difference(to).to_matrix()
    for v, co in was.items():   # scaled up as a whole (long and thick), less toward the rim it grows from
        w = (1 - (co - t0).length / d) ** 0.5 if (co - base).dot(axis) > 0 else 0   # what lies under its foot stays
        v.co = co.lerp(base + turn @ ((co - base) * SPIKE), w)
    print(f"spike: tip at {tuple(round(c, 3) for c in t0)}, {(t0 - base).length:.3f} long, {len(region)} points; now {(tip.co - base).length:.3f}")
loose = []
seen = set()
for v0 in bm.verts:
    if v0 not in seen:
        st, n = [v0], 0
        while st:
            v = st.pop()
            if v in seen:
                continue
            seen.add(v); n += 1; st += [e.other_vert(v) for e in v.link_edges]
        loose.append(n)
print(f"now {len(bm.faces)} faces in {len(loose)} loose bits (largest {max(loose)} points), "
      f"{sum(1 for e in bm.edges if not e.is_manifold)} open or shared edges")
bm.to_mesh(ob.data); bm.free()
for p in ob.data.polygons:
    p.use_smooth = True
SHARP = opt("--sharp")   # degrees: edges sharper than this stay sharp (the plates' shapes); the rest shaded smooth
if SHARP:
    ob.data.set_sharp_from_angle(angle=math.radians(float(SHARP)))

# size, turn, place
ps = [v.co for v in ob.data.vertices]
lo, hi = Vector(map(min, *ps)), Vector(map(max, *ps)); mid = (lo + hi) / 2
if opt("--from"):   # the model's point that --at names (several pieces of one model placed alike: its own middle, 0,0,0)
    mid = Vector([float(x) for x in opt("--from").split(",")])
at = Vector([float(x) for x in AT.split(",")]) if AT else ARM.matrix_world @ ARM.data.bones[BONE].head_local
R = Euler([math.radians(float(x)) for x in TURN.split(",")]).to_matrix().to_4x4()
PIVOT = opt("--pivot")
if PIVOT:
    pv = Vector([float(x) for x in PIVOT.split(",")])
    ob.data.transform(Matrix.Translation(pv) @ R @ Matrix.Translation(-pv) @ Matrix.Translation(at) @ Matrix.Diagonal((*SCALE[:3], 1)) @ Matrix.Translation(-mid))
else:
    ob.data.transform(Matrix.Translation(at) @ R @ Matrix.Diagonal((*SCALE[:3], 1)) @ Matrix.Translation(-mid))
SHIFT = opt("--shift")   # moved this much after it is placed and turned (skeleton units): off the arm, say
if SHIFT:
    ob.data.transform(Matrix.Translation(Vector([float(x) for x in SHIFT.split(",")])))
ps = [v.co for v in ob.data.vertices]; lo, hi = Vector(map(min, *ps)), Vector(map(max, *ps))
print(f"placed: {tuple(round(c, 3) for c in lo)} to {tuple(round(c, 3) for c in hi)} ({tuple(round(c, 3) for c in hi - lo)} across)")


TRIM = opt("--trim")   # "<file>=<mesh>+<mesh>" (in --assets): what it is worn over; its faces inside those are cut away
if TRIM:
    from mathutils.bvhtree import BVHTree
    f, names = TRIM.split("=")
    under = [o for o in load(f"{ASSETS}/{f}") if o.type == "MESH" and o.name.split(".")[0] in names.split("+")] + skin
    for u in under:
        u.data.transform(u.matrix_world); u.matrix_world = Matrix.Identity(4)
    trees = [BVHTree.FromPolygons([v.co for v in u.data.vertices], [q.vertices[:] for q in u.data.polygons]) for u in under]
    CLEAR = opt("--clear")   # G: every point pushed G (skeleton units) out of what it is worn over, the push spread smoothly
    if CLEAR:
        g = float(CLEAR); reach = float(opt("--clear-reach", "0.1")); bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
        BEND = float(opt("--clear-bend", "0"))   # R: the push spread over everything within R, loose plates or not, so they bend
        def needs():                               # together as one sheet instead of tearing apart (0: along the mesh's edges)
            push = {}
            for v in bm.verts:
                for t in trees:   # out of each layer (skin, then what is over it): the biggest push wins
                    hit = t.find_nearest(v.co)
                    if hit[0] is not None and hit[3] < reach and (v.co - hit[0]).dot(hit[1]) < g:   # near it: past a hem is not inside
                        d = hit[0] + hit[1] * g - v.co
                        if v.index not in push or d.length > push[v.index].length:
                            push[v.index] = d
            return push
        push = needs(); moved = len(push)
        if BEND:
            from mathutils.kdtree import KDTree
            for _ in range(4):   # a few rounds: what one round's smoothing left short is pushed again
                if not push:
                    break
                kd = KDTree(len(push)); keys = list(push)
                for k, i in enumerate(keys):
                    kd.insert(bm.verts[i].co, k)
                kd.balance(); field = {}
                for v in bm.verts:
                    near = kd.find_range(v.co, BEND)
                    if near:
                        ws = [(1 - d / BEND) ** 2 for _, _, d in near]; dn = min(d for _, _, d in near)
                        field[v.index] = sum((push[keys[k]] * w for (_, k, _), w in zip(near, ws)), Vector()) / sum(ws) * (1 - dn / BEND) ** 0.5
                for i, d in field.items():
                    bm.verts[i].co += d
                push = needs()
            push = field
        else:
            for _ in range(int(opt("--clear-spread", "6"))):   # spread to the neighbours: a dent becomes a smooth bulge
                nxt = dict(push)
                for v in bm.verts:
                    ds = [push[e.other_vert(v).index] for e in v.link_edges if e.other_vert(v).index in push]
                    if ds:
                        m = sum(ds, Vector()) / len(ds); own = push.get(v.index)
                        nxt[v.index] = own if own is not None and own.length >= m.length else (own + m) / 2 if own is not None else m * 0.7
                push = nxt
            for i, d in push.items():
                bm.verts[i].co += d
        bm.to_mesh(ob.data); bm.free()
        print(f"pushed {moved} points {g} clear of what it is worn over ({len(push)} moved in all)")
    bm = bmesh.new(); bm.from_mesh(ob.data)
    def inside(p):
        for t in trees:
            hit = t.find_nearest(p)
            if hit[0] is not None and (p - hit[0]).dot(hit[1]) < 0 and hit[3] < 0.05:
                return True
        return False
    cut = [fc for fc in bm.faces if inside(fc.calc_center_median())]
    bmesh.ops.delete(bm, geom=cut, context="FACES"); bm.to_mesh(ob.data); bm.free()
    print(f"cut away {len(cut)} faces inside what it is worn over")


def material(name, grey):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = next(nd for nd in m.node_tree.nodes if nd.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*grey, 1); bsdf.inputs["Roughness"].default_value = 0.6
    return m


if FLAT:
    ob.data.materials.clear(); ob.data.materials.append(material(f"{MAT}_Metal", (float(FLAT),) * 3))
    print(f"texture left out: plain grey {FLAT}")
else:
    for m in ob.data.materials:
        m.name = f"{MAT}_Metal"

DETAIL = opt("--detail")   # "seam=25;edge=35[;shine=1]": faces along a crease sharper than that, inward (seam: darker) or outward
if DETAIL:                 # and facing up (edge: lighter), each their own material, so a plate's shape shows at 1x
    lim = {k: math.radians(float(v)) for k, v in (x.split("=") for x in DETAIL.split(";"))}
    g0 = float(FLAT or 0.4)   # seams a quarter as light as the plate, top edges twice
    EDGE = "Shine" if "shine" in lim else "Edge"   # shine=1: the top edges named <mat>_Shine, which take the ramp's palest tone
    ob.data.materials.append(material(f"{MAT}_Seam", (g0 / 4,) * 3)); ob.data.materials.append(material(f"{MAT}_{EDGE}", (min(1, g0 * 2),) * 3))
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.normal_update(); n_seam = n_edge = 0
    for e in bm.edges:
        if len(e.link_faces) != 2:
            if "edge" in lim and len(e.link_faces) == 1 and e.link_faces[0].normal.z > 0.3:
                e.link_faces[0].material_index = 2; n_edge += 1
            continue
        f1, f2 = e.link_faces; ang = f1.normal.angle(f2.normal, 0)
        inward = (f2.calc_center_median() - f1.calc_center_median()).dot(f1.normal) > 0
        if inward and "seam" in lim and ang > lim["seam"]:
            for fc in (f1, f2):
                fc.material_index = 1
            n_seam += 1
        elif not inward and "edge" in lim and ang > lim["edge"]:
            for fc in (f1, f2):
                if fc.normal.z > 0.3 and fc.material_index != 1:
                    fc.material_index = 2
            n_edge += 1
    bm.to_mesh(ob.data); bm.free()
    print(f"detail: {n_seam} seam creases (darker), {n_edge} top edges (lighter)")

pieces, bones = [ob], {}
RIVETS = opt("--rivets")   # "N,R[,F,C,Z]": N rivets of radius R (skeleton units) on its highest, most upward-facing places
if RIVETS:
    rv_ = RIVETS.split(","); n, r = int(rv_[0]), float(rv_[1])   # "N,R[,F,C]": on faces turned at least F (0.6) to the camera,
    face, clear = (float(rv_[2]) if len(rv_) > 2 else 0.6), (float(rv_[3]) if len(rv_) > 3 else 5)   # C radii clear of the skin (5),
    below = float(rv_[4]) if len(rv_) > 4 else 1e9                                                     # and below height Z (under another piece's edge)
    from mathutils.bvhtree import BVHTree   # on the faces the camera sees best (from the front, above), clear of the body
    sk = BVHTree.FromPolygons([o.matrix_world @ v.co for o in skin for v in o.data.vertices],
                              [[i + sum(len(oo.data.vertices) for oo in skin[:k]) for i in q.vertices] for k, o in enumerate(skin) for q in o.data.polygons])
    view = Vector((0, -0.5, 0.866))
    top = sorted(ob.data.polygons, key=lambda q: -q.normal.dot(view))
    spots = []
    for q in top:
        c = q.center
        hit = sk.find_nearest(c)
        if q.normal.dot(view) > face and c.z < below and (hit[0] is None or hit[3] > clear * r) and all((c - o).length > 6 * r for o, _ in spots):
            spots.append((c, q.normal.copy()))
        if len(spots) == n:
            break
    rm = bmesh.new()
    for c, nrm in spots:
        bmesh.ops.create_icosphere(rm, subdivisions=1, radius=r, matrix=Matrix.Translation(c + nrm * r * 0.5))
    me = bpy.data.meshes.new(f"{NAME}_Rivets"); rm.to_mesh(me); rm.free()
    rv = bpy.data.objects.new(f"{NAME}_Rivets", me); bpy.context.scene.collection.objects.link(rv)
    me.materials.append(material(f"{MAT}_Rivet", (0.95, 0.95, 0.95))); pieces.append(rv)
    print(f"rivets: {len(spots)} of radius {r}")
CHEST = opt("--chest-strap")   # "x1,z1,x2,z2,W,T,G,bone": a leather band round the chest, in the slanted plane through
if CHEST:                      # (x1, z1) and (x2, z2) and the front-back line, laid G off the outermost of the body and
    from mathutils.bvhtree import BVHTree   # what --trim names, W wide, T thick, following that bone
    x1, z1, x2, z2, w, t, gap = (float(x) for x in CHEST.split(",")[:7]); cb = CHEST.split(",")[7]
    outer = skin + (under if TRIM else [])
    tree = BVHTree.FromPolygons([o.matrix_world @ v.co for o in outer for v in o.data.vertices],
                                [[i + sum(len(oo.data.vertices) for oo in outer[:k]) for i in q.vertices] for k, o in enumerate(outer) for q in o.data.polygons])
    yc = (ARM.matrix_world @ ARM.data.bones[cb].head_local).y
    c = Vector(((x1 + x2) / 2, yc, (z1 + z2) / 2)); u = Vector((x2 - x1, 0, z2 - z1)).normalized(); v = Vector((0, 1, 0)); nrm = u.cross(v)
    reach = (Vector((x2, 0, z2)) - Vector((x1, 0, z1))).length / 2 + 0.06
    N = 96; ring = []
    for i in range(N):
        a = 2 * math.pi * i / N; dr = u * math.cos(a) + v * math.sin(a)
        far = reach if abs(math.cos(a)) > 0.7 else 0.6
        hit = tree.ray_cast(c + dr * far, -dr, far)
        ring.append((hit[0] if hit[0] is not None else c + dr * 0.15) + dr * gap)
    cm = bmesh.new(); rows = []
    for off, out in [(-w / 2, 0), (w / 2, 0), (w / 2, t), (-w / 2, t)]:
        rows.append([cm.verts.new(p + nrm * off + (p - c).normalized() * out) for p in ring])
    for k in range(4):
        a_, b_ = rows[k], rows[(k + 1) % 4]
        for i in range(N):
            cm.faces.new((a_[i], a_[(i + 1) % N], b_[(i + 1) % N], b_[i]))
    bmesh.ops.recalc_face_normals(cm, faces=cm.faces)
    me = bpy.data.meshes.new(f"{NAME}_ChestStrap"); cm.to_mesh(me); cm.free()
    cs = bpy.data.objects.new(f"{NAME}_ChestStrap", me); bpy.context.scene.collection.objects.link(cs)
    me.materials.append(bpy.data.materials.get(f"{MAT}_Leather") or material(f"{MAT}_Leather", (0.22, 0.13, 0.07)))
    pieces.append(cs); bones[cs.name] = cb
    print(f"chest strap: from ({x1}, {z1}) to ({x2}, {z2}), round the body, following {cb}")
if STRAP:   # a leather band round the bone, laid on the skin
    f, w, t, gap = (float(x) for x in STRAP.split(","))
    b = ARM.data.bones[BONE]; h, tl = ARM.matrix_world @ b.head_local, ARM.matrix_world @ b.tail_local
    c = h + (tl - h) * f; axis = (tl - h).normalized()
    def follows(s, v):   # the skin's points that this bone moves most
        gs = {g.index: g.name for g in s.vertex_groups}
        return bool(v.groups) and gs.get(max(v.groups, key=lambda g: g.weight).group) == BONE
    near = [s.matrix_world @ v.co for s in skin for v in s.data.vertices if follows(s, v)]
    near = [p for p in near if abs((p - c).dot(axis)) < w]
    if near:
        c = sum(near, Vector()) / len(near); c = h + axis * (c - h).dot(axis) + ((c - h) - axis * (c - h).dot(axis))
    r = max(((p - c) - axis * (p - c).dot(axis)).length for p in near) + gap if near else 0.08
    sm = bmesh.new(); N = 20
    u = axis.orthogonal().normalized(); v2 = axis.cross(u)
    rings = []
    for k, (rad, off) in enumerate([(r, -w / 2), (r, w / 2), (r + t, w / 2), (r + t, -w / 2)]):
        rings.append([sm.verts.new(c + axis * off + (u * math.cos(2 * math.pi * i / N) + v2 * math.sin(2 * math.pi * i / N)) * rad) for i in range(N)])
    for k in range(4):
        a_, b_ = rings[k], rings[(k + 1) % 4]
        for i in range(N):
            sm.faces.new((a_[i], a_[(i + 1) % N], b_[(i + 1) % N], b_[i]))
    bmesh.ops.recalc_face_normals(sm, faces=sm.faces)
    me = bpy.data.meshes.new(f"{NAME}_Strap"); sm.to_mesh(me); sm.free()
    st = bpy.data.objects.new(f"{NAME}_Strap", me); bpy.context.scene.collection.objects.link(st)
    me.materials.append(material(f"{MAT}_Leather", (0.22, 0.13, 0.07)))
    pieces.append(st)
    print(f"strap: round {BONE} at {f:.2f} of its length, {r:.3f} from its middle, {w} wide")

# weighted 1 to the one bone: it follows it as a held thing does, never bent
for p in pieces:
    g = p.vertex_groups.new(name=bones.get(p.name, BONE)); g.add(range(len(p.data.vertices)), 1.0, "REPLACE")
    W = p.matrix_world.copy(); p.parent = ARM; p.matrix_world = W
    mod = p.modifiers.new("Armature", "ARMATURE"); mod.object = ARM
for o in [o for o in bpy.data.objects if o not in pieces and o is not ARM]:
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in pieces + [ARM]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {OUT}: {', '.join(p.name + ' on ' + bones.get(p.name, BONE) for p in pieces)}")
