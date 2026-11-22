# The goblin's shirt and waistcoat, made over its own body (Michael, 2026-11-22: "Make shirt and waistcoat here"; the
# spec's clothing set is "shirt with rolled sleeves, waistcoat, trousers"; trousers later: the model has no legs under its
# shorts). The body is not changed: each piece is a copy of some of the skin's faces, pushed out along the skin's normals,
# keeping the skin's bone weights, so it moves with the body in every animation.
#   python3.11 scripts/art/goblin_clothes.py [<goblin_ours.glb> [<out.glb>]]
#     shirt     ("Goblin_Shirt", material G_Shirt): the chest, back, shoulders and upper arms, the sleeves rolled up to
#               SLEEVE of the way down the forearm with a thicker cuff; the neck and the hips under the shorts left out.
#     waistcoat ("Goblin_Waistcoat", material G_Vest): the chest and back without the arms, open down the front, over the shirt.
#   --look a|b|c|d (Michael, 2026-11-22: "they look flat and lack detail"; a variant each, he picks):
#     a  as first made: one colour each, too pale for its ramp, so each showed one tone at 48 px
#     b  colours that land in the middle of their ramps, and folds: the pieces made finer and their points moved in and out
#        (drape down the chest, bunching above the tuck and in the elbow; the leather barely)
#     c  b + edges: a darker seam on the shirt where the waistcoat meets it, a lighter edge round the waistcoat, the rolled
#        sleeve band in its own lighter colour with a dark crease above it (materials G_Seam, G_VestEdge, G_Cuff)
#     d  c + three brass buttons on the waistcoat's front edge ("Goblin_Buttons", G_Brass) and a belt round the waist over
#        the waistcoat ("Goblin_Belt", G_Belt)
# Writes one .glb with a copy of the skeleton and the pieces (the race's render.models loads it after the body).
import math
import os
import sys

import bpy
import bmesh  # noqa: E402 (after bpy: the module brings it)
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from character import load  # noqa: E402

A = "/mnt/project-files/characters/models/goblin_simple"
args = sys.argv[1:]
LOOK = args[args.index("--look") + 1] if "--look" in args else "a"
if "--look" in args:
    del args[args.index("--look"):args.index("--look") + 2]
src = args[0] if len(args) > 0 else f"{A}/goblin_ours.glb"
out = args[1] if len(args) > 1 else f"{A}/goblin_clothes.glb"
SHIRT_OUT, VEST_OUT, CUFF = 0.022, 0.05, 0.022     # how far each lies out from the skin, in the model's units (it stands 2.15)
SLEEVE = 0.4                                       # the rolled sleeve ends this far down the forearm, elbow 0, wrist 1
WAIST = 1.1                                        # the waistcoat ends here, at the shorts' belt
OPEN = 0.07                                        # the waistcoat's front opening: half its width at the chest
PX = 2.15 / 48                                     # one pixel at 48 px, in the model's units
# the colours (Blender's linear base colour). a: as first made. b on: each scaled so that its lit lightness lands in the
# middle of its ramp (measured on idle SE: the shirt's middle was 0.76 against cloth's 0.42 to 0.67, the waistcoat's 0.51
# against hide's 0.20 to 0.45; lightness goes as the cube root, so 0.40 and 0.27 times)
BASE = {"G_Shirt": (0.78, 0.72, 0.6), "G_Vest": (0.33, 0.2, 0.11)}
if LOOK != "a":
    BASE = {"G_Shirt": (0.31, 0.29, 0.24), "G_Vest": (0.09, 0.054, 0.03),
            "G_Seam": (0.13, 0.12, 0.1), "G_Cuff": (0.42, 0.39, 0.32), "G_VestEdge": (0.2, 0.125, 0.07),
            "G_Brass": (0.55, 0.4, 0.12), "G_Belt": (0.035, 0.02, 0.012)}

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
    ob.data.materials.append(material(mat))
    print(f"{name}: {len(ob.data.vertices)} points, {len(ob.data.polygons)} faces")
    return ob


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*BASE[name], 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    if name == "G_Brass":
        m.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0
        m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.4
    return m


def finer(ob, cuts):
    """The piece made finer (each edge cut `cuts` times; the bone weights are shared out as the points are), so folds can show."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def folds(ob, depth, wobble):
    """Each point moved out along the piece's normal by depth(p) * a ridged noise (p in the skeleton's space), so the
    light finds creases. wobble(p) gives the noise's stretch: folds run along the axis it stretches least."""
    ob.data.update()
    from mathutils.bvhtree import BVHTree
    me = skin.data
    tree = BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices for p in me.polygons])
    for v in ob.data.vertices:
        _, _, fi, _ = tree.find_nearest(v.co)
        out_n = Vector()                               # the skin's own way out there (the finer piece's normals can turn)
        for k in me.polygons[fi].vertices:
            out_n += me.vertices[k].normal
        out_n.normalize()
        p, b = TO_ARM @ v.co, top(v)
        on_arm = b.startswith("upperarm_") or b.startswith("lowerarm_")
        r = 1 - abs(noise.noise(wobble(p, on_arm)))       # ridged, 0 to 1: sharp creases, broad rolls; only ever out, so no skin shows
        v.co += out_n * depth(p, on_arm) * r
    ob.data.update()


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
extra = []
if LOOK in "bcd":
    def arm_t(p):
        """How far along an arm a point is: 0 at the shoulder, 1 at the elbow, 2 at the wrist; None off the arms."""
        best = None
        for side in "lr":
            s_, e, w = (bones[f"{b}_{side}"].head_local for b in ("upperarm", "lowerarm", "hand"))
            for a, b, t0 in ((s_, e, 0), (e, w, 1)):
                t = max(0, min(1, (p - a).dot(b - a) / (b - a).length_squared))
                d = (p - (a + (b - a) * t)).length
                if best is None or d < best[0]:
                    best = (d, t0 + t)
        return best[1]
    finer(shirt, 2)
    finer(vest, 1)
    waist_z = WAIST

    def shirt_depth(p, on_arm):
        t = arm_t(p)
        if on_arm:                                    # sleeves: creases gather in the elbow
            return 0.006 + 0.012 * max(0, 1 - abs(t - 1) / 0.5)
        bunch = max(0, 1 - (p.z - waist_z) / 0.25)           # the shirt bunches above the tuck
        return 0.006 + 0.012 * bunch

    def shirt_wobble(p, on_arm):
        if on_arm:
            return Vector((p.x * 3, p.y * 9, p.z * 9))         # rings round the arm
        bunch = max(0, 1 - (p.z - waist_z) / 0.25)
        return Vector((p.x * 9, p.y * 9, p.z * (3 + 9 * bunch)))   # drape down the chest, crosswise above the tuck

    folds(shirt, shirt_depth, shirt_wobble)
    folds(vest, lambda p, a: 0.004, lambda p, a: Vector((p.x * 6, p.y * 6, p.z * 4)))

if LOOK in "cd":
    from mathutils.kdtree import KDTree
    def boundary(ob):
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        pts = [TO_ARM @ v.co for v in bm.verts if v.is_boundary]
        bm.free()
        kd = KDTree(len(pts))
        for i, p in enumerate(pts):
            kd.insert(p, i)
        kd.balance()
        return kd

    def recolour(ob, names, pick):
        """Gives each face the material pick(face middle in the skeleton's space) names (None: keeps its own)."""
        for n in names:
            if n not in ob.data.materials:
                ob.data.materials.append(material(n))
        idx = {m.name: i for i, m in enumerate(ob.data.materials)}
        for f in ob.data.polygons:
            n = pick(TO_ARM @ f.center)
            if n:
                f.material_index = idx[n]

    vest_edge = boundary(vest)
    recolour(vest, ["G_VestEdge"], lambda c: "G_VestEdge" if vest_edge.find(c)[2] < 0.7 * PX else None)

    def shirt_pick(c):
        for side in "lr":                                    # the rolled band, and the crease just above it
            f = along_forearm(c, side)
            near = (c - bones[f"lowerarm_{side}"].head_local).length < (bones[f"hand_{side}"].head_local - bones[f"lowerarm_{side}"].head_local).length
            if near and SLEEVE - 0.14 < f <= SLEEVE + 1e-3:
                return "G_Cuff"
            if near and SLEEVE - 0.14 - 0.06 < f <= SLEEVE - 0.14:
                return "G_Seam"
        if vest_edge.find(c)[2] < 0.6 * PX:                   # where the waistcoat meets the shirt
            return "G_Seam"
        return None
    recolour(shirt, ["G_Seam", "G_Cuff"], shirt_pick)

if LOOK == "d":
    # the belt: a band of the skin round the waist, just above the waistcoat's hem, over the waistcoat
    belt = piece("Goblin_Belt", "G_Belt", vest_keeps, VEST_OUT + 0.018,
                 cuts=[(Vector((0, 0, WAIST + 0.005)), Vector((0, 0, -1))), (Vector((0, 0, WAIST + 0.065)), Vector((0, 0, 1)))])
    extra.append(belt)
    # the buttons: three brass studs on the waistcoat's front edge, on the figure's right, found by a ray from the front
    from mathutils.bvhtree import BVHTree
    vest.data.update()
    dg = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(vest, dg)
    back = TO_ARM.inverted()
    bm = bmesh.new()
    deform = bm.verts.layers.deform.verify()
    vest_groups = {g.name: g.index for g in vest.vertex_groups}
    kd = __import__("mathutils").kdtree.KDTree(len(vest.data.vertices))
    for v in vest.data.vertices:
        kd.insert(v.co, v.index)
    kd.balance()
    r = 0.75 * PX                                            # 1.5 px across
    for z in (WAIST + 0.12, WAIST + 0.22, WAIST + 0.32):
        x = -(OPEN + 0.035)
        o = back @ Vector((x, -2, z))
        d = (back.to_3x3() @ Vector((0, 1, 0))).normalized()
        hit, nrm, fi, dist = tree.ray_cast(o, d)
        if hit is None:
            print(f"no waistcoat at button height {z:.2f}")
            continue
        made = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=r)["verts"]
        nrm = nrm.normalized()
        rot = nrm.to_track_quat("Z", "Y").to_matrix()
        _, near, _ = kd.find(hit)
        weights = {vest.vertex_groups[g.group].name: g.weight for g in vest.data.vertices[near].groups}
        for v in made:
            v.co = hit + nrm * (0.4 * r) + rot @ Vector((v.co.x, v.co.y, v.co.z * 0.45))
            for gname, wgt in weights.items():
                v[deform][vest_groups[gname]] = wgt
    me = bpy.data.meshes.new("Goblin_Buttons")
    bm.to_mesh(me)
    bm.free()
    buttons = bpy.data.objects.new("Goblin_Buttons", me)
    bpy.context.scene.collection.objects.link(buttons)
    buttons.matrix_world = vest.matrix_world.copy()
    buttons.parent = vest.parent
    buttons.matrix_parent_inverse = vest.matrix_parent_inverse.copy()
    for g in vest.vertex_groups:
        buttons.vertex_groups.new(name=g.name)
    for mod in vest.modifiers:
        if mod.type == "ARMATURE":
            buttons.modifiers.new("Armature", "ARMATURE").object = mod.object
    me.materials.append(material("G_Brass"))
    for f in me.polygons:
        f.use_smooth = True
    extra.append(buttons)
    print(f"Goblin_Buttons: {len(me.vertices)} points")

for o in (skin, *[o for o in added if o.type == "MESH" and o is not skin]):
    bpy.data.objects.remove(o)
bpy.ops.object.select_all(action="DESELECT")
for o in (arm, shirt, vest, *extra):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format="GLB", export_animations=False)
print(f"wrote {out}")
