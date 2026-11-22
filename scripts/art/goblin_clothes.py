# The goblin's shirt and waistcoat, made over its own body (Michael, 2026-11-22: "Make shirt and waistcoat here"; the
# spec's clothing set is "shirt with rolled sleeves, waistcoat, trousers"; trousers later: the model has no legs under its
# shorts). The body is not changed: each piece is a copy of some of the skin's faces, pushed out along the skin's normals,
# keeping the skin's bone weights, so it moves with the body in every animation.
#   python3.11 scripts/art/goblin_clothes.py [<goblin_ours.glb> [<out.glb>]]
#     shirt     ("Goblin_Shirt", material G_Shirt): the chest, back, shoulders and upper arms, the sleeves rolled up to
#               SLEEVE of the way down the forearm with a thicker cuff; the neck and the hips under the shorts left out.
#     waistcoat ("Goblin_Waistcoat", material G_Vest): the chest and back without the arms, open down the front, over the shirt.
# Writes one .glb with a copy of the skeleton and the two pieces (the race's render.models loads it after the body).
import math
import os
import sys

import bpy
import bmesh  # noqa: E402 (after bpy: the module brings it)
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from character import load  # noqa: E402

A = "/mnt/project-files/characters/models/goblin_simple"
src = sys.argv[1] if len(sys.argv) > 1 else f"{A}/goblin_ours.glb"
out = sys.argv[2] if len(sys.argv) > 2 else f"{A}/goblin_clothes.glb"
SHIRT_OUT, VEST_OUT, CUFF = 0.022, 0.05, 0.022     # how far each lies out from the skin, in the model's units (it stands 2.15)
SLEEVE = 0.4                                       # the rolled sleeve ends this far down the forearm, elbow 0, wrist 1
WAIST = 1.1                                        # the waistcoat ends here, at the shorts' belt
OPEN = 0.07                                        # the waistcoat's front opening: half its width at the chest

bpy.ops.wm.read_factory_settings(use_empty=True)
added = load(src)
arm = next(o for o in added if o.type == "ARMATURE")
skin = next(o for o in added if o.type == "MESH" and any(m and m.name.startswith("G_MatUp") for m in o.data.materials))
bones = arm.data.bones
names = {g.index: g.name for g in skin.vertex_groups}
TORSO = {"spine_01", "spine_02", "spine_03", "pelvis", "clavicle_l", "clavicle_r"}
TO_ARM = arm.matrix_world.inverted() @ skin.matrix_world           # the skin's own space to the skeleton's (z up, the figure facing -y)
at = lambda v: TO_ARM @ v.co


def top(v):
    return names[max(v.groups, key=lambda g: g.weight).group] if v.groups else ""


def along_forearm(p, side):
    """0 at the elbow, 1 at the wrist, for a point of the forearm."""
    e, w = bones[f"lowerarm_{side}"].head_local, bones[f"hand_{side}"].head_local
    return (p - e).dot(w - e) / (w - e).length_squared


def piece(name, mat, keep, out, cuts=(), gone=None):
    """A copy of the skin's faces that keep() takes (a face goes with most of its points), every point pushed `out` along
    the skin's own normal (the same way for every piece, so one lies evenly over the other); then cut clean by planes
    (point, normal: what lies on the normal's side goes, in the skeleton's space), and gone(face middle) takes faces out."""
    ob = skin.copy()
    ob.data = skin.data.copy()
    ob.name = ob.data.name = name
    bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    me = skin.data
    for v in bm.verts:
        v.co += me.vertices[v.index].normal * out
    drop = [f for f in bm.faces if 2 * sum(bool(keep(me.vertices[v.index])) for v in f.verts) < len(f.verts)]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    back = TO_ARM.inverted()
    for p, n in cuts:
        q, m3 = back @ p, (back.to_3x3() @ n).normalized()
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=q, plane_no=m3, clear_outer=True)
    if gone:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if gone(TO_ARM @ f.calc_center_median())], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.materials.clear()
    m = bpy.data.materials.new(mat)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = {"G_Shirt": (0.78, 0.72, 0.6, 1), "G_Vest": (0.33, 0.2, 0.11, 1)}[mat]
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    ob.data.materials.append(m)
    print(f"{name}: {len(ob.data.vertices)} points, {len(ob.data.polygons)} faces")
    return ob


def shirt_keeps(v):
    b = top(v)
    return b in TORSO or b.startswith("upperarm_") or b.startswith("lowerarm_")   # down into the shorts: tucked in


def vest_keeps(v):
    return top(v) in TORSO


def sleeve_end(side):
    e, w = bones[f"lowerarm_{side}"].head_local, bones[f"hand_{side}"].head_local
    return (e + (w - e) * SLEEVE, (w - e).normalized())


front_y = bones["spine_02"].head_local.y                    # the figure faces -y
shirt = piece("Goblin_Shirt", "G_Shirt", shirt_keeps, SHIRT_OUT, cuts=[sleeve_end("l"), sleeve_end("r")])
for v in shirt.data.vertices:                              # the rolled cuff: the last band of each sleeve stands further out
    p = TO_ARM @ v.co
    for side in "lr":
        f = along_forearm(p, side)
        if SLEEVE - 0.14 < f <= SLEEVE + 1e-4 and (p - bones[f"lowerarm_{side}"].head_local).length < (bones[f"hand_{side}"].head_local - bones[f"lowerarm_{side}"].head_local).length:
            v.co += v.normal * CUFF
vest = piece("Goblin_Waistcoat", "G_Vest", vest_keeps, VEST_OUT, cuts=[(Vector((0, 0, WAIST)), Vector((0, 0, -1)))],
             gone=lambda c: c.y < front_y and abs(c.x) < OPEN)
for o in (skin, *[o for o in added if o.type == "MESH" and o is not skin]):
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in (arm, shirt, vest):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {out}")
