class_name PropsDemo
extends Node2D
## Shows the code-made props (prototype/art/made/) on a grass patch, beside a
## few pieces of the tileset: the lone doorway (D108), a ring of standing
## stones (D71) and chests, closed and open (D54, D142).
## Throwaway code (D201): it follows none of game/sim/'s rules, and it is a
## showcase only. Nothing here is in the seeded test patch (world/).
##
## Run:  scripts/godot.sh --path prototype res://props/props.tscn [flags]
## Flags (all optional):
##   --zoom Z        camera zoom (default 1)
##   --center X,Y    camera centre, in tiles (default: the middle of the patch)
## Keys: arrows or WASD pan, mouse wheel zooms, left click on a chest opens or closes it.

const TILE_W := 128.0
const TILE_H := 64.0
## Where the middle of a tile's top face sits in every 256 x 256 image, the tileset's and the made ones.
const ANCHOR := Vector2(128, 208)
const TILES := "res://art/tiles/"
const MADE := "res://art/made/"
const SIZE := 13
const PAN_SPEED := 900.0
const ZOOM_STEP := 1.1
const SHADOW_ALPHA := 0.3

## The ring: eight stones round its middle, as [dx, dy, kind, rotation].
const RING_MIDDLE := Vector2i(4, 4)
const RING := [
	[-2, -1, "A1", "S"], [-1, -2, "A2", "E"], [1, -2, "A1", "W"], [2, -1, "A3", "S"],
	[2, 1, "A2", "N"], [1, 2, "A1", "E"], [-1, 2, "A2", "S"], [-2, 1, "A1", "N"],
]
## Chests as [x, y, rotation, open].
const CHESTS := [[8, 8, "S", false], [10, 6, "E", false], [6, 10, "S", true], [12, 9, "W", false]]

var ground: Node2D
var shadows: Node2D
var objects: Node2D
var camera: Camera2D
var _textures: Dictionary = {}
var _chests: Dictionary = {}   # cell -> {"piece": Node2D, "shadow": Sprite2D, "side": String, "open": bool}


func _ready() -> void:
	_build()
	camera = Camera2D.new()
	var centre := cell_to_world(Vector2(SIZE - 1, SIZE - 1) / 2.0)
	var c := _arg("--center", "")
	if c != "":
		var p := c.split(",")
		centre = cell_to_world(Vector2(float(p[0]), float(p[1])))
	camera.position = centre
	var z := float(_arg("--zoom", "1"))
	camera.zoom = Vector2(z, z)
	add_child(camera)


func cell_to_world(cell: Vector2) -> Vector2:
	return Vector2((cell.x - cell.y) * TILE_W / 2.0, (cell.x + cell.y) * TILE_H / 2.0)


func world_to_cell(p: Vector2) -> Vector2i:
	var gx := (p.x / (TILE_W / 2.0) + p.y / (TILE_H / 2.0)) / 2.0
	var gy := (p.y / (TILE_H / 2.0) - p.x / (TILE_W / 2.0)) / 2.0
	return Vector2i(roundi(gx), roundi(gy))


func _build() -> void:
	ground = Node2D.new()
	ground.name = "Ground"
	add_child(ground)
	shadows = Node2D.new()
	shadows.name = "Shadows"
	add_child(shadows)
	objects = Node2D.new()
	objects.name = "Objects"
	objects.y_sort_enabled = true
	add_child(objects)

	for y in SIZE:
		for x in SIZE:
			var piece := "Ground A2_S"
			if y == 7 and x >= 5:
				piece = "Ground A1_S"                       # a dirt path
			elif (x * 7 + y * 13 + x * y) % 9 == 0:
				piece = "Ground A18_S"                      # the odd patch of dark grass
			_sprite(ground, piece, cell_to_world(Vector2(x, y)))

	# the ring of standing stones
	for s: Array in RING:
		var cell := RING_MIDDLE + Vector2i(s[0], s[1])
		_prop("Standing Stone %s_%s" % [s[2], s[3]], "Standing Stone Shadow %s_%s" % [s[2], s[3]], cell)
	# the lone doorway, seen from two sides
	_prop("Doorway A1_S", "Doorway Shadow_S", Vector2i(9, 3))
	_prop("Doorway A1_E", "Doorway Shadow_E", Vector2i(3, 10))
	# chests
	for c: Array in CHESTS:
		var cell := Vector2i(c[0], c[1])
		_chests[cell] = {"side": c[2], "open": c[3], "piece": null, "shadow": null}
		_draw_chest(cell)
	# a few pieces of the tileset, to compare
	_shadow("Tree Shadow", cell_to_world(Vector2(11, 10)))
	_piece("Tree D1_S", cell_to_world(Vector2(11, 10)))
	_shadow("Tree Shadow", cell_to_world(Vector2(11, 1)))
	_piece("Tree A1_S", cell_to_world(Vector2(11, 1)))
	_shadow("Shadow4_S", cell_to_world(Vector2(8, 11)))
	_piece("Stone A1_S", cell_to_world(Vector2(8, 11)))
	_shadow("Shadow5_S", cell_to_world(Vector2(1, 12)))
	_piece("Stone A2_S", cell_to_world(Vector2(1, 12)))


func _prop(piece: String, shadow: String, cell: Vector2i) -> Node2D:
	var at := cell_to_world(Vector2(cell))
	_shadow(shadow, at)
	return _piece(piece, at)


func _draw_chest(cell: Vector2i) -> void:
	var c: Dictionary = _chests[cell]
	if c.piece != null:
		c.piece.queue_free()
		c.shadow.queue_free()
	var state := " Open" if c.open else ""
	var at := cell_to_world(Vector2(cell))
	c.shadow = _shadow("Chest Shadow A1%s_%s" % [state, c.side], at)
	c.piece = _piece("Chest A1%s_%s" % [state, c.side], at)


## Returns true when the click was on a chest's tile (and so opened or closed it).
func handle_click(world_pos: Vector2) -> bool:
	var cell := world_to_cell(world_pos)
	if not _chests.has(cell):
		return false
	_chests[cell].open = not _chests[cell].open
	_draw_chest(cell)
	return true


func _texture(piece: String) -> Texture2D:
	if not _textures.has(piece):
		var path := TILES + piece + ".png"
		if not ResourceLoader.exists(path):
			path = MADE + piece + ".png"
		_textures[piece] = load(path)
	return _textures[piece]


func _sprite(parent: Node2D, piece: String, at: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = _texture(piece)
	s.centered = false
	s.offset = -ANCHOR
	s.position = at
	s.name = piece
	parent.add_child(s)
	return s


## A piece in the y-sorted layer, standing on its tile's middle (as in world.gd).
func _piece(piece: String, at: Vector2) -> Node2D:
	var h := Node2D.new()
	h.name = piece
	h.set_meta("piece", piece)
	h.position = at
	var s := Sprite2D.new()
	s.name = "Sprite"
	s.texture = _texture(piece)
	s.centered = false
	s.offset = -ANCHOR
	h.add_child(s)
	objects.add_child(h)
	return h


func _shadow(piece: String, at: Vector2) -> Sprite2D:
	var s := _sprite(shadows, piece, at)
	s.modulate = Color(0, 0, 0, SHADOW_ALPHA)
	return s


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			handle_click(get_global_mouse_position())
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera.zoom *= ZOOM_STEP
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera.zoom /= ZOOM_STEP


func _process(delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		dir.x -= 1
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		dir.x += 1
	if Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_W):
		dir.y -= 1
	if Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_S):
		dir.y += 1
	camera.position += dir * PAN_SPEED * delta / camera.zoom.x


func _all_args() -> PackedStringArray:
	var a := OS.get_cmdline_args()
	a.append_array(OS.get_cmdline_user_args())
	return a


func _arg(flag: String, fallback: String) -> String:
	var a := _all_args()
	var i := a.find(flag)
	if i == -1 or i + 1 >= a.size():
		return fallback
	return a[i + 1]
