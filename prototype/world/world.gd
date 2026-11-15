class_name World
extends Node2D
## Draws the seeded test patch (D201): ground, shadows, then one y-sorted layer
## for walls, the door, trees, rocks and (later) characters.
## Throwaway code: it follows none of game/sim/'s rules.
##
## Run:  scripts/godot.sh --path prototype res://world/world.tscn [flags]
## Flags (all optional):
##   --seed N        world seed (default 1)
##   --zoom Z        camera zoom (default 1; 0.33 shows the whole patch)
##   --center X,Y    camera centre, in tiles (default: the building)
##   --markers       place the depth-test markers (wall and tree)
##   --bare          with --markers: hide the wall and tree under test (shows the hidden markers)
##   --open-door     start with the door open
## Keys: arrows or WASD pan, mouse wheel zooms, left click on the door toggles it.

const TILE_W := 128.0
const TILE_H := 64.0
## Where the middle of a tile's top face sits in every 256 x 256 tileset image.
const ANCHOR := Vector2(128, 208)
const ART := "res://art/tiles/"
const PAN_SPEED := 900.0
const ZOOM_STEP := 1.1
const SHADOW_ALPHA := 0.3
const MARKER_SIZE := Vector2i(28, 64)

const GROUND_ART := {
	"grass": "Ground A2_S",
	"dark_grass": "Ground A18_S",
	"dirt": "Ground A1_S",
	"pebbles": "Ground A2_S",   # grass underneath, the pebbles are drawn on top
}

## Set before adding to the tree to override --seed.
var seed_override := -1
var gen: WorldGen
var objects: Node2D          # the y-sorted layer; PRO-003 and PRO-005 add characters here
var door_open := false
var door_sprite: Node2D     # the door piece; hidden while the door is open
var camera: Camera2D
var _textures: Dictionary = {}
var _door_image: Image
var _marker_texture: ImageTexture


func _ready() -> void:
	var seed_in := seed_override
	if seed_in < 0:
		seed_in = int(_arg("--seed", "1"))
	gen = WorldGen.new(seed_in)
	_build()
	camera = Camera2D.new()
	var centre := cell_to_world(Vector2(gen.building_origin) + Vector2(WorldGen.BUILDING_W - 1, WorldGen.BUILDING_H - 1) / 2.0)
	var c := _arg("--center", "")
	if c != "":
		var p := c.split(",")
		centre = cell_to_world(Vector2(float(p[0]), float(p[1])))
	camera.position = centre
	var z := float(_arg("--zoom", "1"))
	camera.zoom = Vector2(z, z)
	add_child(camera)
	if _has_arg("--markers"):
		place_test_markers()
	if _has_arg("--open-door"):
		set_door_open(true)


# --- coordinates -------------------------------------------------------------

## Middle of a tile's top face, in world pixels. Grid x runs down-right, y down-left.
func cell_to_world(cell: Vector2) -> Vector2:
	return Vector2((cell.x - cell.y) * TILE_W / 2.0, (cell.x + cell.y) * TILE_H / 2.0)


func world_to_cell(p: Vector2) -> Vector2i:
	var gx := (p.x / (TILE_W / 2.0) + p.y / (TILE_H / 2.0)) / 2.0
	var gy := (p.y / (TILE_H / 2.0) - p.x / (TILE_W / 2.0)) / 2.0
	return Vector2i(roundi(gx), roundi(gy))


# --- building the picture ----------------------------------------------------

func _build() -> void:
	var ground := Node2D.new()
	ground.name = "Ground"
	add_child(ground)
	var shadows := Node2D.new()
	shadows.name = "Shadows"
	add_child(shadows)
	objects = Node2D.new()
	objects.name = "Objects"
	objects.y_sort_enabled = true
	add_child(objects)

	# Row by row: every tile is drawn after the two tiles behind it.
	for y in WorldGen.SIZE:
		for x in WorldGen.SIZE:
			var cell := Vector2i(x, y)
			var t := gen.tile(cell)
			var at := cell_to_world(Vector2(cell))
			_sprite(ground, GROUND_ART[t.ground], at)
			if t.ground == "pebbles":
				_sprite(ground, "Ground A22_S", at)
	for y in WorldGen.SIZE:
		for x in WorldGen.SIZE:
			var cell := Vector2i(x, y)
			var t := gen.tile(cell)
			var at := cell_to_world(Vector2(cell))
			match t.kind:
				"tree":
					_shadow(shadows, "Tree Shadow", at)
					_piece(t.piece, at)
				"rock_small":
					_shadow(shadows, "Shadow5_S", at)
					_piece(t.piece, at)
				"rock_big":
					_shadow(shadows, "Shadow4_S", at)
					_piece(t.piece, at)
				"wall", "window":
					_piece(t.piece, at, _sort_offset(t.piece))
				"door":
					door_sprite = _piece(t.piece, at, _sort_offset(t.piece))
					door_sprite.name = "Door"
					_door_image = (door_sprite.get_node("Sprite") as Sprite2D).texture.get_image()


## Where a piece stands, as a y offset from its tile's middle, for drawing order:
## a wall on the south-west or south-east edge stands in front of the middle,
## one on a north edge behind it. Corners use the middle of their two edges.
func _sort_offset(piece: String) -> float:
	var half := TILE_H / 4.0   # an edge's middle is 16 px above or below the tile's middle
	var side := piece.substr(piece.length() - 1)
	if piece.begins_with("Wall A16"):
		match side:
			"N": return -half
			"S": return half
			_: return 0.0
	match side:
		"N", "W": return -half
		_: return half


func _texture(piece: String) -> Texture2D:
	if not _textures.has(piece):
		_textures[piece] = load(ART + piece + ".png")
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


## A piece in the y-sorted layer. Godot sorts a node by its own y, so the piece is
## a Node2D standing where the piece touches the ground (the tile's middle plus
## `sort_offset`), with its Sprite2D child ("Sprite") shifted back up to the art.
func _piece(piece: String, at: Vector2, sort_offset := 0.0) -> Node2D:
	var h := Node2D.new()
	h.name = piece   # duplicates get renamed by Godot; the tileset name is kept in meta "piece"
	h.set_meta("piece", piece)
	h.position = at + Vector2(0, sort_offset)
	var s := Sprite2D.new()
	s.name = "Sprite"
	s.texture = _texture(piece)
	s.centered = false
	s.offset = -ANCHOR
	s.position = Vector2(0, -sort_offset)
	h.add_child(s)
	objects.add_child(h)
	return h


func _shadow(parent: Node2D, piece: String, at: Vector2) -> void:
	var s := _sprite(parent, piece, at)
	s.modulate = Color(0, 0, 0, SHADOW_ALPHA)


# --- door --------------------------------------------------------------------

func set_door_open(open: bool) -> void:
	door_open = open
	door_sprite.visible = not open   # the tileset has no open door (D191): an empty doorway
	gen.tile(gen.door_cell).blocks_sight = not open


## True when a click at this world position is on the door: on its drawn pixels
## while closed, or on its tile (the empty doorway) either way.
func door_hit(world_pos: Vector2) -> bool:
	if world_to_cell(world_pos) == gen.door_cell:
		return true
	if door_open:
		return false
	var door_art := door_sprite.get_node("Sprite") as Sprite2D
	var px := world_pos - door_sprite.position - door_art.position + ANCHOR
	if px.x < 0 or px.y < 0 or px.x >= _door_image.get_width() or px.y >= _door_image.get_height():
		return false
	return _door_image.get_pixel(int(px.x), int(px.y)).a > 0.1


## Returns true when the click was on the door (and so toggled it).
func handle_click(world_pos: Vector2) -> bool:
	if not door_hit(world_pos):
		return false
	set_door_open(not door_open)
	return true


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			handle_click(get_global_mouse_position())
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			_zoom_by(ZOOM_STEP)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_zoom_by(1.0 / ZOOM_STEP)


func _zoom_by(f: float) -> void:
	camera.zoom *= f


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


# --- depth-test markers ------------------------------------------------------

func add_marker(foot: Vector2) -> Node2D:
	if _marker_texture == null:
		var img := Image.create(MARKER_SIZE.x, MARKER_SIZE.y, false, Image.FORMAT_RGBA8)
		img.fill(Color(1, 1, 1))
		img.fill_rect(Rect2i(3, 3, MARKER_SIZE.x - 6, MARKER_SIZE.y - 6), Color(1, 0, 0.8))
		_marker_texture = ImageTexture.create_from_image(img)
	var h := Node2D.new()
	h.name = "Marker"
	h.set_meta("piece", "Marker")
	h.position = foot
	var s := Sprite2D.new()
	s.name = "Sprite"
	s.texture = _marker_texture
	s.centered = false
	s.offset = Vector2(-MARKER_SIZE.x / 2.0, -MARKER_SIZE.y)
	h.add_child(s)
	objects.add_child(h)
	return h


## Four markers: one behind and one in front of a wall on the side without the
## door, and the same for a tree. Returns the nodes for the check script.
## With --bare the two pieces under test are hidden, so a shot can show that the
## hidden markers exist.
func place_test_markers() -> Dictionary:
	var o := gen.building_origin
	var last := o + Vector2i(WorldGen.BUILDING_W - 1, WorldGen.BUILDING_H - 1)
	var wall_cell: Vector2i
	var wall_mid: Vector2
	if gen.door_side == "S":
		# the south-east wall (no door, no window on it); its edge is right of the tile's middle
		wall_cell = Vector2i(last.x, o.y + 2)
		wall_mid = cell_to_world(Vector2(wall_cell)) + Vector2(TILE_W / 4.0, 0)
	else:
		wall_cell = Vector2i(o.x + 2, last.y)
		wall_mid = cell_to_world(Vector2(wall_cell)) + Vector2(-TILE_W / 4.0, 0)
	var tree_cell := _free_tree()
	var tree_at := cell_to_world(Vector2(tree_cell))
	var wall_piece: Node2D = null
	var tree_piece: Node2D = null
	for s in objects.get_children():
		if s is Node2D and s.get_meta("piece") != "Marker":
			# A piece's node stands up to 16 px off its tile's middle (for sorting),
			# so find its tile from the sprite's art anchor instead.
			var cell := world_to_cell(s.position + s.get_node("Sprite").position)
			if cell == wall_cell and str(s.get_meta("piece")).begins_with("Wall"):
				wall_piece = s
			if cell == tree_cell and str(s.get_meta("piece")).begins_with("Tree"):
				tree_piece = s
	var result := {
		"wall": wall_piece,
		"wall_behind": add_marker(wall_mid),
		"wall_front": add_marker(wall_mid + Vector2(0, 30)),
		"tree": tree_piece,
		"tree_behind": add_marker(tree_at + Vector2(0, -32)),
		"tree_front": add_marker(tree_at + Vector2(0, 24)),
		"tree_cell": tree_cell,
		"wall_cell": wall_cell,
	}
	if _has_arg("--bare"):
		wall_piece.visible = false
		tree_piece.visible = false
	return result


## The first tree with nothing else within two tiles, so the markers read clearly.
func _free_tree() -> Vector2i:
	for c in gen.trees:
		var alone := true
		for dy in range(-2, 3):
			for dx in range(-2, 3):
				var n := c + Vector2i(dx, dy)
				if n != c and gen.tile(n) != null and gen.tile(n).kind != "":
					alone = false
		if alone:
			return c
	return gen.trees[0]


# --- arguments ---------------------------------------------------------------

func _all_args() -> PackedStringArray:
	var a := OS.get_cmdline_args()
	a.append_array(OS.get_cmdline_user_args())
	return a


func _has_arg(flag: String) -> bool:
	return _all_args().has(flag)


func _arg(flag: String, fallback: String) -> String:
	var a := _all_args()
	var i := a.find(flag)
	if i == -1 or i + 1 >= a.size():
		return fallback
	return a[i + 1]
