# A held thing from its own model file (a sword, an axe, a spear, a bow, a shield), put in a figure's hand:
# character.py --hold '{"name": "arming_sword", "file": "Sword.gltf", "bone": "hand_r", "unit_tiles": 0.65, ...}'.
# The model is not changed: it is only moved, turned and sized as one piece, and follows that one bone.
# Nobody tells a model file which end is the handle, so it is measured:
#   its longest side is its length, the next its width (a blade's flat, an axe's head), the shortest its thickness;
#   along its length, the widest place is the guard of a sword or the head of an axe, mace or spear;
#   "handle": "near_widest" (sword, dagger: the handle's end is the one nearer the guard, the hand goes midway between
#   that end and the guard) or "far_from_widest" (axe, mace, spear, staff: the hand goes "grip" of the length up from
#   the other end, 0.25 if not told; a bow: "grip": 0.5).
# In the fist ("how": "fist") it sits as the stand-in sword does (standin_gear.py): the grip across the palm, the length
# leaving on the thumb's side and leaning "lean" degrees (35) the way the fingers point, the width in line with the
# knuckles. An axe's head faces forward; "flip": true turns it round. On the forearm ("how": "strap", a shield): its
# face outward over the forearm's middle, its back against the arm.
# Size: "length", how long it is in a man's hand, in our skeleton's units (a grown man is about 1.85 tall), whatever
# units its file has (the Quaternius weapons are about five times too big); then times the race's gear_scale (the
# wardrobe's gear_unit_tiles times gear_scale is "unit_tiles"), and times "scale" if the part has one. Without
# "length", one unit of the file is taken as one unit of ours. A hand bigger or smaller than a man's moves the grip with it.
# What it found, to check before a render (the intake's first step):
#   python3.11 scripts/art/held_gear.py <file> ['{"handle": "far_from_widest"}']     prints one line of JSON
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HAND = 0.1165        # a man's hand, wrist to the middle finger's root, on our skeleton: the grip's place is counted in these


def one_mesh(obs):
    """The file's meshes as one object, its points where they stand in the world; everything else it brought is let go."""
    bpy.context.view_layer.update()
    meshes = [o for o in obs if o.type == "MESH"]
    others = [o for o in obs if o.type != "MESH"]
    if not meshes:
        raise SystemExit("the file holds no mesh")
    for o in meshes:
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = world
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        if o.data.users > 1:
            o.data = o.data.copy()
    ob = meshes[0]
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=ob, selected_editable_objects=meshes, selected_objects=meshes):
            bpy.ops.object.join()
    world = ob.matrix_world.copy()
    ob.data.transform(world)
    if world.determinant() < 0:
        ob.data.flip_normals()
    ob.matrix_world = Matrix.Identity(4)
    for o in others:
        bpy.data.objects.remove(o)
    return ob


def measure(ob, spec):
    """Where the thing's length, width and thickness lie, which end is the handle's, and where the hand goes."""
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    ed = np.empty(len(me.edges) * 2, dtype=np.int32)
    me.edges.foreach_get("vertices", ed)
    ed = ed.reshape(-1, 2)
    lo, hi = co.min(0), co.max(0)
    order = np.argsort(hi - lo)                            # thin, wide, long
    thin, wide, long = (int(v) for v in order)
    length = float(hi[long] - lo[long])
    # along the length, in 60 slices: how wide it is in each (points along every edge, so a blade drawn with 8 points still counts)
    t = np.linspace(0, 1, 24)[None, :, None]
    pts = (co[ed[:, 0]][:, None, :] * (1 - t) + co[ed[:, 1]][:, None, :] * t).reshape(-1, 3) if len(ed) else co
    n = 60
    at = np.clip(((pts[:, long] - lo[long]) / max(length, 1e-9) * n).astype(int), 0, n - 1)
    width = np.zeros(n)
    for k in range(n):
        w = pts[at == k][:, wide]
        if len(w):
            width[k] = w.max() - w.min()
    widest = (int(np.argmax(width)) + 0.5) / n             # 0 at the low end, 1 at the high end
    how = spec.get("handle") or "near_widest"
    if how not in ("near_widest", "far_from_widest"):
        raise SystemExit(f'"handle" is {how}: near_widest or far_from_widest')
    low_end = (widest < 0.5) == (how == "near_widest")     # is the handle's end the low one?
    along = (lambda f: f) if low_end else (lambda f: 1 - f)
    from_handle = widest if low_end else 1 - widest
    grip = spec.get("grip")
    if grip is None:
        grip = from_handle / 2 if how == "near_widest" else 0.25
    g = lo[long] + along(grip) * length
    near = pts[np.abs(pts[:, long] - g) < 0.06 * length]
    if not len(near):
        near = pts
    centre = [0.0, 0.0, 0.0]
    centre[long] = float(g)
    centre[wide] = float((near[:, wide].min() + near[:, wide].max()) / 2)
    centre[thin] = float((near[:, thin].min() + near[:, thin].max()) / 2)
    head = pts[at == int(np.argmax(width))]
    heavy = float((head[:, wide].min() + head[:, wide].max()) / 2 - centre[wide])    # an axe's head lies to one side
    axis = lambda i, sign=1.0: [sign if j == i else 0.0 for j in range(3)]
    return {"length": length, "width": float(hi[wide] - lo[wide]), "thick": float(hi[thin] - lo[thin]),
            "long": axis(long, 1.0 if low_end else -1.0), "wide": axis(wide, -1.0 if heavy < -0.02 * length else 1.0), "thin": axis(thin),
            "widest_from_handle": round(from_handle, 3), "grip_from_handle": round(float(grip), 3), "grip": centre,
            "middle": [float(v) for v in (lo + hi) / 2], "points": int(len(co)),
            "materials": [s.material.name.split(".")[0] for s in ob.material_slots if s.material]}


def _hand(bones, side):
    """The hand at rest: where it is, the way the fingers point, the way from the little finger to the first, the palm's side."""
    along = (bones[f"middle_01_{side}"].head_local - bones[f"hand_{side}"].head_local)
    size = along.length
    along = along.normalized()
    across = (bones[f"index_01_{side}"].head_local - bones[f"pinky_01_{side}"].head_local).normalized()
    palm = along.cross(across).normalized()
    if palm.dot(bones[f"thumb_02_{side}"].head_local - bones[f"middle_01_{side}"].head_local) < 0:
        palm = -palm
    return bones[f"hand_{side}"].head_local.copy(), along, across, palm, size


def hold(obs, arm, bone, spec):
    """Puts what a model file brought (obs) in the hand of the skeleton `arm`, following `bone` alone. Returns the mesh
    object; size() gives it its size once the figure has its own."""
    ob = one_mesh(obs)
    m = measure(ob, spec)
    bones, side = arm.data.bones, bone[-1]
    at, along, across, palm, hand = _hand(bones, side)
    k = hand / HAND                                        # this hand against a man's
    if (spec.get("how") or "fist") == "strap":
        fore = bones[f"lowerarm_{side}"].head_local
        out, run = -palm, (at - fore).normalized()
        to = [run, out.cross(run).normalized(), out]       # its length along the forearm, its face outward
        src = [Vector(m["long"]), Vector(m["wide"]), Vector(m["thin"])]
        grip_to, grip_from = (fore + at) / 2 + out * (0.07 * k + m["thick"] / 2), Vector(m["middle"])
    else:
        lean = math.radians(float(spec.get("lean", 35)))
        up = (across * math.cos(lean) + along * math.sin(lean)).normalized()
        edge = (along * math.cos(lean) - across * math.sin(lean))
        edge = (edge - up * edge.dot(up)).normalized()
        to = [edge, up.cross(edge).normalized(), up]
        src = [Vector(m["wide"]), Vector(m["thin"]), Vector(m["long"])]
        grip_to, grip_from = at + along * (0.085 * k) + palm * (0.03 * k), Vector(m["grip"])
    if spec.get("flip"):
        src[0 if (spec.get("how") or "fist") != "strap" else 2] *= -1
    S, T = Matrix(src).transposed(), Matrix(to).transposed()         # columns: the thing's own three ways, and the hand's
    if (S.determinant() < 0) != (T.determinant() < 0):               # a turn, never a mirror: its thickness the other way round
        src[1] = -src[1]
        S = Matrix(src).transposed()
    turn = T @ S.inverted()
    move = Matrix.Translation(grip_to) @ turn.to_4x4() @ Matrix.Translation(-grip_from)
    ob.data.transform(move)
    ob.name = ob.data.name = f"Held_{spec.get('name', 'thing')}"
    ends = [move @ (Vector(m["grip"]) + Vector(m["long"]) * m["length"] * d) for d in (1 - m["grip_from_handle"], -m["grip_from_handle"])]
    ob["grip"], ob["tip"], ob["pommel"], ob["own_length"] = list(grip_to), list(ends[0]), list(ends[1]), m["length"]
    ob.parent = arm
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_basis = Matrix.Identity(4)
    group = ob.vertex_groups.new(name=bone)
    group.add(range(len(ob.data.vertices)), 1.0, "REPLACE")
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    print(f"held {spec.get('name', '')}: {m['length']:.3f} long, {m['width']:.3f} wide, {m['thick']:.3f} thick in its file; "
          f"the widest place {m['widest_from_handle']:.2f} of the length from the handle's end, the hand at {m['grip_from_handle']:.2f}; "
          f"this hand is {k:.2f} of a man's")
    return ob


def size(ob, arm, spec):
    """Gives a held thing its size, about the place the hand holds it, once the figure stands at its own size."""
    world = arm.matrix_world.to_scale().x                            # tiles to one unit of the skeleton's own space
    own = float(spec["length"]) / ob["own_length"] if spec.get("length") else 1.0       # "length": how long it is in a man's hand
    f = own * float(spec["unit_tiles"]) * float(spec.get("scale", 1)) / world
    grip = Vector(ob["grip"])
    for key in ("tip", "pommel"):
        ob[key] = list(grip + (Vector(ob[key]) - grip) * f)
    ob.data.transform(Matrix.Translation(grip) @ Matrix.Scale(f, 4) @ Matrix.Translation(-grip))
    print(f"held {spec.get('name', '')}: drawn {ob['own_length'] * f * world * 78.384:.1f} px long")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from character import load
    if len(sys.argv) < 2:
        raise SystemExit("python3.11 scripts/art/held_gear.py <model file> ['{\"handle\": \"far_from_widest\"}']")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    found = measure(one_mesh(load(sys.argv[1])), json.loads(sys.argv[2]) if len(sys.argv) > 2 else {})
    print("MEASURED " + json.dumps(found))
