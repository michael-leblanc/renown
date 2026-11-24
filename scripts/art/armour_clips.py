# How far worn rigid armour goes into the body (and into each other) through animations: for each piece, in each of
# N pictures of each action, how many of its faces cross the body's, and around which bones the crossings are.
#   python3.11 scripts/art/armour_clips.py --body orc_model_1/orc_ours.glb --pieces "chest=orc_armour/ochest_orc.glb;..."
#        --anims "idle=ual1/UAL1_Standard.glb:Idle_Loop;swing=ual2/UAL2_Standard.glb:Sword_Regular_A+Sword_Regular_A_Rec" [--n 15]
#        [--assets /mnt/project-files/characters/models]
# A piece's meshes are every mesh in its file; the body's, every mesh of its file. Prints one line per piece and action.
import os
import sys

import bpy  # noqa: first
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
opt = lambda n, d=None: A[A.index(n) + 1] if n in A else d
ASSETS = opt("--assets", "/mnt/project-files/characters/models"); N = int(opt("--n", "15"))
bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


body = load(f"{ASSETS}/{opt('--body')}")
pieces = {k: load(v if v.startswith("/") else f"{ASSETS}/{v}") for k, v in (p.split("=") for p in opt("--pieces").split(";"))}
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
bmesh_of = lambda obs: [o for o in obs if o.type == "MESH" and o.find_armature() is not None]   # not a bone's display shape
main = next(o for o in body if o.type == "ARMATURE")


def tree(o, dg):
    me = o.evaluated_get(dg).to_mesh()
    pts = [o.matrix_world @ v.co for v in me.vertices]
    t = BVHTree.FromPolygons(pts, [p.vertices[:] for p in me.polygons]); cs = [sum((pts[i] for i in p.vertices), pts[0] * 0) / len(p.vertices) for p in me.polygons]
    o.evaluated_get(dg).to_mesh_clear(); return t, cs


for spec in opt("--anims").split(";"):
    if spec == "rest":   # at rest, no action: what the fit itself left inside
        name, f, acts = "rest", None, ""
    else:
        name, rest = spec.split("="); f, acts = rest.split(":")
    if f:
        load(f"{ASSETS}/{f}")
    for o in [o for o in bpy.data.objects if o not in body and all(o not in v for v in pieces.values())]:
        bpy.data.objects.remove(o)
    frames = [] if acts else [(None, 0)]
    for act_name in [a for a in acts.split("+") if a]:
        act = next(a for a in bpy.data.actions if a.name.split("_Armature")[0] == act_name)
        f0, f1 = act.frame_range; k = max(1, round(N / len(acts.split("+"))))
        frames += [(act, f0 + (f1 - f0) * i / k) for i in range(k)]
    worst = {}
    for act, fr in frames:
        for a in arms:
            a.animation_data_create(); a.animation_data.action = act
            for pb in a.pose.bones:
                pb.rotation_mode = "QUATERNION"
                if act is None:
                    pb.rotation_quaternion, pb.location = (1, 0, 0, 0), (0, 0, 0)
        bpy.context.scene.frame_set(int(fr), subframe=fr - int(fr)); bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        bt = [tree(o, dg) for o in bmesh_of(body)]
        pt = {k: [tree(o, dg) for o in bmesh_of(v)] for k, v in pieces.items()}
        if os.environ.get('DEBUG'):
            for k, ts in list(pt.items()) + [('body', bt)]:
                for t, cs in ts:
                    print('DBG', k, len(cs), tuple(round(min(c[i] for c in cs), 2) for i in range(3)), tuple(round(max(c[i] for c in cs), 2) for i in range(3)))
        for k, ts in pt.items():
            n, zs = 0, []
            for t, cs in ts:
                for b, _ in bt:
                    pairs = t.overlap(b); n += len(pairs); zs += [cs[i] for i, _ in pairs]
            others = {j: sum(len(t.overlap(u)) for t, _ in ts for u, _ in us) for j, us in pt.items() if j != k}
            # where: the bone nearest the middle of the crossings
            where = ""
            if zs:
                m = sum(zs, zs[0] * 0) / len(zs); inv = main.matrix_world.inverted()
                bone = min(main.pose.bones, key=lambda pb: ((main.matrix_world @ pb.head) - m).length)
                where = bone.name
            w = worst.setdefault(k, [0, 0, "", {}]); w[0] = max(w[0], n); w[1] += 1 if n else 0
            if n == w[0] and n: w[2] = where
            for j, c in others.items(): w[3][j] = max(w[3].get(j, 0), c)
    for k, (most, nbad, where, oth) in worst.items():
        print(f"{name:6} {k:12} into the body in {nbad} of {len(frames)} pictures, at most {most} face crossings" + (f" (near {where})" if where else "") + "; " + ", ".join(f"into {j}: at most {c}" for j, c in oth.items()))
os._exit(0)
