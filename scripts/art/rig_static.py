# Rigs a model that came with no skeleton (a still body from an AI maker such as Tripo, standing in a T or an A), so that
# onto_our_rig.py can then put it on our skeleton like any model that came on Mixamo's. Run from the repo root (Blender as
# the Python module, setup_blender.sh):
#   python3.11 scripts/art/rig_static.py --model orc_model_1.glb --ours Superhero_Male_FullBody.gltf \
#       --marks scripts/art/rigs/orc_model_1.json --out orc_rigged.glb [--picture joints.png]
#       --model   the still model (.glb, .gltf, .fbx): z up, facing -y (the way ours face), feet on the ground
#       --ours    any file that holds our skeleton; only its skeleton is taken
#       --marks   the model's landmarks and zones (a small json in scripts/art/rigs/, read the one there for its words)
#       --out     the model with a skeleton (Mixamo's bone names) and its zones as materials, .glb (never in the repo)
#       --picture a front and a side view of the model with the joints drawn on, to look at before going on
# What it does:
#   - Our skeleton's joints are carried onto the model by its landmarks: heights (ground, ankle, knee, hip, shoulder, neck,
#     head, top) map ours to theirs piece by piece; along the arms the same with the joints' distance out from the middle
#     (shoulder, elbow, wrist, finger tip). The hand and its fingers are ours, sized by the hand's length. Where a joint
#     sits front to back (and how high on an arm) is read from the model: the middle of its cross-section there.
#   - Each bone points at its child (the model's own limbs, so the skinning follows them), and takes the bone's turn about
#     itself from ours. onto_our_rig.py then turns forearms and hands to lie as ours and stands it on our skeleton.
#   - The points are bound by Blender's automatic weights (bone heat). Points that got none (a piece with no bone inside,
#     such as an eye or a tusk) take those of the nearest point that has some.
#   - The zones become materials (one ramp each, chosen in the wardrobe): pieces inside a box, faces below a height,
#     the tips of fingers and toes. Everything left is the first zone (the skin).
# Prints what it found: the mesh (points, holes, pieces), the bones placed, the points left without weights.
import json
import math
import os
import sys
from collections import defaultdict

import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

MIXAMO = {"pelvis": "Hips", "spine_01": "Spine", "spine_02": "Spine1", "spine_03": "Spine2", "neck_01": "Neck", "Head": "Head",
          "thigh": "UpLeg", "calf": "Leg", "foot": "Foot", "ball": "ToeBase", "ball_leaf": "Toe_End",
          "clavicle": "Shoulder", "upperarm": "Arm", "lowerarm": "ForeArm", "hand": "Hand"}
FINGER = {"thumb": "Thumb", "index": "Index", "middle": "Middle", "ring": "Ring", "pinky": "Pinky"}
MAIN_CHILD = {"pelvis": "spine_01", "spine_03": "neck_01", "hand": "middle_01"}


def args(name, default=None):
    a = sys.argv
    got = [a[i + 1] for i in range(len(a) - 1) if a[i] == name]
    return got[-1] if got else default


def mixamo(ours):
    """thigh_l -> mixamorig:LeftUpLeg, index_02_r -> mixamorig:RightHandIndex2; None for a bone Mixamo has not (root)."""
    side = {"_l": "Left", "_r": "Right"}.get(ours[-2:], "")
    base = ours[:-2] if side else ours
    if base.split("_")[0] in FINGER:
        f, n = base.split("_")[0], base.split("_")[1]
        return f"mixamorig:{side}Hand{FINGER[f]}{int(n)}"
    return f"mixamorig:{side}{MIXAMO[base]}" if base in MIXAMO else None


def piecewise(x, xs, ys):
    """The value at x of the line through (xs, ys), straight on past the ends."""
    i = max(1, min(len(xs) - 1, next((k for k in range(1, len(xs)) if x <= xs[k]), len(xs) - 1)))
    t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
    return ys[i - 1] + t * (ys[i] - ys[i - 1])


def load(path):
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=path, disable_bone_shape=True)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        raise SystemExit(f"cannot read {path}: a .glb, .gltf or .fbx file is needed")
    return [o for o in bpy.data.objects if o not in before]


def islands(me):
    """Each point's piece (points joined by faces), numbered."""
    par = list(range(len(me.vertices)))

    def root(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for p in me.polygons:
        vs = list(p.vertices)
        for b in vs[1:]:
            ra, rb = root(vs[0]), root(b)
            if ra != rb:
                par[ra] = rb
    ids, out = {}, []
    for i in range(len(par)):
        out.append(ids.setdefault(root(i), len(ids)))
    return out


def main():
    model, base, marks_path, out = args("--model"), args("--ours"), args("--marks"), args("--out")
    if not (model and base and marks_path and out):
        raise SystemExit("python3.11 scripts/art/rig_static.py --model <still model> --ours <a file with our skeleton> --marks <rigs/x.json> --out <file.glb> [--picture p.png]")
    M = json.load(open(marks_path))
    bpy.ops.wm.read_factory_settings(use_empty=True)

    mine = load(base)
    our = next(o for o in mine if o.type == "ARMATURE")
    for o in mine:
        if o is not our:
            bpy.data.objects.remove(o)
    theirs = load(model)
    meshes = [o for o in theirs if o.type == "MESH"]
    if len(meshes) != 1:
        raise SystemExit(f"{model}: {len(meshes)} meshes; one is expected (join them first)")
    body = meshes[0]
    world = body.matrix_world.copy()
    for o in theirs:
        if o is not body:
            bpy.data.objects.remove(o)
    body.parent = None
    body.data.transform(world)
    body.matrix_world = Matrix.Identity(4)
    body.name = body.data.name = M.get("name", "body")
    me = body.data
    P = [v.co.copy() for v in me.vertices]
    piece = islands(me)
    edges = defaultdict(int)
    for p in me.polygons:
        vs = list(p.vertices)
        for a, b in zip(vs, vs[1:] + vs[:1]):
            edges[tuple(sorted((a, b)))] += 1
    holes = sum(1 for n in edges.values() if n == 1)
    sizes = defaultdict(int)
    for k in piece:
        sizes[k] += 1
    lo = Vector([min(p[i] for p in P) for i in range(3)])
    hi = Vector([max(p[i] for p in P) for i in range(3)])
    print(f"{os.path.basename(model)}: {len(P)} points, {len(me.polygons)} faces, {len(sizes)} pieces "
          f"({', '.join(str(n) for n in sorted(sizes.values(), reverse=True))} points), {holes} open edges (holes' rims)")
    print(f"  stands {hi.z - lo.z:.3f} tall, {hi.x - lo.x:.3f} wide, feet at {lo.z:.3f}; uv maps {len(me.uv_layers)}, materials {len(me.materials)}")

    # --- where our joints go -------------------------------------------------------------------------------------------
    H, A = M["heights"], M["arm"]
    hz = lambda z: piecewise(z, H["ours"], H["theirs"])
    ax = lambda x: math.copysign(piecewise(abs(x), A["ours"], A["theirs"]), x)
    mainp = max(sizes, key=sizes.get)

    def middle(sel, axis):
        vals = [P[i][axis] for i in sel]
        return (min(vals) + max(vals)) / 2 if vals else None

    def torso(z):
        sel = [i for i, p in enumerate(P) if abs(p.x) < M.get("mid_band", 0.03) and abs(p.z - z) < 0.01 and piece[i] == mainp]
        return middle(sel, 1)

    def arm(x):
        side = 1 if x > 0 else -1
        sel = [i for i, p in enumerate(P) if abs(p.x - x) < 0.01 and p.z > M["arm_above"] and piece[i] == mainp and p.x * side > 0]
        return Vector((x, (sum(P[i].y for i in sel) / len(sel)), (sum(P[i].z for i in sel) / len(sel))))

    def leg(z, side):
        sel = [i for i, p in enumerate(P) if abs(p.z - z) < 0.012 and p.x * side > 0 and abs(p.x) < M["leg_within"]]
        return Vector((sum(P[i].x for i in sel) / len(sel), middle(sel, 1), z))

    rest = {b.name: (our.matrix_world @ b.head_local, our.matrix_world @ b.tail_local) for b in our.data.bones}
    joint = {}
    for name, (head, _) in rest.items():
        side = 1 if name.endswith("_l") else -1 if name.endswith("_r") else 0
        kind = name[:-2] if side else name
        z = hz(head.z)
        if name == "root":
            joint[name] = Vector((0, 0, 0))
        elif kind in ("pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head"):
            joint[name] = Vector((0, torso(z), z))
        elif kind == "clavicle":
            joint[name] = Vector((ax(head.x), torso(z), z))
        elif kind in ("upperarm", "lowerarm", "hand"):
            joint[name] = arm(ax(head.x))
        elif kind in ("thigh", "calf"):
            joint[name] = leg(z, side)
        elif kind == "foot":
            j = leg(z, side)
            joint[name] = Vector((j.x, M["foot"]["ankle_y"], z))
    for side, s in (("_l", 1), ("_r", -1)):                       # feet: ball and toe on the model's own, under the ankle
        ank = joint["foot" + side]
        joint["ball" + side] = Vector((ank.x, M["foot"]["ball_y"], M["foot"]["ball_z"]))
        joint["ball_leaf" + side] = Vector((ank.x, M["foot"]["toe_y"], M["foot"]["ball_z"]))
        w0, w1 = rest["hand" + side][0], joint["hand" + side]    # the hand and fingers: ours, sized by the hand's length
        k = (A["theirs"][-1] - A["theirs"][-2]) / (A["ours"][-1] - A["ours"][-2])
        for name, (head, _) in rest.items():
            if name.endswith(side) and name.split("_")[0] in FINGER:
                joint[name] = w1 + (head - w0) * k
    missing = [n for n in rest if n not in joint]
    if missing:
        raise SystemExit(f"no place for: {', '.join(missing)}")

    # --- the skeleton: ours, moved onto those joints, bones named as Mixamo's ---------------------------------------
    bpy.context.view_layer.objects.active = our
    our.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = our.data.edit_bones
    zaxis = {b.name: b.z_axis.copy() for b in eb}
    length = {b.name: b.length for b in eb}
    for b in eb:
        b.use_connect = False
    for b in eb:
        b.head = joint[b.name]
    scale = (H["theirs"][-1] - H["theirs"][0]) / (H["ours"][-1] - H["ours"][0])
    for b in eb:
        kids = [c for c in b.children]
        kind = b.name[:-2] if b.name[-2:] in ("_l", "_r") else b.name
        main = next((c for c in kids if c.name.startswith(MAIN_CHILD.get(kind, "\0"))), kids[0] if len(kids) == 1 else None)
        if main is not None and (main.head - b.head).length > 1e-4 and b.name != "root":
            b.tail = main.head.copy()
        else:
            way = (rest[b.name][1] - rest[b.name][0]).normalized()
            b.tail = b.head + way * max(length[b.name] * scale, 1e-3)
        b.align_roll(zaxis[b.name])
    for b in list(eb):
        if b.name == "root":
            eb.remove(b)
    bpy.ops.object.mode_set(mode="OBJECT")
    for b in our.data.bones:
        b.use_deform = not (b.name.endswith("_leaf_l") or b.name.endswith("_leaf_r") or "_leaf" in b.name)
    print("  joints placed (the model's units; x out, y back, z up):")
    for n in ("pelvis", "spine_03", "neck_01", "Head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "middle_01_l", "thigh_l", "calf_l", "foot_l", "ball_l"):
        j = joint[n]
        print(f"    {n:12s} {j.x:6.3f} {j.y:6.3f} {j.z:6.3f}")

    # --- skinning ------------------------------------------------------------------------------------------------------
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    our.select_set(True)
    bpy.context.view_layer.objects.active = our
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    groups = {g.index: g for g in body.vertex_groups}
    weighted = [i for i, v in enumerate(me.vertices) if any(e.weight > 1e-4 for e in v.groups)]
    bare = [i for i, v in enumerate(me.vertices) if not any(e.weight > 1e-4 for e in v.groups)]
    by_piece = defaultdict(int)
    for i in bare:
        by_piece[piece[i]] += 1
    whole = [k for k, n in by_piece.items() if n == sizes[k]]
    print(f"  bone heat: {len(weighted)} points weighted, {len(bare)} without ({len(whole)} whole pieces with no bone inside, "
          f"{len(bare) - sum(sizes[k] for k in whole)} points elsewhere)")
    if bare:
        kd = KDTree(len(weighted))
        for n, i in enumerate(weighted):
            kd.insert(P[i], n)
        kd.balance()
        for i in bare:
            _, n, _ = kd.find(P[i])
            for e in me.vertices[weighted[n]].groups:
                if e.weight > 1e-4:
                    groups[e.group].add([i], e.weight, "REPLACE")
        print(f"    those {len(bare)} take the weights of their nearest weighted point")

    # --- zones -----------------------------------------------------------------------------------------------------------
    Z = M["zones"]
    names = [z["material"] for z in Z]
    me.materials.clear()
    for n in names:
        mat = bpy.data.materials.get(n) or bpy.data.materials.new(n)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
        me.materials.append(mat)
    face_zone = {}                                                   # faces a zone took whole (grow)
    zone_of = [0] * len(P)                                           # per point; a face takes its points' most common
    for zi, z in enumerate(Z):
        if zi == 0:
            continue
        got = set()
        for box in z.get("pieces_in", []):
            lo_b, hi_b = Vector(box[:3]), Vector(box[3:])
            for k in sizes:
                pts = [i for i in range(len(P)) if piece[i] == k]
                if all(lo_b.x <= P[i].x <= hi_b.x and lo_b.y <= P[i].y <= hi_b.y and lo_b.z <= P[i].z <= hi_b.z for i in pts):
                    got.update(pts)
        if "below" in z:
            b = z["below"]
            got.update(i for i in range(len(P)) if piece[i] == mainp and P[i].z < b["z"] + b.get("back_rise", 0) * max(0, P[i].y) / 0.1
                       and P[i].z > b.get("above", -1))
        if "grow" in z:                                            # faces joined to a seed across edges bent less than angle
            g = z["grow"]
            centre = [sum((P[v] for v in p.vertices), Vector()) / len(p.vertices) for p in me.polygons]
            norm = [p.normal.copy() for p in me.polygons]
            by_edge = defaultdict(list)
            for p in me.polygons:
                for ek in p.edge_keys:
                    by_edge[ek].append(p.index)
            seed = min(range(len(centre)), key=lambda f: (centre[f] - Vector(g["seed"])).length)
            seen, todo = {seed}, [seed]
            while todo:
                f = todo.pop()
                for ek in me.polygons[f].edge_keys:
                    for h in by_edge[ek]:
                        if h not in seen and centre[h].z < g["below"] and math.degrees(norm[f].angle(norm[h], 0)) < g["angle"]:
                            seen.add(h)
                            todo.append(h)
            for f in seen:
                face_zone[f] = zi
            print(f"    {z['material']}: {len(seen)} faces grown from {g['seed']}")
        for tip in z.get("tips", []):
            centre, reach, near, depth = Vector(tip["from"]), tip["reach"], tip["radius"], tip["depth"]
            pts = [i for i in range(len(P)) if (P[i] - centre).length < reach and all(lo_ <= P[i][a] <= hi_ for a, (lo_, hi_) in enumerate(tip.get("box", [[-9, 9]] * 3)))]
            if not pts:
                continue
            kd = KDTree(len(pts))
            for n, i in enumerate(pts):
                kd.insert(P[i], n)
            kd.balance()
            dist = {i: (P[i] - centre).length for i in pts}
            tips = [i for i in pts if dist[i] >= tip.get("min_reach", 0) and all(dist[pts[n]] <= dist[i] + 1e-9 for _, n, _ in kd.find_range(P[i], near))]
            for t in tips:
                got.update(pts[n] for _, n, _ in kd.find_range(P[t], near) if dist[pts[n]] > dist[t] - depth)
            print(f"    {z['material']}: {len(tips)} tips from {tip['from']}")
        for i in got:
            zone_of[i] = zi
        print(f"  zone {z['material']}: {len(got)} points")
    count = defaultdict(int)
    for p in me.polygons:
        votes = defaultdict(int)
        for v in p.vertices:
            votes[zone_of[v]] += 1
        p.material_index = face_zone.get(p.index, max(votes, key=lambda k: (votes[k], k)))
        count[names[p.material_index]] += 1
    print("  faces per zone: " + ", ".join(f"{n} {count[n]}" for n in names))

    # --- Mixamo's names, so onto_our_rig.py reads it as any model that came rigged --------------------------------
    rename = {b.name: mixamo(b.name) for b in our.data.bones}
    for g in body.vertex_groups:
        if rename.get(g.name):
            g.name = rename[g.name]
    for b in our.data.bones:
        if rename.get(b.name):
            b.name = rename[b.name]
    our.name = "Armature"

    bpy.ops.object.select_all(action="DESELECT")
    our.select_set(True)
    body.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_animations=False, export_skins=True)
    print(f"wrote {out}")
    if args("--picture"):
        picture(body, our, args("--picture"))


def picture(body, arm, path):
    """Front and side of the model with its joints as dots, its zones in flat colours (Cycles, a few samples)."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 8
    sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = 900, 900
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    colours = [(0.55, 0.6, 0.5), (0.9, 0.8, 0.1), (0.95, 0.95, 0.85), (0.2, 0.2, 0.25), (0.35, 0.22, 0.12), (0.6, 0.2, 0.2)]
    for i, m in enumerate(body.data.materials):
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*colours[i % len(colours)], 1)
    dot = bpy.data.materials.new("dot")
    dot.use_nodes = True
    dot.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 0, 0, 1)
    dot.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 5
    for b in arm.data.bones:
        if "_0" in b.name and "Hand" in b.name:
            continue
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006, location=arm.matrix_world @ b.head_local)
        s = bpy.context.object
        s.data.materials.append(dot)
        s.show_in_front = True
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sc.collection.objects.link(sun)
    lo = min((body.matrix_world @ v.co).z for v in body.data.vertices)
    hi = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = (hi - lo) * 1.1
    sc.collection.objects.link(cam)
    sc.camera = cam
    for m in body.data.materials:
        m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.55
        m.blend_method = "BLEND"
    stem, _ = os.path.splitext(path)
    for name, loc, rot in (("front", (0, -5, (lo + hi) / 2), (90, 0, 0)), ("side", (5, 0, (lo + hi) / 2), (90, 0, 90))):
        cam.location = loc
        cam.rotation_euler = [math.radians(a) for a in rot]
        sc.render.filepath = f"{stem}.{name}.png"
        bpy.ops.render.render(write_still=True)
    print(f"  pictures: {stem}.front.png, {stem}.side.png")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)                                                   # bpy 4.2 as a module can crash on its way out
