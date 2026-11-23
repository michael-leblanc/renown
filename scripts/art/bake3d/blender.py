"""Renders a 3D model the tileset's way, for scripts/art/bake3d.mjs. Run by it, not by hand.

Blender's API is Python only, so this is the one Python file the art scripts use. It does no shading:
it renders the model's passes, and bake3d.mjs turns them into a sprite with the kit's colours.

Options come as one JSON argument (after `--` when run by the blender program):
  model    path to a .glb, .gltf, .fbx or .obj
  out      folder for the EXR files
  ss       samples per pixel side (the picture is size * ss across)
  size, ppu, ax, ay   the kit's picture size, pixels per unit across, and the tile middle's pixel
  view, sun           the kit's view direction and sun direction (x across, y up, z towards the viewer)
  height   the model's height in units (one tile is 1 x 1; a human is about 1.4), or
  scale    units per model unit, when height is not given
  yaw      degrees the model is turned before the four sides are drawn
  origin   'model' keeps the model's own origin on the tile middle; otherwise the middle of its footprint goes there
  views    the sides to draw: S, E, N, W
  samples  Cycles samples (only the ambient occlusion needs more than one)

Writes, per side: <out>/<side>.exr (the model's passes: Combined, DiffCol, DiffDir, AO, Normal, Depth)
and <out>/<side>-ground.exr (a white ground with the model hidden but casting its shadow).
Both are multilayer OpenEXR, 32-bit float, no compression, so bake3d.mjs reads them with no package.
"""
import sys, os, json, math
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
opt = json.loads(argv[0])

def kit_to_blender(v):            # the kit: x across, y up, z towards the viewer. Blender: z up.
    return Vector((v[0], -v[2], v[1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- the model ----------
path, ext = opt['model'], os.path.splitext(opt['model'])[1].lower()
if ext in ('.glb', '.gltf'):
    bpy.ops.import_scene.gltf(filepath=path)
elif ext == '.fbx':
    bpy.ops.import_scene.fbx(filepath=path)
elif ext == '.obj':
    bpy.ops.wm.obj_import(filepath=path)
else:
    sys.exit(f'bake3d: cannot read {ext} files (glb, gltf, fbx, obj)')
meshes = [o for o in sc.objects if o.type == 'MESH']
if not meshes:
    sys.exit(f'bake3d: no mesh in {path}')

bpy.context.view_layer.update()
lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
s = opt['height'] / (hi.z - lo.z) if opt.get('height') else opt.get('scale', 1.0)

# two empties: `fit` stands the model on the tile middle at its size, `turn` turns it to a side
turn = bpy.data.objects.new('turn', None); sc.collection.objects.link(turn)
fit = bpy.data.objects.new('fit', None); sc.collection.objects.link(fit)
fit.parent = turn
fit.scale = (s, s, s)
if opt.get('origin') == 'model':                             # keep the model's own middle on the tile middle
    fit.location = (0, 0, -s * lo.z)
else:                                                        # the middle of its footprint on the tile middle
    fit.location = (-s * (lo.x + hi.x) / 2, -s * (lo.y + hi.y) / 2, -s * lo.z)
for o in list(sc.objects):
    if o.parent is None and o not in (turn, fit):
        o.parent = fit

# flat, matte materials: the passes then hold the plain colour (DiffCol) and the sun's light (DiffDir)
for m in bpy.data.materials:
    if not m.node_tree:
        continue
    for n in m.node_tree.nodes:
        if n.type != 'BSDF_PRINCIPLED':
            continue
        for name, v in (('Metallic', 0.0), ('Roughness', 1.0), ('Specular IOR Level', 0.0), ('Transmission Weight', 0.0),
                        ('Coat Weight', 0.0), ('Sheen Weight', 0.0), ('Emission Strength', 0.0)):
            if name in n.inputs:
                for l in list(n.inputs[name].links):
                    m.node_tree.links.remove(l)
                n.inputs[name].default_value = v

# ---------- the camera: the tileset's 2:1 view ----------
size, ss = opt['size'], opt['ss']
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = size / opt['ppu']
cd.shift_x = (size / 2 - opt['ax']) / size
cd.shift_y = (opt['ay'] - size / 2) / size
cd.clip_start, cd.clip_end = 0.1, 80
cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
d = kit_to_blender(opt['view']).normalized()
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = (-d).to_track_quat('Z', 'Y')       # a camera looks down its own -Z
cam.location = -d * 30

# ---------- the sun: fixed to the camera, so every side is lit from the same side of the picture ----------
L = kit_to_blender(opt['sun']).normalized()
ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 1.0; ld.angle = 0.0
sun = bpy.data.objects.new('sun', ld); sc.collection.objects.link(sun)
sun.rotation_mode = 'QUATERNION'
sun.rotation_quaternion = L.to_track_quat('Z', 'Y')          # a sun shines down its own -Z

world = bpy.data.worlds.new('dark'); sc.world = world
world.color = (0, 0, 0)
world.light_settings.distance = 0.35                         # how far the ambient occlusion looks, in units (the kit's reaches 0.35)

# ---------- render settings ----------
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'CPU'
cy.samples = opt.get('samples', 16)
cy.use_adaptive_sampling = False
cy.use_denoising = False
cy.seed = 0
cy.use_animated_seed = False
cy.filter_width = 0.01                                       # every sample at the pixel's middle: no blur; bake3d.mjs does the smoothing
cy.max_bounces = 0                                           # only the sun's own light
cy.transparent_max_bounces = 16
sc.render.threads_mode = 'FIXED'; sc.render.threads = 2
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = size * ss
sc.render.resolution_percentage = 100
vl = sc.view_layers[0]
vl.use_pass_normal = vl.use_pass_diffuse_color = vl.use_pass_diffuse_direct = vl.use_pass_ambient_occlusion = vl.use_pass_z = True
im = sc.render.image_settings
if hasattr(im, 'media_type'):                                # Blender 5: multilayer is a media type
    im.media_type = 'MULTI_LAYER_IMAGE'
if im.file_format != 'OPEN_EXR_MULTILAYER':
    im.file_format = 'OPEN_EXR_MULTILAYER'
im.color_depth = '32'
im.exr_codec = 'NONE'

# a white ground for the shadow pass, hidden until then
gm = bpy.data.meshes.new('ground')
g = 2.6
gm.from_pydata([(-g, -g, 0), (g, -g, 0), (g, g, 0), (-g, g, 0)], [], [(0, 1, 2, 3)])
ground = bpy.data.objects.new('ground', gm); sc.collection.objects.link(ground)
mat = bpy.data.materials.new('white')
mat.diffuse_color = (1, 1, 1, 1)
try:
    mat.use_nodes = True
except Exception:
    pass
for n in mat.node_tree.nodes:
    if n.type == 'BSDF_PRINCIPLED':
        n.inputs['Base Color'].default_value = (1, 1, 1, 1)
        n.inputs['Roughness'].default_value = 1.0
        n.inputs['Specular IOR Level'].default_value = 0.0
gm.materials.append(mat)
ground.hide_render = True

# ---------- the sides ----------
# The kit turns a prop to draw its sides: E is the prop turned a quarter turn one way, W the other.
TURN = {'S': 0, 'E': 90, 'N': 180, 'W': 270}
os.makedirs(opt['out'], exist_ok=True)
info = {'scale': s, 'height': (hi.z - lo.z) * s, 'width': (hi.x - lo.x) * s, 'depth': (hi.y - lo.y) * s, 'blender': bpy.app.version_string}
for side in opt['views']:
    turn.rotation_euler = (0, 0, math.radians(TURN[side] + opt.get('yaw', 0)))
    for o in meshes:
        o.visible_camera = True
    ground.hide_render = True
    cy.samples = opt.get('samples', 16)
    sc.render.filepath = os.path.join(opt['out'], f'{side}.exr')
    bpy.ops.render.render(write_still=True)
    # the ground's light with the model hidden from the camera but still in the sun's way
    for o in meshes:
        o.visible_camera = False
    ground.hide_render = False
    cy.samples = 1                                           # the sun is a point: one sample is exact
    sc.render.filepath = os.path.join(opt['out'], f'{side}-ground.exr')
    bpy.ops.render.render(write_still=True)
with open(os.path.join(opt['out'], 'info.json'), 'w') as f:
    json.dump(info, f)
