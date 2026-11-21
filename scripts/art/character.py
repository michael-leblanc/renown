# A character from 3D model files, rendered as the tileset is: the official camera and the official sun
# (scripts/art/blender_style.py, numbers from style.mjs), at the game's own pixel size. A still picture, no animation.
# Blender here is the Python module (scripts/art/setup_blender.sh installs it); run from the repo root:
#   python3.11 scripts/art/character.py --model base.gltf --model outfit.gltf --height 1.072 --out scripts/art/out/character/peasant
#       --model   a .gltf, .glb, .fbx or .obj file; several are laid over each other as they are (a base and its outfit
#                 share one skeleton, so they fit). No mesh is changed: the whole is only sized, turned and stood on the ground.
#       --height  how tall it stands, in tiles (1 tile of height = 78.384 px), measured feet to the top of the head
#       --turn    degrees it is turned from facing the viewer (0 = straight down the screen; 45 a side further round)
#       --only    comma-separated words: of each file, keep only the objects whose name holds one of them
#       --hide    comma-separated words: leave out the objects whose name holds one of them
#       --list    print what the files hold (objects, sizes, materials, bones) and stop
#       --frame   the picture's side in pixels (256), --middle the tile's middle in it (128,208), --samples (64)
#   writes <out>.raw.png (the things and their shadow, as Blender made them), <out>.things.png and <out>.shadow.png
#   then: node scripts/art/finish_sprite.mjs <out>.things.png <out>.shadow.png <out>
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_style import setup, render_with_shadow  # noqa: E402


def args(name, default=None, many=False):
    a = sys.argv
    got = [a[i + 1] for i in range(len(a) - 1) if a[i] == name]
    return got if many else (got[-1] if got else default)


def load(path):
    """Brings one model file in and returns the objects it added."""
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f"cannot read {path}: a .gltf, .glb, .fbx or .obj file is needed")
    return [o for o in bpy.data.objects if o not in before]


def bounds(meshes):
    """The box round the meshes as they stand (skeleton and all), in the world: (lowest corner, highest corner)."""
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        for v in me.vertices:
            w = ev.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
        ev.to_mesh_clear()
    return lo, hi


def main():
    models = args("--model", many=True)
    if not models:
        raise SystemExit(__doc__ or "python3.11 scripts/art/character.py --model <file> --height <tiles> --out <base>")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    only = [w.lower() for w in (args("--only") or "").split(",") if w]
    hide = [w.lower() for w in (args("--hide") or "").split(",") if w]
    added = []
    for m in models:
        obs = load(m)
        for o in obs:
            n = o.name.lower()
            if o.type == "MESH" and ((only and not any(w in n for w in only)) or any(w in n for w in hide)):
                o.hide_render = True
                o.hide_set(True)
        added += obs
        print(f"{os.path.basename(m)}: {len(obs)} objects")
    meshes = [o for o in added if o.type == "MESH" and not o.hide_render]
    if "--list" in sys.argv:
        for o in added:
            if o.type == "MESH":
                lo, hi = bounds([o])
                mats = ", ".join(s.material.name for s in o.material_slots if s.material)
                print(f"  mesh {o.name}{' (left out)' if o.hide_render else ''}: {len(o.data.vertices)} points, "
                      f"{hi.x - lo.x:.3f} x {hi.y - lo.y:.3f} x {hi.z - lo.z:.3f}, foot at z {lo.z:.3f}, parent {o.parent.name if o.parent else '-'}; {mats}")
            elif o.type == "ARMATURE":
                print(f"  skeleton {o.name}: {len(o.data.bones)} bones; {', '.join(b.name for b in o.data.bones[:12])} ...")
                print(f"    actions: {', '.join(a.name for a in bpy.data.actions) or 'none'}")
            else:
                print(f"  {o.type.lower()} {o.name}")
        return

    # one handle for the whole: everything that came in without a parent hangs on it, so nothing inside is touched
    root = bpy.data.objects.new("Character", None)
    scene.collection.objects.link(root)
    for o in added:
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    tall = float(args("--height", "1.072"))
    k = tall / (hi.z - lo.z)
    turn = math.radians(45 + float(args("--turn", "0")))     # a model faces -Y; the viewer is down the screen, at +X -Y
    root.scale = (k, k, k)
    root.rotation_euler = (0, 0, turn)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    print(f"stands {hi.z - lo.z:.3f} tiles tall ({(hi.z - lo.z) * 78.384:.1f} px), {hi.x - lo.x:.3f} x {hi.y - lo.y:.3f} across, sized by {k:.4f}")

    frame = int(args("--frame", "256"))
    mid = tuple(int(v) for v in args("--middle", "128,208").split(","))
    setup(scene, frame, frame, mid, samples=int(args("--samples", "64")), light="official")
    out = args("--out", "scripts/art/out/character/character")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    render_with_shadow(scene, out + ".raw.png", shadow_out=out + ".shadow.png", things_out=out + ".things.png")
    print(f"wrote {out}.raw.png, {out}.things.png, {out}.shadow.png")


if __name__ == "__main__":
    main()
