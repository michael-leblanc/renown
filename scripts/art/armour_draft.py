# Heavier armour, drafted in code over a race's own skin (Michael, 2026-11-22: "Can try some heavier armor"). Our bought
# outfits (the free part of Quaternius' Modular Character Outfits) hold only the Peasant and the Ranger: no mail, no plate.
# So each piece is made as the goblin's shirt is (goblin_clothes.py): a copy of some of the skin's faces, pushed out along
# the skin's normals, keeping the skin's bone weights (so it moves with the body in every animation), cut clean by planes,
# and pushed clear of what the race wears under it (the human's Peasant tunic and trousers; the goblin's shorts).
#   python3.11 scripts/art/armour_draft.py --race goblin|human [--assets <models folder>] <out.glb>
#     Armour_Mail       (G_Mail, iron)       a mail shirt: chest, back and upper arms, to the hips (the human's to mid-thigh);
#                                            made finer and roughened point by point, so its tones change pixel to pixel
#     Armour_Plate      (G_Plate, G_PlateEdge, iron; G_Strap, hide)  a breastplate and backplate over it, smooth, a lighter
#                                            rolled edge, a leather belt at its foot
#     Armour_Pauldrons  (G_Plate, G_PlateEdge)  a plate over each shoulder, wider than the shoulder
#     Armour_Vambraces  (G_Plate, G_PlateEdge)  a plate round each forearm, elbow to wrist
# Writes one .glb with a copy of the skeleton and the four pieces; the wardrobe picks which meshes a part is.
import os
import sys

import bpy
import bmesh  # noqa: E402 (after bpy: the module brings it)
from mathutils import Vector, noise
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from character import load  # noqa: E402

args = sys.argv[1:]
def opt(name, default=None):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
RACE = opt("--race", "goblin")
ASSETS = opt("--assets", "/mnt/project-files/characters/models")
out = args[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
if RACE == "goblin":
    added = load(f"{ASSETS}/goblin_simple/goblin_ours.glb")
    skin = next(o for o in added if o.type == "MESH" and any(m and m.name.startswith("G_MatUp") for m in o.data.materials))
    under = [o for o in added if o.type == "MESH" and o is not skin and any(m and m.name.startswith("G_MatDown") for m in o.data.materials)]
    PX = 2.15 / 48                                        # one pixel, in the model's units
    WAIST = 1.1                                           # the shorts' belt
    HEM = WAIST - 0.02                                    # the mail ends just over it
else:
    added = load(f"{ASSETS}/quaternius_base/Superhero_Male_FullBody.gltf")
    skin = next(o for o in added if o.type == "MESH" and o.name.startswith("SuperHero_Male"))
    worn = load(f"{ASSETS}/quaternius_outfits/peasant/Male_Peasant.gltf")
    under = [o for o in worn if o.type == "MESH" and o.name.startswith(("Male_Peasant_Body", "Male_Peasant_Arms", "Male_Peasant_Legs"))]
    added += worn
    PX = 1.81 / 96
    WAIST = 1.06                                          # the tunic's belt
    HEM = 0.78                                            # the mail's skirt ends at mid-thigh
arm = next(o for o in added if o.type == "ARMATURE" and skin.parent == o)
bones = arm.data.bones
names = {g.index: g.name for g in skin.vertex_groups}
TO_ARM = arm.matrix_world.inverted() @ skin.matrix_world
BACK = TO_ARM.inverted()
TORSO = {"spine_01", "spine_02", "spine_03", "pelvis", "clavicle_l", "clavicle_r"}
SPINE = {"spine_01", "spine_02", "spine_03"}
LEGS = {"thigh_l", "thigh_r"} if RACE == "human" else set()

BASE = {"G_Mail": (0.1, 0.1, 0.095), "G_Plate": (0.4, 0.4, 0.38), "G_PlateEdge": (0.75, 0.75, 0.7), "G_Strap": (0.04, 0.022, 0.012)}
METAL = {"G_Mail": (0.6, 0.55), "G_Plate": (0.7, 0.35), "G_PlateEdge": (0.7, 0.35), "G_Strap": (0.0, 0.9)}


def top(v):
    return names[max(v.groups, key=lambda g: g.weight).group] if v.groups else ""


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*BASE[name], 1)
    p.inputs["Metallic"].default_value, p.inputs["Roughness"].default_value = METAL[name]
    return m


def tree_of(objs):
    vs, fs = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        me = o.evaluated_get(dg).to_mesh(); k = len(vs); W = o.matrix_world
        vs += [W @ v.co for v in me.vertices]; fs += [[k + i for i in p.vertices] for p in me.polygons]
    return BVHTree.FromPolygons(vs, fs)


def piece(name, mat, keep, out, cuts=(), gone=None, cuts_after=()):
    """A copy of the skin's faces that keep(vertex) takes (a face goes with most of its points), every point pushed `out`
    along the skin's own normal; cut by planes (point, normal in the skeleton's space: what lies on the normal's side goes);
    gone(face middle) takes faces out."""
    ob = skin.copy(); ob.data = skin.data.copy(); ob.name = ob.data.name = name
    bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    me = skin.data
    for v in bm.verts:
        v.co += me.vertices[v.index].normal * out
    drop = [f for f in bm.faces if 2 * sum(bool(keep(me.vertices[v.index])) for v in f.verts) < len(f.verts)]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    for p, n in cuts:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=BACK @ p,
                               plane_no=(BACK.to_3x3() @ n).normalized(), clear_outer=True)
    if gone:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if gone(TO_ARM @ f.calc_center_median())], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(ob.data); bm.free()
    ob.data.materials.clear(); ob.data.materials.append(material(mat))
    return ob


def finer(ob, cuts):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()


def clear(ob, objs, margin, rings=10, fall=0.85):
    """Every point at least margin out of objs: the push each point needs, spread to its neighbours (falling off by `fall`
    a ring, so it bulges smoothly), made away from the line of the bone that moves it most."""
    tree = tree_of(objs); W = ob.matrix_world; Wi3 = W.inverted().to_3x3()
    need = {}
    for v in ob.data.vertices:
        p = W @ v.co; q, n, fi, d = tree.find_nearest(p)
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
    for v in ob.data.vertices:
        if need[v.index] <= 0 or not v.groups:
            continue
        b = bones.get(gn[max(v.groups, key=lambda g: g.weight).group])
        if b is None:
            continue
        p = TO_ARM @ v.co; h, t = b.head_local, b.tail_local
        k = max(0, min(1, (p - h).dot(t - h) / max((t - h).length_squared, 1e-9)))
        d = p - (h + (t - h) * k)
        if d.length > 1e-6:
            v.co += Wi3 @ ((arm.matrix_world.to_3x3() @ d.normalized()).normalized() * need[v.index])
    ob.data.update()


def rim(ob, edge, width):
    """The faces within `width` of the piece's open edges take material `edge`."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    pts = [TO_ARM @ v.co for v in bm.verts if v.is_boundary]; bm.free()
    kd = KDTree(len(pts))
    for i, p in enumerate(pts):
        kd.insert(p, i)
    kd.balance()
    ob.data.materials.append(material(edge)); k = len(ob.data.materials) - 1
    for f in ob.data.polygons:
        if kd.find(TO_ARM @ f.center)[2] < width:
            f.material_index = k


def join(objs, name):
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs):
        bpy.ops.object.join()
    objs[0].name = objs[0].data.name = name
    return objs[0]


def head(b):
    return bones[b].head_local


# 1. the mail shirt: chest, back, upper arms to just above the elbow, down to the hem (the human's over his hips and thighs)
def mail_keeps(v):
    b = top(v)
    return b in TORSO or b.startswith("upperarm_") or b in LEGS
elbow = [(head(f"upperarm_{s}") + (head(f"lowerarm_{s}") - head(f"upperarm_{s}")) * 0.85, (head(f"lowerarm_{s}") - head(f"upperarm_{s}")).normalized()) for s in "lr"]
mail = piece("Armour_Mail", "G_Mail", mail_keeps, 0.6 * PX, cuts=[*elbow, (Vector((0, 0, HEM)), Vector((0, 0, -1)))])
clear(mail, under, 0.6 * PX)
finer(mail, 2)
for v in mail.data.vertices:                              # the rings: a fine bumpy surface, about a pixel across
    p = TO_ARM @ v.co
    v.co += v.normal * 0.25 * PX * noise.noise(p * (1.2 / PX))
mail.data.update()
print(f"Armour_Mail: {len(mail.data.vertices)} points")

# 2. the breastplate and backplate: the spine's faces, from under the collarbones to the waist, over the mail
TOPZ = head("spine_03").z + 0.55 * (bones["spine_03"].tail_local.z - head("spine_03").z)
plate = piece("Armour_Plate", "G_Plate", lambda v: top(v) in SPINE, 1.6 * PX,
              cuts=[(Vector((0, 0, TOPZ)), Vector((0, 0, 1))), (Vector((0, 0, WAIST)), Vector((0, 0, -1)))])
clear(plate, [mail, *under], 0.8 * PX, rings=20, fall=0.95)
rim(plate, "G_PlateEdge", 0.8 * PX)
strap = piece("Armour_Strap", "G_Strap", lambda v: top(v) in TORSO, 1.6 * PX,
              cuts=[(Vector((0, 0, WAIST + 0.9 * PX)), Vector((0, 0, 1))), (Vector((0, 0, WAIST - 0.4 * PX)), Vector((0, 0, -1)))])
clear(strap, [plate, mail, *under], 0.6 * PX, rings=20, fall=0.97)
plate = join([plate, strap], "Armour_Plate")
print(f"Armour_Plate: {len(plate.data.vertices)} points")

# 3. the pauldrons: the skin round each shoulder joint, swollen out from it, over the mail and the plate's top
pl = []
for s in "lr":
    c, e = head(f"upperarm_{s}"), head(f"lowerarm_{s}")
    r = 0.36 * (e - c).length + 2.4 * PX                    # the skin round the joint, as far out as the plate lies
    ob = piece(f"Pauldron_{s}", "G_Plate", lambda v: top(v) in TORSO | {f"upperarm_{s}"}, 2.4 * PX,
               gone=lambda m, c=c, r=r: (m - c).length > r or m.z < c.z - 0.15 * r)
    for v in ob.data.vertices:
        p = TO_ARM @ v.co
        v.co = BACK @ (c + (p - c) * 1.12)
    clear(ob, [mail, plate, *under], 0.8 * PX, rings=20, fall=0.95)
    rim(ob, "G_PlateEdge", 0.8 * PX)
    pl.append(ob)
pauldrons = join(pl, "Armour_Pauldrons")
print(f"Armour_Pauldrons: {len(pauldrons.data.vertices)} points")

# 4. the vambraces: each forearm from a little under the elbow to a little above the wrist
vb = []
for s in "lr":
    e, w = head(f"lowerarm_{s}"), head(f"hand_{s}")
    way = (w - e).normalized()
    ob = piece(f"Vambrace_{s}", "G_Plate", lambda v, s=s: top(v) == f"lowerarm_{s}", 1.4 * PX,
               cuts=[(e + (w - e) * 0.2, -way), (e + (w - e) * 0.9, way)])
    clear(ob, under, 0.8 * PX)
    rim(ob, "G_PlateEdge", 0.7 * PX)
    vb.append(ob)
vambraces = join(vb, "Armour_Vambraces")
print(f"Armour_Vambraces: {len(vambraces.data.vertices)} points")

for o in [o for o in added if o.type == "MESH"]:
    bpy.data.objects.remove(o)
for o in [o for o in bpy.data.objects if o.type == "ARMATURE" and o is not arm]:
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in (arm, mail, plate, pauldrons, vambraces):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {out}")
