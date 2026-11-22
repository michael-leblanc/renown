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
#       --curl    with --anim: "index=15,20,12;middle=20,25,15;thumb=8,10,8": open, loosely bent fingers in place of the action's
#                 (degrees at each finger's three joints, toward the palm, both hands)
#       --rest    with --anim: "bone=x,y,z;...": that bone's own turn from its rest, in place of the action's (names may hold * and ?)
#       --add     with --anim: "bone=x,y,z;...": a turn laid on top of the action, in the figure's own space (x: across it, its left
#                 at +x; y: front to back, its front at -y; z: up), about the bone's own joint. For a stance, a chest, a head.
#       --shift   with --anim: "pelvis=0,0,0.03": the bone moved, in the figure's own space and the model's own units
#       --stand   with --anim: "width=0.22,stagger=0.04,out=8": both feet set flat on the ground under the hips, the ankles that far
#                 apart (0.18 at rest), the left that far ahead, each turned out that many degrees; the legs bend to reach them
#                 With any of these but --curl the figure is stood on the ground again (its lowest point over the loop)
#       --ground  with --anim: no foot goes under the ground. The library's animations were made for a human's feet; on a model
#                 with bigger feet (a goblin's boots) the toes and heels dip under in a walk. In each picture, a foot whose lowest
#                 point is under the ground has its ankle lifted by just that much: the leg bends at the knee and hip (Blender's
#                 own solver), the foot keeps its turn. A foot above the ground is left as it is. Prints the most it lifted.
#                 --ground-list prints it for every picture. (<out>.anim.json still holds the feet as the action has them.)
#       --no-fade the shadow at one alpha all over (the still sprites before the fade)
#   a character in layers (with --anim), for clothes, hair and gear that can be swapped:
#       --part    "top=Male_Peasant_Body+Male_Peasant_Arms" (as often as needed): a name for one or more meshes
#       --gear    "sword=hand_r;shield=lowerarm_l": stand-in gear made in code (standin_gear.py), each hung on that bone; each is a part
#       --hold    '{"name": "arming_sword", "file": "Sword.gltf", "bone": "hand_r", "unit_tiles": 0.65}' (as often as needed):
#                 a held thing from its own model file, put in that hand and sized; it is a part. How it finds the handle,
#                 and what else the JSON may say (handle, grip, lean, flip, how, scale): held_gear.py
#       --view    "name=part+part" (as often as needed): a set of pictures with only those parts in it, <out>.<name>.NN.*
#                 "name=part|part+part": the parts after the bar are not seen but shade the ones before it: a part is lit
#                 as it is on a dressed body, not as if it hung in the air. Its shadow on the ground is still its own
#                 Every view also gets <out>.<name>.NN.depth.png: how far each pixel's surface is from the camera, in 65536 steps
#                 over 8 tiles (red the high byte, green the low), which is what lets layers be laid over each other rightly
#       --point   the light too is read at each pixel's middle, as the materials are, with the same number of looks for every
#                 pixel and Blender's smoothing of the picture off: a pixel is one point of one surface, and it comes out
#                 the same whatever else is in the picture
#       --sized-by 0.6516  the size pinned (an earlier run's "sized by"), so every part is sized alike whatever is loaded
#       --take    "0-4": only those pictures of the loop (to render a loop in several goes at once)
#       --quick   the same pictures, about 30 times sooner: the scene and its textures stay loaded from one picture to the
#                 next, and each picture renders only the box round the part it shows (or round its shadow)
#       --seed 7  a trial: other dice for the light (two runs that differ only in this show how much of a picture is chance)
#       --mask    "G_MatUp=skin_mask.png" (as often as needed): small things that are painted into that material's texture and
#                 have no material of their own (eyes, fangs, claws), so the finishing can give them ramps of their own.
#                 The mask is a picture laid over the texture (the same UVs): black where the material is itself, one flat
#                 colour for each small thing; skin_mask.json beside it names them: {"eyes": [255, 200, 0], "bone": [255, 255, 255]}.
#                 The ids then also hold "G_MatUp:eyes" and "G_MatUp:bone", and <out>.ids4.png is the ids picture 4 times as
#                 fine: finish_sprite.mjs gives a pixel to a small thing that covers a quarter of it, so an eye one pixel
#                 wide is never lost between two pixels. No mesh and no texture is changed.
#       --exact-ids  the ids picture (which material where) without Blender's smoothing. Smoothed, a material's flat colour is
#                 darkened along the figure's edge, and with few materials an edge pixel can then be read as the wrong one
#                 (a model with two materials got its clothes' brown on its ear tips). Off unless asked, so no earlier picture changes
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
from blender_style import setup, render_with_shadow, region, style  # noqa: E402


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


def passes(scene, shots, depth=False, exact=False, masks=None):
    """Two more pictures for the finishing step, which gives each material its own colour ramp:
    <out>.colour.png, every surface in its own colour with no light on it (what the model is painted with), and
    <out>.ids.png, every material in one flat colour, with <out>.ids.json saying which colour is which material.
    shots is a list of (out, go): go() puts the figure in that picture's pose (a frame of an animation).
    depth: also <out>.depth.png, how far from the camera (see --view). exact: the ids picture without Blender's smoothing (--exact-ids).
    masks: { material: (image, { thing: [r, g, b] }) } from --mask; then also <out>.ids4.png, the ids picture 4 times as fine.
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
    key, k = {}, 0
    flat = lambda c: (*[((v / 255 + 0.055) / 1.055) ** 2.4 for v in c], 1)                       # so the picture holds c itself
    for m in mats:
        nt, glow = taps[m]
        for link in list(glow.inputs["Color"].links):
            nt.links.remove(link)
        c = (40 + 60 * (k % 4), 40 + 60 * ((k // 4) % 4), 40 + 60 * ((k // 16) % 4))
        k += 1
        name = m.name.split(".")[0]
        glow.inputs["Color"].default_value = flat(c)
        key[name] = key.get(name, []) + [list(c)]
        if name not in (masks or {}):
            continue
        # --mask: small things painted into this material's texture (eyes, fangs) get ids of their own, "material:name".
        # The mask picture lies over the texture; where it holds a small thing's colour, that thing's id takes the material's place.
        image, things = masks[name]
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image, tex.interpolation = image, "Closest"
        now = nt.nodes.new("ShaderNodeRGB")
        now.outputs[0].default_value = flat(c)
        now = now.outputs[0]
        for thing, rgb in things.items():
            c = (40 + 60 * (k % 4), 40 + 60 * ((k // 4) % 4), 40 + 60 * ((k // 16) % 4))
            k += 1
            far = nt.nodes.new("ShaderNodeVectorMath")
            far.operation = "DISTANCE"
            nt.links.new(tex.outputs["Color"], far.inputs[0])
            far.inputs[1].default_value = [v / 255 for v in rgb]
            near = nt.nodes.new("ShaderNodeMath")
            near.operation = "LESS_THAN"
            nt.links.new(far.outputs["Value"], near.inputs[0])
            near.inputs[1].default_value = 0.2
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            nt.links.new(near.outputs[0], mix.inputs[0])              # the colour mix's own sockets: factor 0, A 6, B 7, result 2
            nt.links.new(now, mix.inputs[6])
            mix.inputs[7].default_value = flat(c)
            now = mix.outputs[2]
            key[f"{name}:{thing}"] = key.get(f"{name}:{thing}", []) + [list(c)]
        nt.links.new(now, glow.inputs["Color"])
    scene.cycles.samples = 1
    scene.cycles.filter_width = 0.01                                  # one look through each pixel's middle: one material a pixel
    if depth or exact or masks:
        scene.cycles.use_denoising = False                            # a view's pictures are exact: no smoothing over the flat colours
    for out, go in shots:
        go()
        scene.render.filepath = out + ".ids.png"
        bpy.ops.render.render(write_still=True)
        with open(out + ".ids.json", "w") as f:
            json.dump(key, f, indent=1)
        if masks:                                                     # the same 4 times as fine: 16 looks a pixel, so a thing smaller than a pixel is not missed
            scene.render.resolution_percentage = 400
            scene.render.filepath = out + ".ids4.png"
            bpy.ops.render.render(write_still=True)
            scene.render.resolution_percentage = 100
    if not depth:
        return
    # how far: the camera's own depth, from DEPTH[0] to DEPTH[1] tiles, cut into 65536 steps; the picture's red holds the
    # high byte and its green the low one. Written as the numbers are (no colour curve, no dither).
    scene.view_settings.view_transform = "Raw"
    scene.render.dither_intensity = 0
    for m in mats:
        nt, glow = taps[m]
        cam = nt.nodes.new("ShaderNodeCameraData")

        def math_node(op, a, b=None):
            n = nt.nodes.new("ShaderNodeMath")
            n.operation = op
            for socket, v in zip(n.inputs, (a, b)):
                if v is None:
                    continue
                if isinstance(v, (int, float)):
                    socket.default_value = v
                else:
                    nt.links.new(v, socket)
            return n.outputs[0]
        steps = math_node("MULTIPLY", math_node("SUBTRACT", cam.outputs["View Z Depth"], DEPTH[0]), 65535 / (DEPTH[1] - DEPTH[0]))
        high = math_node("FLOOR", math_node("DIVIDE", steps, 256))
        low = math_node("FLOOR", math_node("SUBTRACT", steps, math_node("MULTIPLY", high, 256)))
        both = nt.nodes.new("ShaderNodeCombineColor")
        nt.links.new(math_node("DIVIDE", high, 255), both.inputs[0])
        nt.links.new(math_node("DIVIDE", low, 255), both.inputs[1])
        nt.links.new(both.outputs[0], glow.inputs["Color"])
    for out, go in shots:
        go()
        scene.render.filepath = out + ".depth.png"
        bpy.ops.render.render(write_still=True)


DEPTH = (46.0, 54.0)      # the camera stands 50 tiles from the tile's middle: what is drawn lies well inside 46 to 54


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


FINGERS = ("index", "middle", "ring", "pinky", "thumb")


def pairs(text):
    """ "a=1,2,3;b=4,5,6" -> [("a", [1.0, 2.0, 3.0]), ...] """
    return [(k.strip(), [float(v) for v in vals.split(",")]) for k, vals in (p.split("=") for p in (text or "").split(";") if p.strip())]


def curl_turns(arm, spec):
    """Open, loosely curled fingers: for each finger named in spec ("index=15,20,12;thumb=8,10,8", degrees at its three
    joints, both hands), the turn of each joint about its own axes that bends it toward the palm. Worked out from the
    skeleton at rest: the palm's side is found from where the fingers and the thumb sit, so no axis is guessed."""
    from mathutils import Quaternion
    turns = {}
    bones = arm.data.bones
    for side in ("l", "r"):
        if f"middle_01_{side}" not in bones:
            continue
        along = (bones[f"middle_02_{side}"].head_local - bones[f"middle_01_{side}"].head_local).normalized()
        across = (bones[f"index_01_{side}"].head_local - bones[f"pinky_01_{side}"].head_local).normalized()
        palm = along.cross(across).normalized()
        thumb = bones[f"thumb_02_{side}"].head_local - bones[f"middle_01_{side}"].head_local
        if palm.dot(thumb) < 0:                                        # the thumb hangs on the palm's side of the hand
            palm = -palm
        for finger, degs in spec:
            for joint, deg in zip(("01", "02", "03"), degs):
                b = bones.get(f"{finger}_{joint}_{side}")
                if b is None:
                    continue
                kid = b.children[0].head_local if b.children else b.tail_local
                d = (kid - b.head_local).normalized()
                to = palm if finger != "thumb" else (bones[f"index_01_{side}"].head_local - b.head_local).normalized()
                axis = d.cross(to - d * to.dot(d))
                if axis.length < 1e-6:
                    continue
                local = b.matrix_local.to_3x3().inverted() @ axis.normalized()
                turns[b.name] = Quaternion(local, math.radians(deg))
    return turns


def plant_feet(arms, spec, middle):
    """Both feet set flat on the ground where spec says, whatever the action does with the legs: "width=0.22,stagger=0.04,out=8"
    is the ankles that far apart (the model's own units; 0.18 at rest), the left foot that far ahead of the right, each foot
    turned out that many degrees (outl, outr for one foot). middle is where the hips are on average over the loop (x, y):
    the feet go under it. Each leg is then bent to reach its foot (Blender's own solver), on every skeleton alike."""
    from mathutils import Matrix, Vector
    w, st, out = spec.get("width", 0.18), spec.get("stagger", 0.0), spec.get("out", 0.0)
    made = []
    for o in arms:
        b = o.data.bones
        if "foot_l" not in b:
            continue
        ankle = b["foot_l"].head_local
        dy = ankle.y - b["pelvis"].head_local.y
        for side, sx, sy, turn in (("l", 1, -1, spec.get("outl", out)), ("r", -1, 1, -spec.get("outr", out))):
            e = bpy.data.objects.new(f"Foot_{side}_{o.name}", None)
            bpy.context.scene.collection.objects.link(e)
            e.parent = o
            rot = Matrix.Rotation(math.radians(turn), 4, "Z") @ b[f"foot_{side}"].matrix_local.to_3x3().to_4x4()
            e.matrix_local = Matrix.Translation(Vector((middle[0] + sx * w / 2, middle[1] + dy + sy * st / 2, ankle.z))) @ rot
            ik = o.pose.bones[f"foot_{side}"].constraints.new("IK")
            ik.target, ik.chain_count, ik.use_tail = e, 3, False     # thigh and calf bend so the ankle is on the mark
            cp = o.pose.bones[f"foot_{side}"].constraints.new("COPY_ROTATION")
            cp.target = e                                           # and the sole stays flat, the toes where asked
            made += [ik, cp]
    return made


def ground_feet(arms, meshes):
    """For --ground. Returns lift(on, known=None): with on False the feet are as the action has them; with on True each
    foot whose lowest point is under the ground has its ankle lifted by that much (known: {side: how much}, measured
    earlier, when a part of the figure is hidden and cannot be measured now). Gives back what it lifted, per side."""
    from mathutils import Matrix
    FOOT = ("foot_{}", "ball_{}", "ball_leaf_{}")
    points, made = {"l": [], "r": []}, {"l": [], "r": []}
    for o in meshes:                                               # a foot's points: those that mostly follow the foot or the toes
        for side in "lr":
            idx = {g.index for g in o.vertex_groups if g.name in [n.format(side) for n in FOOT]}
            pts = [v.index for v in o.data.vertices if sum(e.weight for e in v.groups if e.group in idx) >= 0.5]
            if pts:
                points[side].append((o, pts))
    for o in arms:
        for side in "lr":
            pb = o.pose.bones.get(f"foot_{side}")
            if pb is None:
                continue
            e = bpy.data.objects.new(f"Ground_{side}_{o.name}", None)
            bpy.context.scene.collection.objects.link(e)
            ik = pb.constraints.new("IK")
            ik.target, ik.chain_count, ik.use_tail = e, 2, False     # the calf and the thigh bend (2: the foot itself is not
            cp = pb.constraints.new("COPY_ROTATION")                # counted without its tail; 3 would turn the hips too)
            cp.target = e                                           # and the foot keeps the turn the action gave it
            made[side].append((o, pb, e, ik, cp))

    def lift(on, known=None):
        for side in "lr":
            for o, pb, e, ik, cp in made[side]:
                ik.influence = cp.influence = 0.0
        bpy.context.view_layer.update()
        if not on:
            return {}
        by = dict(known or {})
        if known is None:
            dg = bpy.context.evaluated_depsgraph_get()
            for side in "lr":
                low = 0.0
                for o, pts in points[side]:
                    ev = o.evaluated_get(dg)
                    me = ev.to_mesh()
                    low = min(low, min((ev.matrix_world @ me.vertices[i].co).z for i in pts))
                    ev.to_mesh_clear()
                by[side] = -low
        for side in "lr":
            if by.get(side, 0) > 1e-6:
                for o, pb, e, ik, cp in made[side]:
                    e.matrix_world = Matrix.Translation((0, 0, by[side])) @ o.matrix_world @ pb.matrix
                    ik.influence = cp.influence = 1.0
        bpy.context.view_layer.update()
        return by
    return lift


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
    # --mask "G_MatUp=masks/skin.png": small things painted into that material's texture, to be finished with ramps of their own
    masks = {}
    for spec in args("--mask", many=True):
        import json
        name, path = spec.split("=", 1)
        image = bpy.data.images.load(os.path.abspath(path))
        image.colorspace_settings.name = "Non-Color"
        with open(os.path.splitext(path)[0] + ".json") as f:
            masks[name.strip()] = (image, json.load(f))
    parts = {}
    for spec in args("--part", many=True):
        name, obs = spec.split("=")
        missing = [n for n in obs.split("+") if n not in bpy.data.objects]
        if missing:
            raise SystemExit(f"--part {name}: no object named {', '.join(missing)}; there are: " + ", ".join(o.name for o in meshes))
        parts[name.strip()] = [bpy.data.objects[n] for n in obs.split("+")]
    gear = []
    for name, bone in [g.split("=") for g in (args("--gear") or "").split(";") if g.strip()]:
        from standin_gear import make
        ob = make(name.strip(), next(o for o in added if o.type == "ARMATURE"), bone.strip())
        parts[name.strip()] = [ob]
        gear.append(ob)
    holds = []
    for spec in args("--hold", many=True):                           # a held thing from its own model file (held_gear.py)
        import json
        from held_gear import hold
        spec = json.loads(spec)
        ob = hold(load(spec["file"]), next(o for o in added if o.type == "ARMATURE"), spec["bone"], spec)
        parts[spec["name"]] = [ob]
        gear.append(ob)
        holds.append((ob, spec))
    added += gear                                                    # they follow the skeleton; they are not measured for the size
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
            if any("*" in b or "?" in b for b in bones):               # spine_* and the like: every group of the mesh so named
                from fnmatch import fnmatch
                bones = [g.name for g in o.vertex_groups if any(fnmatch(g.name, b) for b in bones)]
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
    k = float(args("--sized-by")) if args("--sized-by") else tall / (hi.z - lo.z)
    turn = math.radians(45 + float(args("--turn", "0")))     # a model faces -Y; the viewer is down the screen, at +X -Y
    root.scale = (k, k, k)
    root.rotation_euler = (0, 0, turn)
    bpy.context.view_layer.update()
    for ob, spec in holds:                                           # a held thing's size is its own, whatever the figure's
        from held_gear import size
        size(ob, ob.parent, spec)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    # a still stands on the middle of what it covers; an animated one keeps its skeleton's own middle there, in every frame
    root.location = (0, 0, -lo.z) if anim else (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    stands = tall if args("--sized-by") else hi.z - lo.z
    print(f"stands {stands:.3f} tiles tall ({stands * 78.384:.1f} px), {hi.x - lo.x:.3f} x {hi.y - lo.y:.3f} across, sized by {k:.4f}")

    frame = int(args("--frame", "256"))
    mid = tuple(int(v) for v in args("--middle", "128,208").split(","))
    setup(scene, frame, frame, mid, samples=int(args("--samples", "64")), light="official")
    if args("--seed"):                                # a trial: the same picture with other dice (how much is chance)
        scene.cycles.seed = int(args("--seed"))
    quick = "--quick" in sys.argv
    if quick:
        scene.render.use_persistent_data = True       # the textures and the scene stay loaded from one picture to the next
    if "--point" in sys.argv:
        scene.cycles.filter_width = 0.01
        scene.cycles.use_denoising = False       # Blender's own smoothing mixes a pixel with its neighbours: with it a part would look different beside another
        scene.cycles.use_adaptive_sampling = False   # and its early stop looks at the neighbours too
    out = args("--out", "scripts/art/out/character/character")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    fade = None if "--no-fade" in sys.argv else style()["blender"]["official"]["shadow_fade"]
    if not anim:
        render_with_shadow(scene, out + ".raw.png", shadow_out=out + ".cast.png", things_out=out + ".things.png", fade=fade, tall=stands)
        passes(scene, [(out, lambda: None)], exact="--exact-ids" in sys.argv, masks=masks)
        print(f"wrote {out}.raw.png, {out}.things.png, {out}.cast.png, {out}.colour.png, {out}.ids.png, {out}.ids.json")
        return
    # an animation: --frames pictures spread evenly over the action's loop (the last, which is the first again, left out)
    import json
    act = animate(added, anim, args("--action", "Idle_Loop"))
    f0, f1 = act.frame_range
    n = int(args("--frames", "15"))
    at = [f0 + (f1 - f0) * i / n for i in range(n)]
    take = range(n)
    if args("--take"):
        a, _, b = args("--take").partition("-")
        take = range(int(a), int(b or a) + 1)
    arms = [o for o in added if o.type == "ARMATURE"]
    arm = arms[0]
    rests, adds, shifts = pairs(args("--rest")), pairs(args("--add")), pairs(args("--shift"))
    curls = curl_turns(arm, pairs(args("--curl")))
    stand = {k: v[0] for k, v in pairs((args("--stand") or "").replace(",", ";"))}
    if stand:
        rests += [("thigh_?", [0, 0, 0]), ("calf_?", [0, 0, 0])]       # the legs start straight, knees to the front; the solver bends them
    changed = bool(rests or adds or shifts or curls or stand)
    lift = ground_feet(arms, meshes) if "--ground" in sys.argv else None
    lifted = None                                                      # --ground: {frame: {side: how much}}, once it is measured

    def go(f):
        """The figure as the action has it at frame f, with what was asked laid over it; then, with --ground, its feet
        kept on the ground (as measured for that frame, with the whole figure there)."""
        if lift:
            lift(False)
        pose(f)
        if lift and lifted is not None:
            bpy.context.view_layer.update()
            lift(True, lifted.get(f))

    def pose(f):
        """The figure as the action has it at frame f; then, if asked, the changes laid over it: the action is read, let
        go of, and the bones set by hand (a render would otherwise put the action's pose back)."""
        from fnmatch import fnmatch
        from mathutils import Euler, Matrix
        for o in arms:
            o.animation_data.action = act
        scene.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
        if not changed:
            return
        bpy.context.view_layer.update()
        for o in arms:
            was = {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for pb in o.pose.bones}
            o.animation_data.action = None
            for pb in o.pose.bones:
                pb.location, pb.rotation_quaternion, pb.scale = was[pb.name]
                if pb.name in curls:                                   # --curl: the fingers' own bend, in place of the action's
                    pb.rotation_quaternion = curls[pb.name]
                for pat, deg in rests:                                 # --rest: the bone's own turn from its rest, in place of the action's
                    if fnmatch(pb.name, pat):
                        pb.rotation_quaternion = Euler([math.radians(v) for v in deg], "XYZ").to_quaternion()
        bpy.context.view_layer.update()
        for o in arms:                                                 # --add: a turn in the figure's own space, on top; parents first
            for b in o.data.bones:
                for pat, by in shifts:                                 # --shift: the bone moved, in the figure's own space and units
                    if fnmatch(b.name, pat):
                        pb = o.pose.bones[b.name]
                        pb.matrix = Matrix.Translation(by) @ pb.matrix
                        bpy.context.view_layer.update()
                for pat, deg in adds:
                    if fnmatch(b.name, pat):
                        pb = o.pose.bones[b.name]
                        m = pb.matrix.copy()
                        at = Matrix.Translation(m.translation)
                        pb.matrix = at @ Euler([math.radians(v) for v in deg], "XYZ").to_matrix().to_4x4() @ at.inverted() @ m
                        bpy.context.view_layer.update()

    where = lambda b: [round(v, 5) for v in (arm.matrix_world @ arm.pose.bones[b].head)] if b in arm.pose.bones else None
    feet = ("foot_l", "ball_l", "foot_r", "ball_r", "pelvis", "root")
    # where the feet are, in tiles (X down-right on the screen, Y up-right, Z up): in every frame of the file, and in the pictures' frames
    fine = []
    for f in range(int(round(f0)), int(round(f1)) + 1):
        go(f)
        bpy.context.view_layer.update()
        fine.append({"frame": f, **{b: where(b) for b in feet}})
    if stand:                                                          # the feet go under where the hips are on average over the loop
        from mathutils import Vector
        mid = Vector((0, 0, 0))
        for f in at:
            go(f)
            bpy.context.view_layer.update()
            mid += arm.pose.bones["pelvis"].head / len(at)
        plant_feet(arms, stand, (mid.x, mid.y))
    if rests or adds or shifts or stand:                               # a changed stance is stood on the ground again: its lowest point over the loop
        low = 1e9
        for f in at:
            go(f)
            bpy.context.view_layer.update()
            low = min(low, bounds(meshes)[0].z)
        root.location.z -= low
        print(f"stood on the ground again: moved {-low * 78.384:+.1f} px")
    if lift:                                                           # measured now, with every part there: a view hides parts later
        lifted, most = {}, (0.0, 0, "")
        for i, f in enumerate(at):
            lift(False)
            pose(f)
            bpy.context.view_layer.update()
            lifted[f] = lift(True)
            most = max(most, *((v, i, side) for side, v in lifted[f].items()))
            low = bounds(meshes)[0].z
            if low < -0.002:
                print(f"  careful: picture {i:02d} is still {-low * 78.384:.1f} px under the ground after the lift")
        if "--ground-list" in sys.argv:
            for i, f in enumerate(at):
                print(f"  picture {i:02d}: left {lifted[f].get('l', 0) * 78.384:.1f} px, right {lifted[f].get('r', 0) * 78.384:.1f} px")
        n_l = sum(1 for v in lifted.values() if v.get("l", 0) > 1e-6)
        n_r = sum(1 for v in lifted.values() if v.get("r", 0) > 1e-6)
        print(f"feet kept on the ground: the left lifted in {n_l} of {len(at)} pictures, the right in {n_r}; "
              f"the most {most[0] * 78.384:.1f} px (picture {most[1]:02d}, {'left' if most[2] == 'l' else 'right'})")
    shots = []
    views = [(name.strip(), [w.strip() for w in seen.split("+") if w.strip()], [w.strip() for w in shade.split("+") if w.strip()])
             for name, seen, shade in ((v.split("=")[0], *(v.split("=")[1].split("|") + [""])[:2]) for v in args("--view", many=True))]
    for name, seen, shade in views:
        for w in seen + shade:
            if w not in parts:
                raise SystemExit(f"--view {name}: no part named {w}; there are: {', '.join(parts)}")

    def show(seen, shade):
        """Only the parts named are in the picture; those in `shade` are not seen but still throw their shadow on the others."""
        held = {o for w in seen + shade for o in parts[w]}
        looked = {o for w in seen for o in parts[w]}
        for o in scene.objects:
            if o.type == "MESH":
                o.hide_render = o.hide_viewport = o not in held    # out of the renders, and out of the shadow's own measuring
                o.visible_camera = o in looked
        bpy.context.view_layer.update()

    for i, f in enumerate(at):
        if i not in take:
            continue
        base = f"{out}.{i:02d}"
        go(f)
        bpy.context.view_layer.update()
        for name, seen, shade in views:
            vbase = f"{out}.{name}.{i:02d}"
            show(seen, shade)
            if shade:                                                  # lit among the others; its shadow on the ground its own
                render_with_shadow(scene, vbase + ".raw.png", things_out=vbase + ".things.png", no_shadow=True, crop=quick)
                show(seen, [])
                render_with_shadow(scene, vbase + ".raw.png", shadow_out=vbase + ".cast.png", fade=fade, tall=stands, shadow_only=True, crop=quick)
            else:
                render_with_shadow(scene, vbase + ".raw.png", shadow_out=vbase + ".cast.png", things_out=vbase + ".things.png", fade=fade, tall=stands, crop=quick)
                os.remove(vbase + ".raw.png")
            shots.append((vbase, (lambda f=f, seen=seen: (go(f), show(seen, []), quick and region(scene, [o for w in seen for o in parts[w]])))))
        if not views:
            render_with_shadow(scene, base + ".raw.png", shadow_out=base + ".cast.png", things_out=base + ".things.png", fade=fade, tall=stands)
            shots.append((base, (lambda f=f: go(f))))
        print(f"frame {i:02d} (the file's {f:.2f})", flush=True)
    with open(out + ".anim.json", "w") as fh:
        json.dump({"action": act.name, "file_fps": scene.render.fps, "file_frames": [f0, f1], "pictures": n, "picture_frames": at,
                   "turn_deg": float(args("--turn", "0")), "stands_tiles": stands, "sized_by": k, "feet": fine}, fh, indent=1)
    for o in scene.objects:                                           # every material is in the key, whichever view comes first
        if o.type == "MESH" and views:
            o.hide_render = o.hide_viewport = not any(o in obs for obs in parts.values())
    passes(scene, shots, depth=bool(views), exact="--exact-ids" in sys.argv, masks=masks)
    print(f"wrote {n} frames: {out}.00 to {out}.{n - 1:02d} (.raw, .things, .cast, .colour, .ids), and {out}.anim.json")


if __name__ == "__main__":
    main()
