# A solid piece (a pauldron, a buckle plate) from a model that came without a skeleton, hung on ONE bone of a race's
# skeleton like a held weapon: it is moved, turned and sized as one piece and follows that bone alone, never bent.
#   python3.11 scripts/art/fit_rigid.py --model <file.glb> --race goblin --bone upperarm_r --out <file.glb>
#        [--keep "x::-0.25;z:0.08:"] [--scale 1.1] [--at -0.40,0.105,1.56] [--turn 0,0,0] [--pivot x,y,z] [--shift x,y,z] [--trim <file>=<mesh>+<mesh>] [--merge 0.003]
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
KEEP, SCALE, AT, TURN = opt("--keep"), float(opt("--scale", "1")), opt("--at"), opt("--turn", "0,0,0")
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

# size, turn, place
ps = [v.co for v in ob.data.vertices]
lo, hi = Vector(map(min, *ps)), Vector(map(max, *ps)); mid = (lo + hi) / 2
at = Vector([float(x) for x in AT.split(",")]) if AT else ARM.matrix_world @ ARM.data.bones[BONE].head_local
R = Euler([math.radians(float(x)) for x in TURN.split(",")]).to_matrix().to_4x4()
PIVOT = opt("--pivot")
if PIVOT:
    pv = Vector([float(x) for x in PIVOT.split(",")])
    ob.data.transform(Matrix.Translation(pv) @ R @ Matrix.Translation(-pv) @ Matrix.Translation(at) @ Matrix.Scale(SCALE, 4) @ Matrix.Translation(-mid))
else:
    ob.data.transform(Matrix.Translation(at) @ R @ Matrix.Scale(SCALE, 4) @ Matrix.Translation(-mid))
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

pieces = [ob]
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
    g = p.vertex_groups.new(name=BONE); g.add(range(len(p.data.vertices)), 1.0, "REPLACE")
    W = p.matrix_world.copy(); p.parent = ARM; p.matrix_world = W
    mod = p.modifiers.new("Armature", "ARMATURE"); mod.object = ARM
for o in [o for o in bpy.data.objects if o not in pieces and o is not ARM]:
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in pieces + [ARM]:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {OUT}: {', '.join(p.name for p in pieces)} on {BONE}")
