class_name LandPlan
extends RefCounted
# What the welcome's walls and doors turn into (D203): which tile a wall is drawn
# from, which pieces cover which edges, and which tiles are inside a building. The
# client is told no building places (D176), so a room is read from the land: the
# tiles that walls and doors close in without touching the map's border. Plain
# arrays and dictionaries, no nodes.

const NO_ROOM := -1

var width: int
var height: int
var room: PackedInt32Array = PackedInt32Array() # per tile: its room, NO_ROOM outside
var walls: Array = [] # {tile, sides}: edges owned by one tile, one entry a piece
var doors: Array = [] # {tile, side, a, b}

var _barriers: Dictionary = {} # "ax,ay,bx,by" -> true, for walls and doors


func _init(land: Dictionary) -> void:
	width = int(land["width"])
	height = int(land["height"])
	var edges: Array = land["edges"]
	for edge: Array in edges:
		_barriers[_key(Vector2i(edge[0], edge[1]), Vector2i(edge[2], edge[3]))] = true
	_find_rooms()
	_own_edges(edges)


func room_at(tile: Vector2i) -> int:
	if tile.x < 0 or tile.y < 0 or tile.x >= width or tile.y >= height:
		return NO_ROOM
	return room[tile.y * width + tile.x]


# The side of `tile` that the edge to its neighbour `other` is: N is the north-east
# edge (toward y - 1), E the south-east (x + 1), S the south-west (y + 1), W the
# north-west (x - 1).
static func side_toward(tile: Vector2i, other: Vector2i) -> String:
	var d := other - tile
	if d == Vector2i(0, -1):
		return "N"
	if d == Vector2i(1, 0):
		return "E"
	if d == Vector2i(0, 1):
		return "S"
	return "W"


# True for a side toward the camera: south-east and south-west.
static func is_near(side: String) -> bool:
	return side == "E" or side == "S"


func _key(a: Vector2i, b: Vector2i) -> String:
	var first := a
	var second := b
	if b.x < a.x or b.y < a.y:
		first = b
		second = a
	return "%d,%d,%d,%d" % [first.x, first.y, second.x, second.y]


# Flood fill over the tiles, stopped by walls and doors. A fill that reaches the
# border is the outdoors; one that does not is a room.
func _find_rooms() -> void:
	room.resize(width * height)
	room.fill(NO_ROOM)
	var seen := PackedByteArray()
	seen.resize(width * height)
	var next_room := 0
	for start_y in height:
		for start_x in width:
			if seen[start_y * width + start_x] == 1:
				continue
			var found: Array[int] = []
			var touches_border := false
			var todo: Array[Vector2i] = [Vector2i(start_x, start_y)]
			seen[start_y * width + start_x] = 1
			while not todo.is_empty():
				var at: Vector2i = todo.pop_back()
				found.append(at.y * width + at.x)
				if at.x == 0 or at.y == 0 or at.x == width - 1 or at.y == height - 1:
					touches_border = true
				for step: Vector2i in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var to := at + step
					if to.x < 0 or to.y < 0 or to.x >= width or to.y >= height:
						continue
					if seen[to.y * width + to.x] == 1 or _barriers.has(_key(at, to)):
						continue
					seen[to.y * width + to.x] = 1
					todo.append(to)
			if touches_border:
				continue
			for index in found:
				room[index] = next_room
			next_room += 1


# Each edge belongs to the tile of the pair that is inside a room, so a wall's
# thickness sits on the room's side; with no room on either side, the first tile.
# A tile that owns two edges meeting at a corner draws one corner piece for them.
func _own_edges(edges: Array) -> void:
	var sides_by_tile: Dictionary = {} # Vector2i -> Array of sides
	for edge: Array in edges:
		var a := Vector2i(edge[0], edge[1])
		var b := Vector2i(edge[2], edge[3])
		var holder := a
		var other := b
		if room_at(b) != NO_ROOM and room_at(a) == NO_ROOM:
			holder = b
			other = a
		var side := side_toward(holder, other)
		if str(edge[4]) == NetMessages.EDGE_DOOR:
			doors.append({"tile": holder, "side": side, "a": a, "b": b})
			continue
		if not sides_by_tile.has(holder):
			sides_by_tile[holder] = []
		sides_by_tile[holder].append(side)
	var tiles := sides_by_tile.keys()
	tiles.sort_custom(func(p: Vector2i, q: Vector2i) -> bool: return p.y < q.y or (p.y == q.y and p.x < q.x))
	for tile: Vector2i in tiles:
		var left: Array = sides_by_tile[tile].duplicate()
		for corner: String in LandTiles.SIDES:
			var pair: Array = LandTiles.CORNERS[corner]
			if left.has(pair[0]) and left.has(pair[1]):
				left.erase(pair[0])
				left.erase(pair[1])
				walls.append({"tile": tile, "sides": pair.duplicate(), "corner": corner})
		for side: String in left:
			walls.append({"tile": tile, "sides": [side], "corner": ""})
