class_name SimWorld
extends RefCounted
# The world as plain data: a tile grid with characters on it (D180).
# A tile holds a ground kind, two flags (blocks walking, blocks sight) and a
# place id (D188). Walls and doors sit on the edges between tiles (D203): each
# tile stores its east and south edge, so every edge is stored once.

const GROUND_GRASS := 0
const GROUND_ROAD := 1
const GROUND_SAND := 2
const GROUND_WATER := 3

const PROP_NONE := 0
const PROP_TREE := 1
const PROP_ROCK := 2
const PROP_NAMES := ["none", "tree", "rock"]
const PROPS_PATH := "res://data/props.json"

const NO_PLACE := -1
const NO_CHARACTER := -1

const DOOR_NONE := 0
const DOOR_CLOSED := 1
const DOOR_OPEN := 2

var width: int
var height: int

var _ground: PackedByteArray
var _prop: PackedByteArray
var _prop_table: Dictionary = {} # prop name -> {blocks_walking, blocks_sight}
var _tile_walk: PackedByteArray
var _tile_sight: PackedByteArray
var _place: PackedInt32Array
# Per tile: its east edge (to x+1) and its south edge (to y+1).
var _east_walk: PackedByteArray
var _east_sight: PackedByteArray
var _east_door: PackedByteArray
var _south_walk: PackedByteArray
var _south_sight: PackedByteArray
var _south_door: PackedByteArray

var _characters: Dictionary = {} # id -> SimCharacter
# Who holds each tile: the one at rest there, or the first to arrive of those
# walking through. Only the holder's record says a tile is taken (D52).
var _at: Dictionary = {} # Vector2i -> id
var _on: Dictionary = {} # Vector2i -> Array of ids standing there, in arrival order


func _init(w: int, h: int) -> void:
	width = w
	height = h
	var n := w * h
	_ground = PackedByteArray()
	_ground.resize(n)
	_prop = _ground.duplicate()
	var table: Variant = JSON.parse_string(FileAccess.get_file_as_string(PROPS_PATH))
	if table is Dictionary:
		_prop_table = table
	else:
		push_error("props file unreadable: %s" % PROPS_PATH)
	_tile_walk = _ground.duplicate()
	_tile_sight = _ground.duplicate()
	_east_walk = _ground.duplicate()
	_east_sight = _ground.duplicate()
	_east_door = _ground.duplicate()
	_south_walk = _ground.duplicate()
	_south_sight = _ground.duplicate()
	_south_door = _ground.duplicate()
	_place = PackedInt32Array()
	_place.resize(n)
	_place.fill(NO_PLACE)


func in_bounds(p: Vector2i) -> bool:
	return p.x >= 0 and p.y >= 0 and p.x < width and p.y < height


func _i(p: Vector2i) -> int:
	return p.y * width + p.x


# --- Tiles ---------------------------------------------------------------

func ground_at(p: Vector2i) -> int:
	return _ground[_i(p)]


func set_ground(p: Vector2i, kind: int) -> bool:
	if not in_bounds(p):
		return false
	_ground[_i(p)] = kind
	return true


func prop_at(p: Vector2i) -> int:
	if not in_bounds(p):
		return PROP_NONE
	return _prop[_i(p)]


# Puts a prop on the tile and sets the tile's two flags from the props data
# (D190). Nothing clears them.
func set_prop(p: Vector2i, kind: int) -> bool:
	if not in_bounds(p) or kind < 0 or kind >= PROP_NAMES.size():
		return false
	var walk := false
	var sight := false
	if kind != PROP_NONE:
		var entry: Variant = _prop_table.get(PROP_NAMES[kind])
		if not entry is Dictionary:
			push_error("prop not in props data: %s" % PROP_NAMES[kind])
			return false
		walk = bool(entry.get("blocks_walking", false))
		sight = bool(entry.get("blocks_sight", false))
	_prop[_i(p)] = kind
	return set_tile_flags(p, walk, sight)


# A number that is equal for equal props, for the state hash; 0 with no prop.
func props_digest() -> int:
	if _prop.count(0) == _prop.size():
		return 0
	return hash(_prop)


func place_at(p: Vector2i) -> int:
	if not in_bounds(p):
		return NO_PLACE
	return _place[_i(p)]


func set_place(p: Vector2i, place_id: int) -> bool:
	if not in_bounds(p):
		return false
	_place[_i(p)] = place_id
	return true


func set_place_rect(rect: Rect2i, place_id: int) -> bool:
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			if not in_bounds(Vector2i(x, y)):
				return false
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			_place[_i(Vector2i(x, y))] = place_id
	return true


func set_tile_flags(p: Vector2i, walk: bool, sight: bool) -> bool:
	if not in_bounds(p):
		return false
	_tile_walk[_i(p)] = 1 if walk else 0
	_tile_sight[_i(p)] = 1 if sight else 0
	return true


# A tile that blocks both, like a tree.
func set_blocked(p: Vector2i, blocked: bool) -> bool:
	return set_tile_flags(p, blocked, blocked)


func tile_blocks_walking(p: Vector2i) -> bool:
	return not in_bounds(p) or _tile_walk[_i(p)] == 1


func tile_blocks_sight(p: Vector2i) -> bool:
	return not in_bounds(p) or _tile_sight[_i(p)] == 1


# Blocked for walking, as a tile (edges are asked separately).
func is_blocked(p: Vector2i) -> bool:
	return tile_blocks_walking(p)


# --- Edges ---------------------------------------------------------------

# An edge is valid when both tiles are inside the grid and they touch side
# to side. Anything on the outer border is therefore refused.
func _edge_valid(a: Vector2i, b: Vector2i) -> bool:
	if not in_bounds(a) or not in_bounds(b):
		return false
	var d := b - a
	return absi(d.x) + absi(d.y) == 1


# Index of the tile that stores the edge, and whether it is its east edge.
func _edge_slot(a: Vector2i, b: Vector2i) -> Vector2i:
	var lo := a
	if b.x < a.x or b.y < a.y:
		lo = b
	var horizontal := a.y == b.y
	return Vector2i(_i(lo), 1 if horizontal else 0)


func set_edge_flags(a: Vector2i, b: Vector2i, walk: bool, sight: bool) -> bool:
	if not _edge_valid(a, b):
		return false
	var s := _edge_slot(a, b)
	var w := 1 if walk else 0
	var v := 1 if sight else 0
	if s.y == 1:
		_east_walk[s.x] = w
		_east_sight[s.x] = v
	else:
		_south_walk[s.x] = w
		_south_sight[s.x] = v
	return true


# Puts a door on the edge, or opens and closes the one there.
func set_door(a: Vector2i, b: Vector2i, open: bool) -> bool:
	if not _edge_valid(a, b):
		return false
	var s := _edge_slot(a, b)
	var state := DOOR_OPEN if open else DOOR_CLOSED
	if s.y == 1:
		_east_door[s.x] = state
	else:
		_south_door[s.x] = state
	return true


func _door(a: Vector2i, b: Vector2i) -> int:
	var s := _edge_slot(a, b)
	return _east_door[s.x] if s.y == 1 else _south_door[s.x]


func has_door(a: Vector2i, b: Vector2i) -> bool:
	return _edge_valid(a, b) and _door(a, b) != DOOR_NONE


func door_is_open(a: Vector2i, b: Vector2i) -> bool:
	return _edge_valid(a, b) and _door(a, b) == DOOR_OPEN


# An edge outside the grid or on the border reads as blocking.
func edge_blocks_walking(a: Vector2i, b: Vector2i) -> bool:
	if not _edge_valid(a, b):
		return true
	var s := _edge_slot(a, b)
	return (_east_walk if s.y == 1 else _south_walk)[s.x] == 1


func edge_blocks_sight(a: Vector2i, b: Vector2i) -> bool:
	if not _edge_valid(a, b):
		return true
	var s := _edge_slot(a, b)
	if (_east_sight if s.y == 1 else _south_sight)[s.x] == 1:
		return true
	return _door(a, b) == DOOR_CLOSED


# --- Characters ----------------------------------------------------------

func is_free(p: Vector2i) -> bool:
	return in_bounds(p) and not tile_blocks_walking(p) and not _at.has(p)


func character_at(p: Vector2i) -> int:
	return _at.get(p, NO_CHARACTER)


func get_character(id: int) -> SimCharacter:
	return _characters.get(id)


# One character per tile at rest (D52). Same rule for everyone (D4).
func add_character(c: SimCharacter, p: Vector2i) -> bool:
	if _characters.has(c.id) or not is_free(p):
		return false
	c.pos = p
	_characters[c.id] = c
	_enter(c)
	return true


# Erases only this character's own record: one walking through a tile another
# holds leaves the holder on the record.
func remove_character(id: int) -> bool:
	var c: SimCharacter = _characters.get(id)
	if c == null:
		return false
	_leave(c)
	_characters.erase(id)
	return true


# Moves a character onto any tile that doesn't block walking, even one another
# holds: walking through is allowed (D52). It takes the tile's record only if
# nobody holds it. Whether the step itself is allowed is for the caller.
func move_character(id: int, p: Vector2i) -> bool:
	var c: SimCharacter = _characters.get(id)
	if c == null or tile_blocks_walking(p):
		return false
	_leave(c)
	c.pos = p
	_enter(c)
	return true


func _enter(c: SimCharacter) -> void:
	if not _on.has(c.pos):
		_on[c.pos] = []
	_on[c.pos].append(c.id)
	if not _at.has(c.pos):
		_at[c.pos] = c.id


# The holder leaving hands the tile to the first still standing on it.
func _leave(c: SimCharacter) -> void:
	var here: Array = _on.get(c.pos, [])
	here.erase(c.id)
	if here.is_empty():
		_on.erase(c.pos)
	if _at.get(c.pos, NO_CHARACTER) == c.id:
		_at.erase(c.pos)
		if not here.is_empty():
			_at[c.pos] = here[0]
