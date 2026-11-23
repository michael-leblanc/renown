# Stand-in gear made in code, for trying things out before real models are chosen: a plain sword and a round shield,
# built of boxes, tubes and balls and hung on a bone of the figure's skeleton (character.py --gear "sword=hand_r;shield=lowerarm_l").
# They are NOT the game's art: they only fill the main hand and the off hand so layers, draw order and colours can be tried.
# Sizes are in the model's own units (a grown man is about 1.85 tall). Materials: MI_Gear_Iron, MI_Gear_Wood, MI_Gear_Grip.
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

COLOURS = {"MI_Gear_Iron": (0.20, 0.20, 0.19), "MI_Gear_Wood": (0.13, 0.07, 0.03), "MI_Gear_Grip": (0.06, 0.03, 0.015)}


def _material(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (*COLOURS[name], 1)
        bsdf.inputs["Roughness"].default_value = 1.0
        bsdf.inputs["Specular IOR Level"].default_value = 0.0
    return m


def _frame(at, x, y, z, size):
    """A piece's place: its middle at `at`, its own x, y, z along those three directions, that big along each."""
    m = Matrix.Identity(4)
    for col, (axis, k) in enumerate(zip((x, y, z), size)):
        m.col[col][:3] = axis.normalized() * k
    m.col[3][:3] = at
    return m


def _add(bm, kind, mat, where):
    had = set(bm.faces)
    if kind == "box":
        bmesh.ops.create_cube(bm, size=1.0, matrix=where)
    elif kind == "tube":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.5, radius2=0.5, depth=1.0, matrix=where)
    elif kind == "point":
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.7071, radius2=0.0, depth=1.0, matrix=where)
    elif kind == "ball":
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.5, matrix=where)
    for f in set(bm.faces) - had:
        f.material_index = mat


def _hand(bones, side):
    """The hand at rest: where it is, the way the fingers point, the way from the little finger to the first, the palm's side."""
    along = (bones[f"middle_01_{side}"].head_local - bones[f"hand_{side}"].head_local).normalized()
    across = (bones[f"index_01_{side}"].head_local - bones[f"pinky_01_{side}"].head_local).normalized()
    palm = along.cross(across).normalized()
    if palm.dot(bones[f"thumb_02_{side}"].head_local - bones[f"middle_01_{side}"].head_local) < 0:
        palm = -palm
    return bones[f"hand_{side}"].head_local.copy(), along, across, palm


def make(kind, arm, bone):
    """Builds `kind` ("sword" or "shield") on the skeleton `arm`, following `bone` alone. Returns the mesh object."""
    bones, bm = arm.data.bones, bmesh.new()
    side = bone[-1]
    at, along, across, palm = _hand(bones, side)
    if kind == "sword":
        # held in the fist: the grip lies across the palm, the blade leaves on the thumb's side and leans 35 degrees the way
        # the fingers point (a low guard when the arm hangs), its edge in line with the knuckles
        lean = math.radians(35)
        up = (across * math.cos(lean) + along * math.sin(lean)).normalized()
        edge = (along * math.cos(lean) - across * math.sin(lean)).normalized()
        grip = at + along * 0.085 + palm * 0.03
        _add(bm, "tube", 2, _frame(grip, edge, palm, up, (0.032, 0.032, 0.15)))
        _add(bm, "ball", 0, _frame(grip - up * 0.09, edge, palm, up, (0.05, 0.05, 0.05)))
        _add(bm, "box", 0, _frame(grip + up * 0.09, edge, palm, up, (0.20, 0.03, 0.03)))
        _add(bm, "box", 0, _frame(grip + up * 0.47, edge, palm, up, (0.055, 0.014, 0.74)))
        _add(bm, "point", 0, _frame(grip + up * 0.88, edge, palm, up, (0.055, 0.014, 0.08)))
    elif kind == "shield":
        # strapped on the forearm: a round board on the side the back of the hand is on, its middle over the forearm's middle
        fore = bones[f"lowerarm_{side}"].head_local
        mid, out = (fore + at) / 2, -palm
        run = (at - fore).normalized()
        side_way = out.cross(run).normalized()
        _add(bm, "tube", 1, _frame(mid + out * 0.07, run, side_way, out, (0.62, 0.62, 0.03)))
        _add(bm, "tube", 0, _frame(mid + out * 0.07, run, side_way, out, (0.66, 0.66, 0.018)))
        _add(bm, "ball", 0, _frame(mid + out * 0.085, run, side_way, out, (0.16, 0.16, 0.09)))
    else:
        raise SystemExit(f"no stand-in gear named {kind}: sword or shield")
    me = bpy.data.meshes.new(f"Gear_{kind}")
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for name in ("MI_Gear_Iron", "MI_Gear_Wood", "MI_Gear_Grip"):
        me.materials.append(_material(name))
    ob = bpy.data.objects.new(f"Gear_{kind}", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    group = ob.vertex_groups.new(name=bone)
    group.add(range(len(me.vertices)), 1.0, "REPLACE")
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    return ob
