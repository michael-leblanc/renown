# The tileset's camera and the props' sun, set up in Blender from the numbers in scripts/art/style.mjs
# (read each time with `node scripts/art/style.mjs --json`, so the two cannot drift apart).
# Blender here is the Python module (scripts/art/setup_blender.sh installs it); run from the repo root:
#   python3.11 scripts/art/blender_style.py --check scripts/art/out/blender-check.png
#       renders the test block (0.8 x 0.6 x 0.5 tiles, on the tile's middle) with its ground shadow, 256 x 256
#   node scripts/art/style.mjs --match scripts/art/out/blender-check.png
#       compares it with the same block drawn by the kit: the proof that both cameras put a point on the same pixel
# In another Blender script:  from blender_style import setup;  setup(bpy.context.scene, 256, 256, (128, 208))
# Axes: Blender X = the tile grid's i (down to the right on the screen), Y = minus j (up to the right), Z = up. 1 unit = 1 tile.
import json
import math
import os
import subprocess
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))


def style():
    """The numbers of style.mjs: camera, sun, house_light, blender."""
    return json.loads(subprocess.check_output(["node", os.path.join(HERE, "style.mjs"), "--json"]))


def setup(scene, width=256, height=256, middle=(128, 208), samples=32, sun_strength=3.0):
    """Sets the scene to render like the tileset: Cycles on the processor, a clear background, the orthographic camera
    with the ground point (0, 0, 0) at pixel `middle` (x from the left, y from the top), and the props' sun.
    Returns (camera, sun)."""
    s = style()
    b, ppu = s["blender"], s["camera"]["pixels_per_unit"]
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.filter_type = "BOX"          # a pixel is the plain average of what is in it, as in the kit
    scene.cycles.filter_width = 1.0
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

    sun = bpy.data.lights.new("PropsSun", "SUN")
    sun.energy = sun_strength
    sun.angle = 0                                                     # a hard-edged shadow, as the kit's
    sun_ob = bpy.data.objects.new("PropsSun", sun)
    sun_ob.rotation_euler = [math.radians(a) for a in b["sun_rotation_euler_deg"]]
    scene.collection.objects.link(sun_ob)
    return cam_ob, sun_ob


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


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check(sys.argv[sys.argv.index("--check") + 1])
    else:
        print(json.dumps(style()["blender"], indent=2))
