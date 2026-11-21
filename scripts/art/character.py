# A character from 3D model files, rendered as the tileset is: the official camera and the official sun
# (scripts/art/blender_style.py, numbers from style.mjs), at the game's own pixel size. A still picture, or an animation's frames.
# Blender here is the Python module (scripts/art/setup_blender.sh installs it); run from the repo root:
#   python3.11 scripts/art/character.py --model base.gltf --model outfit.gltf --out scripts/art/out/character/peasant
#       --model   a .gltf, .glb, .fbx or .obj file; several are laid over each other as they are (a base and its outfit
#                 share one skeleton, so they fit). No mesh is changed: the whole is only sized, turned and stood on the ground.
#       --height  how tall it stands, in tiles (1 tile of height = 78.384 px), measured feet to the top of the head.
#                 Left out: the official character scale from style.mjs (96 px), and so is the head's size (--grow "Head=1.15")
#       --turn    degrees it is turned from facing the viewer (0 = straight down the screen; 45 a side further round)
#       --only    comma-separated words: of each file, keep only the objects whose name holds one of them
#       --hide    comma-separated words: leave out the objects whose name holds one of them
#       --keep    "mesh=bone+bone@0.5": of that mesh show only the points that follow those bones (a mask; the mesh stays whole)
#       --tint    "material=r,g,b": multiply that material's colour (0 to 1 each), for hair that comes grey to be dyed
#       --pose    "bone=x,y,z;bone=x,y,z": turns in degrees about each bone's own axes, given to every skeleton alike
#                 (a base, its outfit and its hair each bring their own, with the same bone names)
#       --grow    "Head=1.15": that bone and what hangs on it made bigger, on every skeleton alike (--height is still the whole's);
#                 --grow "" for the model's own head
#       --anim    an animation file with the same skeleton (the Universal Animation Library's .glb), --action its name
#                 (Idle_Loop, Walk_Loop, ...), --frames how many pictures over its loop (15, as the game's sheets). --pose is then
#                 left out. Writes <out>.00.*, <out>.01.*, ... and <out>.anim.json (where the feet are in every frame, for the slide check)
#       --no-fade the shadow at one alpha all over (the still sprites before the fade)
#       --list    print what the files hold (objects, sizes, materials, bones) and stop
#       --frame   the picture's side in pixels (256), --middle the tile's middle in it (128,208), --samples (64)
#   writes <out>.raw.png (the things and their shadow, as Blender made them), <out>.things.png and <out>.cast.png (the shadow
#   it casts; its red holds the alpha each pixel is to have, paling toward the tip),
#   and for the finishing step <out>.colour.png (each surface's own colour, unlit), <out>.ids.png and <out>.ids.json (which material where)
#   then: node scripts/art/finish_sprite.mjs <out>.things.png <out>.cast.png <out> --materials "MI_Peasant=cloth+hide+iron;MI_Hair_1=hair;..."
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_style import setup, render_with_shadow, style  # noqa: E402


def args(name, default=None, many=False):
    a = sys.argv
    got = [a[i + 1] for i in range(len(a) - 1) if a[i] == name]
    return got if many else (got[-1] if got else default)


def load(path):
    """Brings one model file in and returns the objects it added."""
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=path, disable_bone_shape=True)      # no ball drawn for each bone
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


def passes(scene, shots):
    """Two more pictures for the finishing step, which gives each material its own colour ramp:
    <out>.colour.png, every surface in its own colour with no light on it (what the model is painted with), and
    <out>.ids.png, every material in one flat colour, with <out>.ids.json saying which colour is which material.
    shots is a list of (out, go): go() puts the figure in that picture's pose (a frame of an animation).
    Changes the materials (each becomes a plain glow), so it comes last."""
    import json
    mats = sorted({s.material for o in scene.objects if o.type == "MESH" and not o.hide_render for s in o.material_slots if s.material}, key=lambda m: m.name)
    taps = {}
    for m in mats:
        m.use_nodes = True
        nt = m.node_tree
        outn = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        glow = nt.nodes.new("ShaderNodeEmission")
        base = bsdf.inputs["Base Color"] if bsdf else None
        if base is not None and base.links:
            nt.links.new(base.links[0].from_socket, glow.inputs["Color"])
        elif base is not None:
            glow.inputs["Color"].default_value = base.default_value
        nt.links.new(glow.outputs["Emission"], outn.inputs["Surface"])
        m.blend_method = "OPAQUE"
        taps[m] = (nt, glow)
    for o in scene.objects:
        if o.type == "LIGHT":
            o.data.energy = 0
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0
    for out, go in shots:
        go()
        scene.render.filepath = out + ".colour.png"
        bpy.ops.render.render(write_still=True)
    key = {}
    for k, m in enumerate(mats):
        nt, glow = taps[m]
        for link in list(glow.inputs["Color"].links):
            nt.links.remove(link)
        c = (40 + 60 * (k % 4), 40 + 60 * ((k // 4) % 4), 40 + 60 * ((k // 16) % 4))
        glow.inputs["Color"].default_value = (*[((v / 255 + 0.055) / 1.055) ** 2.4 for v in c], 1)   # so the picture holds c itself
        key[m.name.split(".")[0]] = key.get(m.name.split(".")[0], []) + [list(c)]
    scene.cycles.samples = 1
    scene.cycles.filter_width = 0.01                                  # one look through each pixel's middle: one material a pixel
    for out, go in shots:
        go()
        scene.render.filepath = out + ".ids.png"
        bpy.ops.render.render(write_still=True)
        with open(out + ".ids.json", "w") as f:
            json.dump(key, f, indent=1)


def animate(added, path, name):
    """Gives every skeleton the action `name` from the animation file (the Universal Animation Library: the same bones).
    Returns the action. The file's own figure is thrown away; a bone made bigger by --grow keeps its size."""
    mine = set(bpy.data.objects)
    load(path)
    for o in [o for o in bpy.data.objects if o not in mine]:
        bpy.data.objects.remove(o)
    found = [a for a in bpy.data.actions if a.name.split("_Armature")[0] == name]      # the file names them Walk_Loop_Armature
    if not found:
        raise SystemExit(f"no action named {name} in {path}; there are: " + ", ".join(sorted(a.name.split("_Armature")[0] for a in bpy.data.actions)))
    act = found[0]
    arms = [o for o in added if o.type == "ARMATURE"]
    grown = {pb.name: tuple(pb.scale) for o in arms for pb in o.pose.bones if tuple(round(v, 4) for v in pb.scale) != (1, 1, 1)}
    for fc in [fc for fc in act.fcurves if fc.data_path.endswith(".scale") and fc.data_path.split('"')[1] in grown]:
        act.fcurves.remove(fc)
    for o in arms:
        for pb in o.pose.bones:
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion, pb.location = (1, 0, 0, 0), (0, 0, 0)
            pb.scale = grown.get(pb.name, (1, 1, 1))
        o.animation_data_create()
        o.animation_data.action = act
    return act


def main():
    global SCALE
    SCALE = style()["character"]                 # the official character scale: its height in tiles, its head's size
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
    # --keep "SuperHero_Male=Head+neck_01@0.5": of that mesh, show only the points that follow those bones (by more than the
    # number after @). A mask laid over the mesh, which itself stays whole: for a body whose clothes would let it poke through.
    for part in (args("--keep") or "").split(";"):
        if not part.strip():
            continue
        name, rest = part.split("=")
        bones, _, least = rest.partition("@")
        bones = [b.strip() for b in bones.split("+")]
        for o in meshes:
            if o.name != name.strip():
                continue
            for b in bones[1:]:
                mix = o.modifiers.new("KeepMix", "VERTEX_WEIGHT_MIX")
                mix.vertex_group_a, mix.vertex_group_b = bones[0], b
                mix.mix_mode, mix.mix_set = "ADD", "OR"
            mask = o.modifiers.new("Keep", "MASK")
            mask.vertex_group = bones[0]
            mask.threshold = float(least or 0.5)
    # a pose: every skeleton that came in gets the same turns, bone by bone, so a base, its outfit and its hair move as one.
    # --pose "upperarm_l=0,0,-70;upperarm_r=0,0,70": degrees about each bone's own x, y, z. The meshes are not changed.
    anim = args("--anim")
    for part in ("" if anim else args("--pose") or "").split(";"):      # an animation brings its own pose
        if not part.strip():
            continue
        bone, turns = part.split("=")
        for o in added:
            if o.type == "ARMATURE" and bone.strip() in o.pose.bones:
                pb = o.pose.bones[bone.strip()]
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = [math.radians(float(v)) for v in turns.split(",")]
    # --grow "Head=1.15": that bone made bigger (and all that hangs on it), on every skeleton alike; the whole is sized after
    for part in (args("--grow") if args("--grow") is not None else f"Head={SCALE['head_scale']}").split(";"):
        if not part.strip():
            continue
        bone, k = part.split("=")
        for o in added:
            if o.type == "ARMATURE" and bone.strip() in o.pose.bones:
                o.pose.bones[bone.strip()].scale = (float(k),) * 3
    bpy.context.view_layer.update()
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

    for part in (args("--tint") or "").split(";"):
        if not part.strip():
            continue
        name, rgb = part.split("=")
        rgb = [float(v) for v in rgb.split(",")]
        for m in bpy.data.materials:
            if m.name.split(".")[0] != name.strip() or not m.use_nodes:
                continue
            nt = m.node_tree
            bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf is None:
                continue
            mul = nt.nodes.new("ShaderNodeMix")
            mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
            mul.inputs["Factor"].default_value = 1.0
            mul.inputs["B"].default_value = (*rgb, 1)
            base = bsdf.inputs["Base Color"]
            if base.links:
                nt.links.new(base.links[0].from_socket, mul.inputs["A"])
            else:
                mul.inputs["A"].default_value = base.default_value
            nt.links.new(mul.outputs["Result"], base)

    # one handle for the whole: everything that came in without a parent hangs on it, so nothing inside is touched
    root = bpy.data.objects.new("Character", None)
    scene.collection.objects.link(root)
    for o in added:
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    tall = float(args("--height", SCALE["height_tiles"]))
    k = tall / (hi.z - lo.z)
    turn = math.radians(45 + float(args("--turn", "0")))     # a model faces -Y; the viewer is down the screen, at +X -Y
    root.scale = (k, k, k)
    root.rotation_euler = (0, 0, turn)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    # a still stands on the middle of what it covers; an animated one keeps its skeleton's own middle there, in every frame
    root.location = (0, 0, -lo.z) if anim else (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    stands = hi.z - lo.z
    print(f"stands {stands:.3f} tiles tall ({stands * 78.384:.1f} px), {hi.x - lo.x:.3f} x {hi.y - lo.y:.3f} across, sized by {k:.4f}")

    frame = int(args("--frame", "256"))
    mid = tuple(int(v) for v in args("--middle", "128,208").split(","))
    setup(scene, frame, frame, mid, samples=int(args("--samples", "64")), light="official")
    out = args("--out", "scripts/art/out/character/character")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    fade = None if "--no-fade" in sys.argv else style()["blender"]["official"]["shadow_fade"]
    if not anim:
        render_with_shadow(scene, out + ".raw.png", shadow_out=out + ".cast.png", things_out=out + ".things.png", fade=fade, tall=stands)
        passes(scene, [(out, lambda: None)])
        print(f"wrote {out}.raw.png, {out}.things.png, {out}.cast.png, {out}.colour.png, {out}.ids.png, {out}.ids.json")
        return
    # an animation: --frames pictures spread evenly over the action's loop (the last, which is the first again, left out)
    import json
    act = animate(added, anim, args("--action", "Idle_Loop"))
    f0, f1 = act.frame_range
    n = int(args("--frames", "15"))
    at = [f0 + (f1 - f0) * i / n for i in range(n)]
    go = lambda f: scene.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
    arm = next(o for o in added if o.type == "ARMATURE")
    where = lambda b: [round(v, 5) for v in (arm.matrix_world @ arm.pose.bones[b].head)] if b in arm.pose.bones else None
    feet = ("foot_l", "ball_l", "foot_r", "ball_r", "pelvis", "root")
    # where the feet are, in tiles (X down-right on the screen, Y up-right, Z up): in every frame of the file, and in the pictures' frames
    fine = []
    for f in range(int(round(f0)), int(round(f1)) + 1):
        go(f)
        bpy.context.view_layer.update()
        fine.append({"frame": f, **{b: where(b) for b in feet}})
    shots = []
    for i, f in enumerate(at):
        base = f"{out}.{i:02d}"
        go(f)
        bpy.context.view_layer.update()
        render_with_shadow(scene, base + ".raw.png", shadow_out=base + ".cast.png", things_out=base + ".things.png", fade=fade, tall=stands)
        shots.append((base, (lambda f=f: go(f))))
        print(f"frame {i:02d} (the file's {f:.2f})", flush=True)
    with open(out + ".anim.json", "w") as fh:
        json.dump({"action": act.name, "file_fps": scene.render.fps, "file_frames": [f0, f1], "pictures": n, "picture_frames": at,
                   "turn_deg": float(args("--turn", "0")), "stands_tiles": stands, "sized_by": k, "feet": fine}, fh, indent=1)
    passes(scene, shots)
    print(f"wrote {n} frames: {out}.00 to {out}.{n - 1:02d} (.raw, .things, .cast, .colour, .ids), and {out}.anim.json")


if __name__ == "__main__":
    main()
