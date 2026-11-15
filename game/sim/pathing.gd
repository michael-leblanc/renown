class_name SimPathing
extends RefCounted
# Finding a way across the tile grid, 8 directions, with walls on edges (D203).
# A step is allowed by step_allowed(): a diagonal needs both side tiles free and
# no edge meeting at its corner that blocks walking or holds a door (D204).
# Characters are not obstacles (D52), so they never change anything in here.
#
# The search is Godot's AStar2D: one point per free tile, a link wherever a step
# is allowed. It was picked over AStarGrid2D at double resolution by
# tools/pathing_compare.gd (D203).
#
# Free tiles carry the number of their connected area, labelled when the map is
# made (D187). A walk to a blocked tile or to another area is refused with no
# search; `searches` counts the searches that ran, `relabels` the times the
# whole map was labelled again.

const NO_AREA := -1

var world: SimWorld
var searches: int = 0
var relabels: int = 0

var _area: PackedInt32Array
var _astar := AStar2D.new()


func _init(sim_world: SimWorld) -> void:
	world = sim_world
	_astar.reserve_space(world.width * world.height)
	for y in world.height:
		for x in world.width:
			var p := Vector2i(x, y)
			if not world.tile_blocks_walking(p):
				_astar.add_point(_id(p), Vector2(x, y))
	for y in world.height:
		for x in world.width:
			var p := Vector2i(x, y)
			if world.tile_blocks_walking(p):
				continue
			for d in [Vector2i(1, 0), Vector2i(0, 1), Vector2i(1, 1), Vector2i(-1, 1)]:
				if step_allowed(world, p, p + d):
					_astar.connect_points(_id(p), _id(p + d), true)
	_area = label_areas(world)


func _id(p: Vector2i) -> int:
	return p.y * world.width + p.x


# True when a character may step from a to b, a step to one of the 8 neighbours.
static func step_allowed(w: SimWorld, a: Vector2i, b: Vector2i) -> bool:
	var d := b - a
	if d == Vector2i.ZERO or absi(d.x) > 1 or absi(d.y) > 1:
		return false
	if w.tile_blocks_walking(a) or w.tile_blocks_walking(b):
		return false
	if d.x == 0 or d.y == 0:
		return not w.edge_blocks_walking(a, b)
	var side_x := Vector2i(b.x, a.y)
	var side_y := Vector2i(a.x, b.y)
	if w.tile_blocks_walking(side_x) or w.tile_blocks_walking(side_y):
		return false
	return not (_edge_stops_diagonal(w, a, side_x) or _edge_stops_diagonal(w, a, side_y) \
			or _edge_stops_diagonal(w, side_x, b) or _edge_stops_diagonal(w, side_y, b))


# An edge at the corner a diagonal crosses: a wall or a door both forbid it.
static func _edge_stops_diagonal(w: SimWorld, a: Vector2i, b: Vector2i) -> bool:
	return w.edge_blocks_walking(a, b) or w.has_door(a, b)


# The number of the connected area of every tile, NO_AREA on a blocked tile.
# Areas never cross an edge that blocks walking; a diagonal step joins nothing
# a straight one doesn't.
static func label_areas(w: SimWorld) -> PackedInt32Array:
	var area := PackedInt32Array()
	area.resize(w.width * w.height)
	area.fill(NO_AREA)
	var next_area := 0
	var stack: Array[Vector2i] = []
	for y in w.height:
		for x in w.width:
			var start := Vector2i(x, y)
			if area[y * w.width + x] != NO_AREA or w.tile_blocks_walking(start):
				continue
			area[y * w.width + x] = next_area
			stack.append(start)
			while not stack.is_empty():
				var p: Vector2i = stack.pop_back()
				for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var q: Vector2i = p + d
					if step_allowed(w, p, q) and area[q.y * w.width + q.x] == NO_AREA:
						area[q.y * w.width + q.x] = next_area
						stack.append(q)
			next_area += 1
	return area


func area_at(p: Vector2i) -> int:
	if not world.in_bounds(p):
		return NO_AREA
	return _area[_id(p)]


# True when a search could find a way: both ends free and in one area.
func can_reach(from: Vector2i, to: Vector2i) -> bool:
	var a := area_at(from)
	return a != NO_AREA and a == area_at(to)


# The tiles to walk, from the one after `from` up to `to`. Empty when there is
# no way, or nowhere to go. No search runs unless can_reach().
func find_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	if from == to or not can_reach(from, to):
		return out
	searches += 1
	var ids := _astar.get_id_path(_id(from), _id(to))
	for i in range(1, ids.size()):
		out.append(Vector2i(ids[i] % world.width, floori(float(ids[i]) / world.width)))
	return out


# Call after set_edge_flags() or set_door() on the edge between a and b: the
# links round both ends of the edge are redone. Areas join only by straight
# links, so the whole map is labelled again only when a straight link changed.
# A door never blocks walking, so opening or closing one changes only diagonal
# links and relabels nothing.
func edge_changed(a: Vector2i, b: Vector2i) -> void:
	var straight_changed := false
	var across := Vector2i(absi(b.y - a.y), absi(b.x - a.x))
	var near: Array[Vector2i] = [a, b, a + across, a - across, b + across, b - across]
	for p in near:
		if not world.in_bounds(p) or world.tile_blocks_walking(p):
			continue
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				var q := p + Vector2i(dx, dy)
				if (dx == 0 and dy == 0) or not world.in_bounds(q) or world.tile_blocks_walking(q):
					continue
				var linked := _astar.are_points_connected(_id(p), _id(q))
				var allowed := step_allowed(world, p, q)
				if allowed == linked:
					continue
				if allowed:
					_astar.connect_points(_id(p), _id(q), true)
				else:
					_astar.disconnect_points(_id(p), _id(q), true)
				if dx == 0 or dy == 0:
					straight_changed = true
	if straight_changed:
		_area = label_areas(world)
		relabels += 1
