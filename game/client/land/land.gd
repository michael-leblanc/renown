class_name Land
extends Node2D
# The land around your character, drawn from the welcome and the views in a
# ClientState (D176, D215): a ground piece on every tile, each tree and rock with
# its shadow, walls on the edges between tiles and the doors in them (D203).
# A closed door is a piece on its edge, an open one draws nothing (D209). While your
# own character stands inside a building, the walls toward the camera fade so the
# room shows (D208); the building has no roof in this wave (D214).
#
# Three layers: `ground` and `shadows` are drawn row by row, flat. `objects` is the
# y-sorted layer holding trees, rocks, walls and doors, each a Node2D standing where
# the piece meets the ground. CLI-004 puts the characters in the same sorted layer.

const NO_TILE := Vector2i(-1, -1)

var state: ClientState = null
var tiles: LandTiles = null
var ground: Node2D = null
var shadows: Node2D = null
var objects: Node2D = null
var wall_nodes: Array[Node2D] = []
var door_nodes: Array[Node2D] = []
var plan: LandPlan = null

var _shadow_alpha := 0.3
var _near_alpha := 0.3
var _door_states: Dictionary = {} # "ax,ay" -> "open" or "closed", the last one told
var _faded_room := LandPlan.NO_ROOM


func setup(client_state: ClientState, settings: ClientSettings, table: LandTiles) -> void:
	state = client_state
	tiles = table
	_shadow_alpha = settings.number("shadow_alpha")
	_near_alpha = settings.number("near_wall_alpha")


# Draws the land the welcome described; call it again after a new welcome.
func build() -> void:
	for child in get_children():
		child.queue_free()
		remove_child(child)
	wall_nodes.clear()
	door_nodes.clear()
	_door_states.clear()
	_faded_room = LandPlan.NO_ROOM
	ground = _layer("ground", false)
	shadows = _layer("shadows", false)
	objects = _layer("objects", true)
	var land := state.land
	plan = LandPlan.new(land)
	var width: int = land["width"]
	var height: int = land["height"]
	# Row by row, so every tile is drawn after the two tiles behind it.
	for y in height:
		for x in width:
			_sprite(ground, tiles.ground_piece(int(land["ground"][y * width + x])), tile_to_world(Vector2(x, y)))
	for y in height:
		for x in width:
			var prop := tiles.prop_name(int(land["props"][y * width + x]))
			if prop != "none":
				_add_prop(prop, Vector2i(x, y))
	for wall: Dictionary in plan.walls:
		var piece := tiles.wall_corner(wall["corner"]) if wall["corner"] != "" else tiles.wall_straight(wall["sides"][0])
		wall_nodes.append(_add_piece("wall", piece, wall["tile"], wall["sides"]))
	for door: Dictionary in plan.doors:
		var node := _add_piece("door", tiles.door_closed(door["side"]), door["tile"], [door["side"]])
		node.set_meta("edge", [door["a"], door["b"]])
		door_nodes.append(node)
	refresh()


# Brings the doors and the faded walls up to date with the newest view.
func refresh() -> void:
	if state == null or plan == null:
		return
	for told: Dictionary in state.doors:
		_door_states[_door_key(Vector2i(told["a"][0], told["a"][1]))] = str(told["state"])
	for node in door_nodes:
		var a: Vector2i = node.get_meta("edge")[0]
		node.visible = _door_states.get(_door_key(a), NetMessages.DOOR_CLOSED) != NetMessages.DOOR_OPEN
	var mine := state.newest(state.you)
	if not mine.is_empty():
		_faded_room = plan.room_at(Vector2i(mine["tile"][0], mine["tile"][1]))
	for node in wall_nodes + door_nodes:
		var near := false
		for side: String in node.get_meta("sides"):
			near = near or LandPlan.is_near(side)
		var faded := near and _faded_room != LandPlan.NO_ROOM and plan.room_at(node.get_meta("tile")) == _faded_room
		node.modulate.a = _near_alpha if faded else 1.0


func _process(_delta: float) -> void:
	refresh()


# Middle of a tile's top face, in this node's pixels. Grid x runs down-right, y down-left.
func tile_to_world(tile: Vector2) -> Vector2:
	return Vector2((tile.x - tile.y) * tiles.tile_size.x / 2.0, (tile.x + tile.y) * tiles.tile_size.y / 2.0)


func _layer(layer_name: String, sorted: bool) -> Node2D:
	var layer := Node2D.new()
	layer.name = layer_name
	layer.y_sort_enabled = sorted
	add_child(layer)
	return layer


func _sprite(parent: Node2D, piece: String, at: Vector2) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = tiles.texture(piece)
	sprite.centered = false
	sprite.offset = -tiles.anchor
	sprite.position = at
	parent.add_child(sprite)
	return sprite


func _add_prop(prop: String, tile: Vector2i) -> void:
	var variant := tiles.prop_variant(prop, tile)
	var at := tile_to_world(Vector2(tile))
	_sprite(shadows, variant["shadow"], at).modulate = Color(0, 0, 0, _shadow_alpha)
	_add_piece(prop, variant["piece"], tile, [])


# A piece in the sorted layer. Godot sorts a node by its own y, so the piece is a
# Node2D standing where it touches the ground (the middle of its edges, a quarter of
# a tile's height off the tile's middle), with its Sprite2D shifted back up to the art.
func _add_piece(kind: String, piece: String, tile: Vector2i, sides: Array) -> Node2D:
	var lift := 0.0
	for side: String in sides:
		lift += 1.0 if LandPlan.is_near(side) else -1.0
	if not sides.is_empty():
		lift = lift / sides.size() * tiles.tile_size.y / 4.0
	var node := Node2D.new()
	node.name = piece
	node.set_meta("kind", kind)
	node.set_meta("piece", piece)
	node.set_meta("tile", tile)
	node.set_meta("sides", sides)
	node.position = tile_to_world(Vector2(tile)) + Vector2(0, lift)
	var sprite := Sprite2D.new()
	sprite.name = "Sprite"
	sprite.texture = tiles.texture(piece)
	sprite.centered = false
	sprite.offset = -tiles.anchor
	sprite.position = Vector2(0, -lift)
	node.add_child(sprite)
	objects.add_child(node)
	return node


static func _door_key(a: Vector2i) -> String:
	return "%d,%d" % [a.x, a.y]
