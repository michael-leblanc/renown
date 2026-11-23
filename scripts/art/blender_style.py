# The tileset's camera and the props' sun, set up in Blender from the numbers in scripts/art/style.mjs
# (read each time with `node scripts/art/style.mjs --json`, so the two cannot drift apart).
# Blender here is the Python module (scripts/art/setup_blender.sh installs it); run from the repo root:
#   python3.11 scripts/art/blender_style.py --check scripts/art/out/blender-check.png
#       renders the test block (0.8 x 0.6 x 0.5 tiles, on the tile's middle) with its ground shadow, 256 x 256
#   node scripts/art/style.mjs --match scripts/art/out/blender-check.png
#       compares it with the same block drawn by the kit: the proof that both cameras put a point on the same pixel
#   python3.11 scripts/art/blender_style.py --official scripts/art/out/blender-official.png [--colour r,g,b] [--size x,y,z] [--at x,y]
#       the same block, matt (grey 0.5 unless a colour is given, in linear light), under the official sun (the bought pack's,
#       for the characters) with its shadow on the ground at the pack's alpha; --size and --at (tiles) make it another block
# In another Blender script:  from blender_style import setup;  setup(bpy.context.scene, 256, 256, (128, 208))
#   for the characters:       setup(scene, w, h, middle, light="official"), then render_with_shadow(scene, "out.png")
# Axes: Blender X = the tile grid's i (down to the right on the screen), Y = minus j (up to the right), Z = up. 1 unit = 1 tile.
import json
import math
import os
import subprocess
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))


_STYLE = None


def style():
    """The numbers of style.mjs: camera, sun, house_light, blender. Read once."""
    global _STYLE
    if _STYLE is None:
        _STYLE = json.loads(subprocess.check_output(["node", os.path.join(HERE, "style.mjs"), "--json"]))
    return _STYLE


def region(scene, things=None, shadow=False, margin=2):
    """Renders only the box round `things` (mesh objects) as the camera sees them, `margin` pixels wider, or with shadow=True
    the box round their shadow on the ground under the official sun. The picture keeps its size: outside the box it is
    clear, which it would be anyway. things=None: the whole picture again. Returns the box in pixels (x0, y0, x1, y1), y from the bottom."""
    import numpy as np
    r = scene.render
    if things is None:
        r.use_border = False
        return None
    cam = scene.camera
    frame = cam.data.view_frame(scene=scene)
    xs, ys = [c.x for c in frame], [c.y for c in frame]
    inv = np.array(cam.matrix_world.inverted())
    to_sun = np.array(style()["blender"]["official"]["sun_to"])
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = np.array([1e9, 1e9]), np.array([-1e9, -1e9])
    for o in things:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        co = np.empty(len(me.vertices) * 3)
        me.vertices.foreach_get("co", co)
        ev.to_mesh_clear()
        m = np.array(ev.matrix_world)
        w = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
        if shadow:
            w = w - to_sun[None, :] * (w[:, 2] / to_sun[2])[:, None]   # each point slid away from the sun down to the ground
        c = w @ inv[:3, :3].T + inv[:3, 3]
        lo, hi = np.minimum(lo, c[:, :2].min(axis=0)), np.maximum(hi, c[:, :2].max(axis=0))
    W, H = r.resolution_x, r.resolution_y
    x0 = max(0, int(np.floor((lo[0] - min(xs)) / (max(xs) - min(xs)) * W)) - margin)
    x1 = min(W, int(np.ceil((hi[0] - min(xs)) / (max(xs) - min(xs)) * W)) + margin)
    y0 = max(0, int(np.floor((lo[1] - min(ys)) / (max(ys) - min(ys)) * H)) - margin)
    y1 = min(H, int(np.ceil((hi[1] - min(ys)) / (max(ys) - min(ys)) * H)) + margin)
    r.use_border, r.use_crop_to_border = True, False
    r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = x0 / W, x1 / W, y0 / H, y1 / H
    return x0, y0, x1, y1


def setup(scene, width=256, height=256, middle=(128, 208), samples=32, sun_strength=3.0, light="props"):
    """Sets the scene to render like the tileset: Cycles on the processor, a clear background, the orthographic camera
    with the ground point (0, 0, 0) at pixel `middle` (x from the left, y from the top), and a sun.
    light="props": the props' sun alone, at sun_strength (the kit's; the camera check uses it).
    light="official": the official sun (the bought pack's, for the characters) at its own strengths: the sun, an even
    light from everywhere (the world) and a fill from the east that throws no shadow. A matt top then shows its own
    colour, the side turned down-right 0.71 of it and the side turned down-left 0.51 (in linear light), as the pack's.
    Returns (camera, sun)."""
    s = style()
    b, ppu = s["blender"], s["camera"]["pixels_per_unit"]
    official = b["official"] if light == "official" else None
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.filter_type = "BOX"          # a pixel is the plain average of what is in it, as in the kit
    scene.cycles.filter_width = 1.0
    scene.view_settings.view_transform = "Standard"                  # a colour comes out as it was put in (Blender's own choice, AgX, greys it)
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = width, height, 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"

    longer = max(width, height)
    cam = bpy.data.cameras.new("TilesetCamera")
    cam.type = "ORTHO"
    cam.ortho_scale = longer / ppu
    cam.shift_x = (width / 2 - middle[0]) / longer
    cam.shift_y = (middle[1] - height / 2) / longer
    cam.clip_start, cam.clip_end = 0.1, 200
    cam_ob = bpy.data.objects.new("TilesetCamera", cam)
    cam_ob.rotation_euler = [math.radians(a) for a in b["camera_rotation_euler_deg"]]
    cam_ob.location = [50 * v for v in b["camera_from_target"]]      # an orthographic camera's distance changes nothing
    scene.collection.objects.link(cam_ob)
    scene.camera = cam_ob
    scene["middle"] = list(middle)

    sun = bpy.data.lights.new("OfficialSun" if official else "PropsSun", "SUN")
    sun.energy = official["sun_strength"] if official else sun_strength
    sun.angle = 0                                                     # a hard-edged shadow, as the kit's
    sun_ob = bpy.data.objects.new(sun.name, sun)
    sun_ob.rotation_euler = [math.radians(a) for a in (official or b)["sun_rotation_euler_deg"]]
    scene.collection.objects.link(sun_ob)
    if official:
        fill = bpy.data.lights.new("OfficialFill", "SUN")
        fill.energy, fill.angle = official["fill_strength"], 0
        fill.use_shadow = False
        fill_ob = bpy.data.objects.new("OfficialFill", fill)
        fill_ob.rotation_euler = [math.radians(a) for a in official["fill_rotation_euler_deg"]]
        scene.collection.objects.link(fill_ob)
        scene.world = bpy.data.worlds.new("OfficialWorld")
        scene.world.use_nodes = True
        bg = scene.world.node_tree.nodes["Background"]
        bg.inputs["Color"].default_value = (1, 1, 1, 1)
        bg.inputs["Strength"].default_value = official["world_strength"]
    return cam_ob, sun_ob


def render_with_shadow(scene, out, shadow_out=None, things_out=None, fade=None, tall=None, no_shadow=False, shadow_only=False, crop=False):
    """Renders a scene set up with light="official" as the pack's pieces are: the things, and under them their shadow on
    the ground, black, at the pack's own alpha. Two passes: the things under all three lights with no ground; then the
    ground alone under the sun, catching the shadow. Writes `out` (both together) and, if asked, the shadow by itself
    (shadow_out) and the things by themselves (things_out): the two that finish_sprite.mjs takes.
    fade=(190, 120) with tall (the figure's height in tiles) makes the shadow pale toward its tip, as the pack's pots'.
    no_shadow: the things alone (things_out), nothing else written. shadow_only: the shadow alone (shadow_out).
    Mesh objects the camera does not see stay unseen.
    crop: each pass renders only the box round what it shows (see region); the pictures are the same, sooner."""
    import numpy as np
    alpha = style()["blender"]["official"]["shadow_alpha"]
    w, h = scene.render.resolution_x, scene.render.resolution_y
    tmp = os.path.splitext(os.path.abspath(out))[0]

    def shot(path):
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(path)
        im.colorspace_settings.name = "Non-Color"                    # the file's own values, untouched
        px = np.array(im.pixels[:], dtype=np.float64).reshape(h, w, 4)
        bpy.data.images.remove(im)
        return px

    def save(px, path):
        im = bpy.data.images.new("out", w, h, alpha=True)
        im.colorspace_settings.name = "Non-Color"
        im.pixels[:] = px.reshape(-1)
        im.filepath_raw, im.file_format = os.path.abspath(path), "PNG"
        im.save()
        bpy.data.images.remove(im)

    looked = [o for o in scene.objects if o.type == "MESH" and o.visible_camera and not o.hide_render]
    if crop:
        region(scene, looked)
    things = None if shadow_only else shot(tmp + ".things.png")
    if crop:
        region(scene, None)
    if no_shadow:
        os.remove(tmp + ".things.png")
        save(things, things_out)
        return
    seen = [o for o in scene.objects if o.type == "MESH" and o.visible_camera]
    lights = {o: o.data.energy for o in scene.objects if o.type == "LIGHT" and o.name != "OfficialSun"}
    bg = scene.world.node_tree.nodes["Background"].inputs["Strength"]
    world = bg.default_value
    for o in seen:
        o.visible_camera = False
    for o in lights:
        o.data.energy = 0
    bg.default_value = 0
    plane = shadow_catcher(scene)
    if crop:
        region(scene, looked, shadow=True)
    shadow = shot(tmp + ".shadow.png")
    if crop:
        region(scene, None)
    bpy.data.objects.remove(plane)
    for o in seen:
        o.visible_camera = True
    for o, e in lights.items():
        o.data.energy = e
    bg.default_value = world
    for f in (tmp + ".things.png", tmp + ".shadow.png")[1 if shadow_only else 0:]:
        os.remove(f)

    sa = shadow[:, :, 3] * alpha
    faded = None
    if fade:
        # The pack's small pieces bake a shadow that pales away from the thing (the pots: 190 at the pots, 120 at the far
        # end). Here each shadow pixel pales by how high the thing that shades it is: a walk from the ground point toward
        # the sun, the first thing met, its height over `tall` (the figure's own height) -> fade[0] at the ground, fade[1] at the top.
        from mathutils import Vector
        dg = bpy.context.evaluated_depsgraph_get()
        to_sun = Vector(style()["blender"]["official"]["sun_to"])
        mx, my = scene["middle"]
        faded = np.zeros((h, w))
        missed = []
        for row, col in zip(*np.nonzero(shadow[:, :, 3] > 0.02)):
            a, b = (col + 0.5 - mx) / 64.0, (h - row - 0.5 - my) / 32.0   # the pixel's middle on the ground: X + Y, X - Y
            hit, at, *_ = scene.ray_cast(dg, Vector(((a + b) / 2, (a - b) / 2, 0.002)), to_sun)
            if hit:
                faded[row, col] = (fade[0] + (fade[1] - fade[0]) * min(1.0, max(0.0, at.z / tall))) / 255
            else:
                missed.append((row, col))
        for row, col in missed:                                        # an edge pixel whose middle is just outside: as its neighbours
            near = faded[max(0, row - 2):row + 3, max(0, col - 2):col + 3]
            faded[row, col] = near[near > 0].mean() if (near > 0).any() else fade[0] / 255
        sa = shadow[:, :, 3] * faded
    if not shadow_only:
        ta = things[:, :, 3]
        oa = ta + sa * (1 - ta)
        res = np.zeros((h, w, 4))
        res[:, :, :3] = things[:, :, :3] * (ta / np.maximum(oa, 1e-9))[:, :, None]
        res[:, :, 3] = oa
        save(res, out)
    if things_out and not shadow_only:
        save(things, things_out)
    if shadow_out:
        only = np.zeros((h, w, 4))
        only[:, :, 3] = shadow[:, :, 3] * alpha
        if faded is not None:
            only[:, :, 0] = faded                                     # red: the alpha this pixel's shadow is to have, when it fades
            only[:, :, 3] = np.maximum(only[:, :, 3], (faded > 0) * 0.008)   # so no file writer drops the red of a faint pixel
        save(only, shadow_out)


def shadow_catcher(scene, size=12):
    """A ground plane that shows only the shadows that fall on it."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    plane = bpy.context.active_object
    plane.is_shadow_catcher = True
    return plane


def _check(out):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new("Dark")                         # no light but the sun
    scene.world.color = (0, 0, 0)
    setup(scene)
    shadow_catcher(scene)
    # the kit's test block: sdBox(x, y - .3, z, .4, .3, .25), so 0.8 along X, 0.5 along Y, 0.6 tall, standing on the ground
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.3))
    block = bpy.context.active_object
    block.scale = (0.8, 0.5, 0.6)
    mat = bpy.data.materials.new("Glow")                              # its own light, so no face of it is black like a shadow
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    em, outn = nodes.new("ShaderNodeEmission"), nodes.new("ShaderNodeOutputMaterial")
    em.inputs["Color"].default_value = (0.5, 0.5, 0.5, 1)
    links.new(em.outputs["Emission"], outn.inputs["Surface"])
    block.data.materials.append(mat)
    scene.render.filepath = os.path.abspath(out)
    bpy.ops.render.render(write_still=True)
    print(f"Blender {bpy.app.version_string}, {scene.render.engine}: wrote {out}")


def _official(out):
    """The test block again, matt grey (colour 0.5), under the official sun, with its shadow as the pack bakes one."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    setup(scene, samples=64, light="official")
    opt = lambda name, default: [float(v) for v in sys.argv[sys.argv.index(name) + 1].split(",")] if name in sys.argv else default
    size, at = opt("--size", [0.8, 0.5, 0.6]), opt("--at", [0, 0])    # tiles: along X, along Y, up; and its middle on the ground
    bpy.ops.mesh.primitive_cube_add(size=1, location=(at[0], at[1], size[2] / 2))
    block = bpy.context.active_object
    block.scale = size
    mat = bpy.data.materials.new("Grey")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    col = opt("--colour", [0.5, 0.5, 0.5])
    bsdf.inputs["Base Color"].default_value = (*col, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Specular IOR Level"].default_value = 0.0            # matt: no shine
    block.data.materials.append(mat)
    render_with_shadow(scene, out)
    print(f"Blender {bpy.app.version_string}, {scene.render.engine}: wrote {out}")


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check(sys.argv[sys.argv.index("--check") + 1])
    elif "--official" in sys.argv:
        _official(sys.argv[sys.argv.index("--official") + 1])
    else:
        print(json.dumps(style()["blender"], indent=2))
