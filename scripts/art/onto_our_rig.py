# Puts a model that came on a Mixamo skeleton onto ours (the Universal Base Characters' skeleton, which the Universal
# Animation Library moves), so character.py can load it like any other model: the same bone names, the same bones at
# rest, and so the same animations, masks and gear. Run from the repo root (Blender as the Python module, setup_blender.sh):
#   python3.11 scripts/art/onto_our_rig.py --model goblin.glb --ours Superhero_Male_FullBody.gltf --out goblin_ours.glb
#       --model  the model on a Mixamo skeleton (.glb, .gltf, .fbx): bones named mixamorig:Hips, mixamorig:LeftArm, ...
#       --ours   any file that holds our skeleton (a Universal Base Characters body); only its skeleton is taken
#       --drop   comma-separated words: objects of the model to leave out (a backdrop, a ground)
#       --out    the model on our skeleton, as .glb (never in the repo: it holds the model)
# What it does, and what it leaves alone:
#   - No point of a mesh moves against another. The whole is stood up (z up, facing -y, feet on the ground), and sized so
#     its hips are as high as our skeleton's: an animation moves the hips in our skeleton's own units.
#   - Our skeleton is copied and each of its joints is moved to where the model's own joint is. The bones keep the way
#     they point at rest, so an animation turns them as it turns ours. Both skeletons rest in a T (arms out), which is why
#     this is enough; a model that rests otherwise would need its rest pose changed first.
#   - Each point keeps the bones it followed and how much, under our names (mixamorig:LeftForeArm -> lowerarm_l).
#   - Its forearms and hands are first turned, at rest, to lie as ours do: the forearm along our forearm bone, the hand
#     (wrist to knuckles, little finger's knuckle to the first's) as our hand lies. A model whose arms rest otherwise
#     (Goblin Simple's forearms were 16 to 18 degrees off ours, its hands about 30 degrees turned and drooping) would
#     otherwise show its hands turned that much in every animation, and hold every weapon that much askew. Its points are
#     moved as its own skeleton moves them (the pose is made its rest), nothing else of its shape changes; --no-align leaves
#     the arms as they came. --upper turns the upper arms first, the same way (shoulder to elbow along ours): for a body
#     whose arms rest well off ours (orc_model_1's were 14 to 17 degrees back and down, so every animation held its elbows out).
# Prints the bones matched, the ones without a partner, and how the two rests differ (limb by limb, in degrees).
#   python3.11 scripts/art/onto_our_rig.py --check <model on our skeleton> --ours <a file with our skeleton>
#       how far its forearms and hands lie from ours at rest, in degrees (one line, ARMS {...}); the intake's arms check
import json
import math
import os
import re
import sys

import bpy
from mathutils import Matrix, Vector

NAMES = {
    "Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03", "Neck": "neck_01", "Head": "Head",
    "UpLeg": "thigh", "Leg": "calf", "Foot": "foot", "ToeBase": "ball", "Toe_End": "ball_leaf",
    "Shoulder": "clavicle", "Arm": "upperarm", "ForeArm": "lowerarm", "Hand": "hand",
}
FINGERS = {"Thumb": "thumb", "Index": "index", "Middle": "middle", "Ring": "ring", "Pinky": "pinky"}


def args(name, default=None):
    a = sys.argv
    got = [a[i + 1] for i in range(len(a) - 1) if a[i] == name]
    return got[-1] if got else default


def ours_name(theirs):
    """mixamorig:LeftHandIndex2_10 -> index_02_l; None for a bone with no partner (HeadTop_End, a root)."""
    n = re.sub(r"_\d+$", "", theirs.split(":")[-1])              # a file from Sketchfab numbers its bones
    side = ""
    for word, s in (("Left", "_l"), ("Right", "_r")):
        if n.startswith(word):
            n, side = n[len(word):], s
    m = re.fullmatch(r"Hand(Thumb|Index|Middle|Ring|Pinky)(\d)", n)
    if m:
        return f"{FINGERS[m.group(1)]}_0{m.group(2)}{'_leaf' if m.group(2) == '4' else ''}{side}"
    return NAMES[n] + side if n in NAMES else None


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


def hand_frame(at, side):
    """The hand as its joints show it: the way from the wrist to the middle finger's knuckle, the way from the little
    finger's knuckle to the first's (square to it), and the palm's side. `at` gives a joint by our bone name."""
    along = (at(f"middle_01_{side}") - at(f"hand_{side}")).normalized()
    across = at(f"index_01_{side}") - at(f"pinky_01_{side}")
    across = (across - along * across.dot(along)).normalized()
    return Matrix((along, across, along.cross(across))).transposed()


def align_arms(their, back, our, place):
    """Turns the model's forearms and hands, posing its own skeleton, so that they lie as ours do at rest (in our
    skeleton's space, which `place` takes the model's world into). Returns whether anything was turned."""
    to_ours = place @ their.matrix_world                         # their armature's space -> ours (turned, sized, moved)
    mine = lambda n: our.data.bones[n].head_local
    turned = False
    for side in ("l", "r"):
        need = [f"{b}_{side}" for b in ("lowerarm", "hand", "middle_01", "index_01", "pinky_01")]
        if not all(n in back for n in need):
            print(f"  arm {side}: a joint is missing, left as it came")
            continue
        theirs = lambda n: to_ours @ their.pose.bones[back[n]].head
        steps = ((f"upperarm_{side}", "upper arm"),) if "--upper" in sys.argv else ()
        for bone, how in steps + ((f"lowerarm_{side}", "forearm"), (f"hand_{side}", "hand")):
            pivot = theirs(bone)
            if how in ("forearm", "upper arm"):
                d = theirs(f"{'hand' if how == 'forearm' else 'lowerarm'}_{side}") - pivot
                q = d.rotation_difference(our.data.bones[bone].matrix_local.col[1].to_3d())
            else:
                q = (hand_frame(mine, side) @ hand_frame(theirs, side).inverted()).to_quaternion()
            deg = math.degrees(q.angle)
            print(f"  {how} {side}: {deg:.1f} deg from ours at rest; turned to lie as ours")
            if deg < 0.5:
                continue
            spin = Matrix.Translation(pivot) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pivot)
            pb = their.pose.bones[back[bone]]
            pb.matrix = to_ours.inverted() @ spin @ to_ours @ pb.matrix
            bpy.context.view_layer.update()
            turned = True
        d = theirs(f"hand_{side}") - theirs(f"lowerarm_{side}")
        rest = hand_frame(mine, side).inverted() @ hand_frame(theirs, side)
        print(f"  arm {side} now: forearm {math.degrees(d.angle(our.data.bones[f'lowerarm_{side}'].matrix_local.col[1].to_3d())):.1f} deg "
              f"from ours, hand {math.degrees(rest.to_quaternion().angle):.1f} deg")
    return turned


def main():
    model, base, out = args("--model"), args("--ours"), args("--out")
    if not (model and base and out):
        raise SystemExit("python3.11 scripts/art/onto_our_rig.py --model <mixamo model> --ours <a file with our skeleton> --out <file.glb> [--drop words]")
    drop = [w.lower() for w in (args("--drop") or "").split(",") if w]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    mine = load(base)
    our = next(o for o in mine if o.type == "ARMATURE")
    for o in mine:
        if o is not our:
            bpy.data.objects.remove(o)
    our.name = "Armature"

    theirs = load(model)
    their = next(o for o in theirs if o.type == "ARMATURE")
    skinned = [o for o in theirs if o.type == "MESH" and any(m.type == "ARMATURE" and m.object is their for m in o.modifiers)
               and not any(w in o.name.lower() for w in drop)]
    if their.animation_data:
        their.animation_data.action = None
    for pb in their.pose.bones:                                   # at rest: the pose its points were bound in
        pb.location, pb.scale = (0, 0, 0), (1, 1, 1)
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()

    known = {b.name for b in our.data.bones}
    pair = {b.name: ours_name(b.name) for b in their.data.bones}
    pair = {n: (o if o in known else None) for n, o in pair.items()}      # None: no partner among our bones
    lone = [n for n, o in pair.items() if o is None]
    back = {o: n for n, o in pair.items() if o is not None}
    unmatched = [b.name for b in our.data.bones if b.name not in back]
    at = lambda n: their.matrix_world @ their.pose.bones[n].head             # a joint of theirs, in the world (as posed: at rest until the arms are turned)

    # stood up: x to its left, z up, y to its back, as ours stands
    up = (at(back["Head"]) - at(back["pelvis"])).normalized()
    left = at(back["upperarm_l"]) - at(back["upperarm_r"])
    left = (left - up * left.dot(up)).normalized()
    turn = Matrix((left, up.cross(left), up)).to_4x4()            # rows: the world's axes seen from the model
    dg = bpy.context.evaluated_depsgraph_get()
    low, worst = 1e9, 0.0
    for o in skinned:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        for v, v0 in zip(me.vertices, o.data.vertices):
            low = min(low, (turn @ ev.matrix_world @ v.co).z)
            worst = max(worst, (ev.matrix_world @ v.co - o.matrix_world @ v0.co).length)
        ev.to_mesh_clear()
    hips = turn @ at(back["pelvis"])
    k = our.data.bones["pelvis"].head_local.z / (hips.z - low)    # its hips as high as ours
    place = Matrix.Translation((0, our.data.bones["pelvis"].head_local.y, 0)) @ Matrix.Scale(k, 4) @ Matrix.Translation((-hips.x, -hips.y, -low)) @ turn
    if worst > 1e-4:
        print(f"  careful: at rest its points sit up to {worst:.4f} from where the file has them")

    aligned = False if "--no-align" in sys.argv else align_arms(their, back, our, place)
    posed = {}                                                    # each point where the turned skeleton puts it (read while the mesh still hangs on it)
    if aligned:
        dg = bpy.context.evaluated_depsgraph_get()
        for o in skinned:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            posed[o.name] = [v.co.copy() for v in me.vertices]
            ev.to_mesh_clear()
            if len(posed[o.name]) != len(o.data.vertices):
                raise SystemExit(f"{o.name}: its modifiers change how many points it has; cannot make the turned arms its rest")

    # our skeleton, each joint moved to the model's own; the way a bone points at rest stays ours
    joint = {o: place @ at(n) for o, n in back.items()}
    was = {b.name: (b.head_local.copy(), (b.children[0].head_local.copy() if len(b.children) == 1 else None)) for b in our.data.bones}
    bpy.context.view_layer.objects.active = our
    our.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in our.data.edit_bones:
        eb.use_connect = False
    for eb in our.data.edit_bones:
        if eb.name in joint:
            eb.translate(joint[eb.name] - eb.head)
        if eb.name == "root":                                     # on the ground under the hips, as ours is
            eb.translate(Vector((0, 0, 0)) - eb.head)
    bpy.ops.object.mode_set(mode="OBJECT")

    # the meshes: stood and sized as one, then following our skeleton under our names
    tris = 0
    for o in skinned:
        world = o.matrix_world.copy()
        o.parent = None
        if aligned:                                               # the turned arms become its rest: each point where its skeleton put it
            for v, c in zip(o.data.vertices, posed[o.name]):
                v.co = c
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                o.modifiers.remove(m)
        o.data.transform(place @ world)
        o.matrix_world = Matrix.Identity(4)
        weights = {}
        for g in list(o.vertex_groups):
            to = pair.get(g.name)
            if to is None:                                        # a bone with no partner: its points follow its parent's partner
                b = their.data.bones.get(g.name)
                while b is not None and pair.get(b.name) is None:
                    b = b.parent
                to = pair[b.name] if b is not None else "pelvis"
                used = sum(1 for v in o.data.vertices for e in v.groups if e.group == g.index and e.weight > 1e-4)
                if used:
                    print(f"  {o.name}: {used} points followed {g.name}; they follow {to} now")
                for v in o.data.vertices:
                    for e in v.groups:
                        if e.group == g.index and e.weight > 0:
                            weights.setdefault(to, []).append((v.index, e.weight))
                o.vertex_groups.remove(g)
            else:
                g.name = to
        for to, pts in weights.items():
            g = o.vertex_groups.get(to) or o.vertex_groups.new(name=to)
            for i, w in pts:
                g.add([i], w, "ADD")
        o.parent = our
        o.modifiers.new("Armature", "ARMATURE").object = our
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    n_theirs = len(their.data.bones)
    for o in list(bpy.data.objects):
        if o is not our and o not in skinned:
            bpy.data.objects.remove(o)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    bpy.context.view_layer.update()

    # the report
    print(f"{os.path.basename(model)}: {n_theirs} bones, ours {len(our.data.bones)}; {len(back)} matched by name")
    print(f"  theirs without a partner: {', '.join(lone) or 'none'}")
    print(f"  ours without a partner: {', '.join(unmatched) or 'none'}")
    print(f"  meshes: {', '.join(f'{o.name} ({len(o.data.vertices)} points; ' + ', '.join(s.material.name for s in o.material_slots if s.material) + ')' for o in skinned)}; {tris} triangles")
    print(f"  stood up and made {k:.3f} times its size in the file: {max((o.matrix_world @ v.co).z for o in skinned for v in o.data.vertices):.3f} tall in a T, hips at {our.data.bones['pelvis'].head_local.z:.3f} as ours")
    print("  how far each limb's rest is from ours (the bone to its child, in degrees; under about 10 an animation fits as it is):")
    worst_limb = []
    for b in our.data.bones:
        head0, kid0 = was[b.name]
        if kid0 is None or b.name not in joint or len(b.children) != 1 or b.children[0].name not in joint:
            continue
        a, c = kid0 - head0, joint[b.children[0].name] - joint[b.name]
        if a.length < 1e-6 or c.length < 1e-6:
            continue
        worst_limb.append((math.degrees(a.angle(c)), b.name, c.length / a.length))
    for deg, name, ratio in sorted(worst_limb, reverse=True):
        if deg >= 10 or name.split("_")[0] in ("thigh", "calf", "upperarm", "lowerarm", "spine", "neck", "foot"):
            print(f"    {name}: {deg:5.1f} deg, {ratio:.2f} times as long")
    bpy.ops.object.select_all(action="DESELECT")
    our.select_set(True)
    for o in skinned:
        o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_animations=False, export_skins=True)
    print(f"wrote {out}")


def check():
    """--check <model on our skeleton> --ours <file>: how far its forearms and hands lie, at rest, from ours, in degrees.
    One line: ARMS {"l": {"forearm": .., "hand": ..}, "r": {..}}. The intake runs it for every race body."""
    model, base = args("--check"), args("--ours")
    if not (model and base):
        raise SystemExit("python3.11 scripts/art/onto_our_rig.py --check <model on our skeleton> --ours <a file with our skeleton>")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    found = []
    for path in (base, model):
        bpy.ops.object.select_all(action="DESELECT")
        arm = next(o for o in load(path) if o.type == "ARMATURE")
        bpy.context.view_layer.update()
        found.append(arm)
    our, their = found
    got = {}
    for side in ("l", "r"):
        need = [f"{b}_{side}" for b in ("lowerarm", "hand", "middle_01", "index_01", "pinky_01")]
        missing = [n for n in need if n not in their.data.bones]
        if missing:
            raise SystemExit(f"{model}: no bone {missing[0]}: is it on our skeleton? (onto_our_rig.py --model ... puts it there)")
        mine = lambda n: our.matrix_world @ our.data.bones[n].head_local
        theirs = lambda n: their.matrix_world @ their.data.bones[n].head_local
        way = (our.matrix_world.to_3x3() @ our.data.bones[f"lowerarm_{side}"].matrix_local.to_3x3()).col[1]
        fore = math.degrees((theirs(f"hand_{side}") - theirs(f"lowerarm_{side}")).angle(way))
        hand = math.degrees((hand_frame(mine, side).inverted() @ hand_frame(theirs, side)).to_quaternion().angle)
        got[side] = {"forearm": round(fore, 2), "hand": round(hand, 2)}
    print("ARMS " + json.dumps(got))


if __name__ == "__main__":
    check() if "--check" in sys.argv else main()
