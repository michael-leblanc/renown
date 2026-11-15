class_name SimSight
extends RefCounted
# Who a character has in sight: within a set distance, with no wall in between,
# worked out on the tile grid (D179). Facing doesn't count. Characters are
# kept in buckets so a query compares only the ones nearby.
#
# The line runs from tile centre to tile centre. Tiles it enters and edges it
# crosses are checked for blocking sight (D190, D203). A line through a tile
# corner is blocked only when both ways around the corner are.

var compared: int = 0 # characters compared by the last queries, for tests

var _world: SimWorld
var _distance: int
var _bucket_size: int
var _chars: Dictionary = {} # id -> SimCharacter
var _buckets: Dictionary = {} # Vector2i -> Array of ids


func _init(world: SimWorld, settings: SimSettings) -> void:
	_world = world
	_distance = int(settings.value("sight_distance"))
	_bucket_size = maxi(1, int(settings.value("sight_bucket_size")))


# Files every given character in its bucket, by where it stands now.
func rebuild(characters: Array) -> void:
	_chars.clear()
	_buckets.clear()
	for c: SimCharacter in characters:
		_chars[c.id] = c
		var key := _bucket_of(c.pos)
		if not _buckets.has(key):
			_buckets[key] = []
		_buckets[key].append(c.id)


# Ids of the characters this one has in sight, in id order.
func in_sight(id: int) -> Array:
	var me: SimCharacter = _chars.get(id)
	var out: Array = []
	if me == null:
		return out
	var lo := _bucket_of(me.pos - Vector2i(_distance, _distance))
	var hi := _bucket_of(me.pos + Vector2i(_distance, _distance))
	for by in range(lo.y, hi.y + 1):
		for bx in range(lo.x, hi.x + 1):
			for other_id: int in _buckets.get(Vector2i(bx, by), []):
				if other_id == id:
					continue
				compared += 1
				var other: SimCharacter = _chars[other_id]
				if sees(me.pos, other.pos):
					out.append(other_id)
	out.sort()
	return out


# Within the distance and nothing in the way, for two tiles.
func sees(a: Vector2i, b: Vector2i) -> bool:
	if (b - a).length_squared() > _distance * _distance:
		return false
	return _line_clear(a, b)


func _bucket_of(p: Vector2i) -> Vector2i:
	return Vector2i(floori(float(p.x) / _bucket_size), floori(float(p.y) / _bucket_size))


# Walks from a to b one tile boundary at a time, in whole numbers: the line
# crosses the k-th vertical boundary at t = (2k-1) / (2*nx) and the m-th
# horizontal one at t = (2m-1) / (2*ny), so the two compare exactly.
func _line_clear(a: Vector2i, b: Vector2i) -> bool:
	var d := b - a
	var nx := absi(d.x)
	var ny := absi(d.y)
	var sx := signi(d.x)
	var sy := signi(d.y)
	var cur := a
	var k := 1
	var m := 1
	while cur != b:
		var step_x := false
		var step_y := false
		if k > nx:
			step_y = true
		elif m > ny:
			step_x = true
		else:
			var tx := (2 * k - 1) * ny
			var ty := (2 * m - 1) * nx
			step_x = tx <= ty
			step_y = ty <= tx
		if step_x and step_y:
			var next := cur + Vector2i(sx, sy)
			var via_x := cur + Vector2i(sx, 0)
			var via_y := cur + Vector2i(0, sy)
			if next != b and _world.tile_blocks_sight(next):
				return false
			if not _way_clear(cur, via_x, next) and not _way_clear(cur, via_y, next):
				return false
			cur = next
			k += 1
			m += 1
		else:
			var next := cur + (Vector2i(sx, 0) if step_x else Vector2i(0, sy))
			if _world.edge_blocks_sight(cur, next):
				return false
			if next != b and _world.tile_blocks_sight(next):
				return false
			cur = next
			if step_x:
				k += 1
			else:
				m += 1
	return true


# One way around a corner: through the tile `via`.
func _way_clear(from: Vector2i, via: Vector2i, to: Vector2i) -> bool:
	return not _world.tile_blocks_sight(via) \
		and not _world.edge_blocks_sight(from, via) \
		and not _world.edge_blocks_sight(via, to)
