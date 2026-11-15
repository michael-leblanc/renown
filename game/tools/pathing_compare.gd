extends SceneTree
# Compares the two ready-made searches of D203 on the same tests and the same map:
#   AStar2D       one point per free tile, a link where a step is allowed
#   AStarGrid2D   double resolution: tiles on the odd cells, edges and corners
#                 between, a walled edge or a blocked tile is a solid cell
# It prints, for each, whether it passes every test, the average and worst time of a
# search across about 100 and about 400 tiles on a map of walled clumps (D186), the
# time to build the map and to change one edge, and then the pick: the fastest that
# passes every test.
# Run: scripts/godot.sh --headless --path game -s tools/pathing_compare.gd -- --size=512 --searches=20
# --size=N is the map's side (default 512). --searches=N is the searches per distance.
# Uses its own random generator with a fixed seed, so every PC runs the same map.

const MAP_SEED := 186
const CLUMP_SHARE := 0.15
const EDGE_TRIES := 10
const EDGE_WEIGHT := 2.5


# What a search has to offer; the two backends below fill it in.
class Backend:
	var label := ""
	var world: SimWorld

	func build(_w: SimWorld) -> void:
		pass

	# The tiles to walk, from the one after `from` to `to`. Empty when there is no way.
	func find(_from: Vector2i, _to: Vector2i) -> Array[Vector2i]:
		return []

	# Called after the edge between a and b changed.
	func edge_changed(_a: Vector2i, _b: Vector2i) -> void:
		pass


class GraphBackend extends Backend:
	var astar := AStar2D.new()

	func _init() -> void:
		label = "AStar2D"

	func _id(p: Vector2i) -> int:
		return p.y * world.width + p.x

	func build(w: SimWorld) -> void:
		world = w
		astar.clear()
		astar.reserve_space(w.width * w.height)
		for y in w.height:
			for x in w.width:
				var p := Vector2i(x, y)
				if not w.tile_blocks_walking(p):
					astar.add_point(_id(p), Vector2(x, y))
		for y in w.height:
			for x in w.width:
				var p := Vector2i(x, y)
				if w.tile_blocks_walking(p):
					continue
				for d in [Vector2i(1, 0), Vector2i(0, 1), Vector2i(1, 1), Vector2i(-1, 1)]:
					if SimPathing.step_allowed(w, p, p + d):
						astar.connect_points(_id(p), _id(p + d), true)

	func find(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
		var out: Array[Vector2i] = []
		if not astar.has_point(_id(from)) or not astar.has_point(_id(to)):
			return out
		var ids := astar.get_id_path(_id(from), _id(to))
		for i in range(1, ids.size()):
			out.append(Vector2i(ids[i] % world.width, floori(float(ids[i]) / world.width)))
		return out

	func edge_changed(a: Vector2i, b: Vector2i) -> void:
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
					var linked := astar.are_points_connected(_id(p), _id(q))
					var allowed := SimPathing.step_allowed(world, p, q)
					if allowed and not linked:
						astar.connect_points(_id(p), _id(q), true)
					elif linked and not allowed:
						astar.disconnect_points(_id(p), _id(q), true)


class GridBackend extends Backend:
	var grid := AStarGrid2D.new()

	func _init() -> void:
		label = "AStarGrid2D"

	func build(w: SimWorld) -> void:
		world = w
		grid.region = Rect2i(0, 0, 2 * w.width + 1, 2 * w.height + 1)
		grid.cell_size = Vector2.ONE
		grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
		grid.update()
		# Edge and corner cells cost more than tile cells, so a path runs through
		# tile centres and never along an edge or hops between two edges of a tile:
		# those can't be turned back into tile steps. 2.5 is just over 1 + sqrt(2).
		grid.fill_weight_scale_region(grid.region, EDGE_WEIGHT)
		for cy in 2 * w.height + 1:
			for cx in 2 * w.width + 1:
				if _solid(cx, cy):
					grid.set_point_solid(Vector2i(cx, cy), true)
				elif (cx & 1) == 1 and (cy & 1) == 1:
					grid.set_point_weight_scale(Vector2i(cx, cy), 1.0)

	# Is this cell closed to walking? Tiles sit on odd cells, edges between two
	# tiles on one odd and one even, corners on two even.
	func _solid(cx: int, cy: int) -> bool:
		if cx == 0 or cy == 0 or cx == 2 * world.width or cy == 2 * world.height:
			return true
		var odd_x := (cx & 1) == 1
		var odd_y := (cy & 1) == 1
		if odd_x and odd_y:
			return world.tile_blocks_walking(Vector2i(cx >> 1, cy >> 1))
		if odd_y:
			var left := Vector2i((cx >> 1) - 1, cy >> 1)
			var right := Vector2i(cx >> 1, cy >> 1)
			return world.tile_blocks_walking(left) or world.tile_blocks_walking(right) \
					or world.edge_blocks_walking(left, right)
		if odd_x:
			var up := Vector2i(cx >> 1, (cy >> 1) - 1)
			var down := Vector2i(cx >> 1, cy >> 1)
			return world.tile_blocks_walking(up) or world.tile_blocks_walking(down) \
					or world.edge_blocks_walking(up, down)
		# A corner: closed where a diagonal across it is forbidden (D204).
		var nw := Vector2i((cx >> 1) - 1, (cy >> 1) - 1)
		var ne := nw + Vector2i(1, 0)
		var sw := nw + Vector2i(0, 1)
		var se := nw + Vector2i(1, 1)
		for t in [nw, ne, sw, se]:
			if world.tile_blocks_walking(t):
				return true
		for e in [[nw, ne], [sw, se], [nw, sw], [ne, se]]:
			if world.edge_blocks_walking(e[0], e[1]) or world.has_door(e[0], e[1]):
				return true
		return false

	func _refresh(c: Vector2i) -> void:
		grid.set_point_solid(c, _solid(c.x, c.y))

	func edge_changed(a: Vector2i, b: Vector2i) -> void:
		var edge := Vector2i(a.x + b.x + 1, a.y + b.y + 1)
		var along := Vector2i(0, 1) if a.y == b.y else Vector2i(1, 0)
		_refresh(edge)
		_refresh(edge + along)
		_refresh(edge - along)

	func find(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
		var out: Array[Vector2i] = []
		var cells := grid.get_id_path(Vector2i(2 * from.x + 1, 2 * from.y + 1),
				Vector2i(2 * to.x + 1, 2 * to.y + 1))
		var last := from
		for i in cells.size():
			var c := cells[i]
			if i > 0:
				var p := cells[i - 1]
				if _is_edge_cell(p) and _is_edge_cell(c):
					# A hop between two edges of one tile: that tile is walked.
					var t := Vector2i(c.x, p.y)
					if (t.x & 1) == 0:
						t = Vector2i(p.x, c.y)
					last = _take(out, last, t)
			if (c.x & 1) == 1 and (c.y & 1) == 1:
				last = _take(out, last, c)
		return out

	func _is_edge_cell(c: Vector2i) -> bool:
		return (c.x & 1) != (c.y & 1)

	func _take(out: Array[Vector2i], last: Vector2i, cell: Vector2i) -> Vector2i:
		var tile := Vector2i(cell.x >> 1, cell.y >> 1)
		if tile != last:
			out.append(tile)
		return tile


var _rng := RandomNumberGenerator.new()


func _initialize() -> void:
	var size := 512
	var searches := 20
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--size="):
			size = int(arg.trim_prefix("--size="))
		elif arg.begins_with("--searches="):
			searches = int(arg.trim_prefix("--searches="))
	_rng.seed = MAP_SEED
	var backends: Array[Backend] = [GraphBackend.new(), GridBackend.new()]

	print("map %d by %d, walled clumps (D186), %d searches a distance" % [size, size, searches])
	var map := _make_map(size)
	var areas := SimPathing.label_areas(map)
	var near := _pairs(map, areas, 100, searches)
	var far := _pairs(map, areas, 400, searches)

	var best: Backend = null
	var best_avg := INF
	for b in backends:
		var tests_ok := _run_tests(b)
		var started := Time.get_ticks_usec()
		b.build(map)
		var build_ms := (Time.get_ticks_usec() - started) / 1000.0
		var edge_ms := _time_edge_changes(b, map)
		var near_stats := _time_searches(b, map, near)
		var far_stats := _time_searches(b, map, far)
		var passes: bool = tests_ok and near_stats.bad == 0 and far_stats.bad == 0
		print("%s: %s every test (%d bad paths on the map)" % [
			b.label, "passes" if passes else "FAILS", near_stats.bad + far_stats.bad])
		print("  build the map: %.1f ms; change one edge: %.3f ms" % [build_ms, edge_ms])
		print("  100 tiles: average %.3f ms, worst %.3f ms (%d searches)" % [
			near_stats.avg, near_stats.worst, near.size()])
		print("  400 tiles: average %.3f ms, worst %.3f ms (%d searches)" % [
			far_stats.avg, far_stats.worst, far.size()])
		var score: float = far_stats.avg if far.size() > 0 else near_stats.avg
		if passes and score < best_avg:
			best = b
			best_avg = score
	if best == null:
		print("pick: none passes every test, write a search by hand (D203)")
	else:
		print("pick: %s (fastest average search across about 400 tiles of those passing every test)" % best.label)
	quit(0)


# --- The tests: the same small worlds for every backend --------------------

func _cases() -> Array:
	var cases: Array = []

	var wall := SimWorld.new(12, 12)
	for y in range(0, 10):
		wall.set_blocked(Vector2i(6, y), true)
	cases.append(_case("wall of tiles", wall, Vector2i(3, 5), Vector2i(9, 5), 7))

	var edges := SimWorld.new(12, 12)
	for y in range(0, 10):
		edges.set_edge_flags(Vector2i(6, y), Vector2i(7, y), true, true)
	cases.append(_case("line of edges", edges, Vector2i(3, 5), Vector2i(9, 5), 7))

	var house := SimWorld.new(20, 20)
	for x in range(5, 10):
		house.set_edge_flags(Vector2i(x, 4), Vector2i(x, 5), true, true)
		if x != 7:
			house.set_edge_flags(Vector2i(x, 8), Vector2i(x, 9), true, true)
	for y in range(5, 9):
		house.set_edge_flags(Vector2i(4, y), Vector2i(5, y), true, true)
		house.set_edge_flags(Vector2i(9, y), Vector2i(10, y), true, true)
	house.set_edge_flags(Vector2i(7, 8), Vector2i(7, 9), false, true)
	house.set_door(Vector2i(7, 8), Vector2i(7, 9), false)
	cases.append(_case("building with a door", house, Vector2i(7, 14), Vector2i(7, 5), 9))

	var side := SimWorld.new(8, 8)
	side.set_blocked(Vector2i(4, 3), true)
	cases.append(_case("diagonal past a blocked side tile", side, Vector2i(3, 3), Vector2i(4, 4), 2))

	var corner_edges := [
		[Vector2i(3, 3), Vector2i(4, 3)], [Vector2i(3, 4), Vector2i(4, 4)],
		[Vector2i(3, 3), Vector2i(3, 4)], [Vector2i(4, 3), Vector2i(4, 4)],
	]
	for e in corner_edges:
		var w := SimWorld.new(8, 8)
		w.set_edge_flags(e[0], e[1], true, true)
		cases.append(_case("diagonal across a walled corner %s" % [e], w, Vector2i(3, 3), Vector2i(4, 4), 2))
		var d := SimWorld.new(8, 8)
		d.set_door(e[0], e[1], true)
		cases.append(_case("diagonal across a door corner %s" % [e], d, Vector2i(3, 3), Vector2i(4, 4), 2))

	var pocket := SimWorld.new(12, 12)
	for i in range(6, 9):
		pocket.set_edge_flags(Vector2i(i, 5), Vector2i(i, 6), true, true)
		pocket.set_edge_flags(Vector2i(i, 8), Vector2i(i, 9), true, true)
		pocket.set_edge_flags(Vector2i(5, i), Vector2i(6, i), true, true)
		pocket.set_edge_flags(Vector2i(8, i), Vector2i(9, i), true, true)
	cases.append(_case("pocket with no way in", pocket, Vector2i(1, 1), Vector2i(7, 7), 0))
	return cases


func _case(case_name: String, w: SimWorld, from: Vector2i, to: Vector2i, min_steps: int) -> Dictionary:
	return {"name": case_name, "world": w, "from": from, "to": to, "min_steps": min_steps}


func _run_tests(b: Backend) -> bool:
	var all_ok := true
	for c in _cases():
		b.build(c.world)
		var path := b.find(c.from, c.to)
		var ok := _valid(c.world, c.from, c.to, path, c.min_steps)
		if not ok:
			all_ok = false
			print("  %s fails: %s, path %s" % [b.label, c.name, path])
	return all_ok


# A path is right when it ends on the target, every step is allowed, and it is
# at least min_steps long (0 = no way, so empty).
func _valid(w: SimWorld, from: Vector2i, to: Vector2i, path: Array[Vector2i], min_steps: int) -> bool:
	if min_steps == 0:
		return path.is_empty()
	if path.size() < min_steps or path.back() != to:
		return false
	var at := from
	for p in path:
		if not SimPathing.step_allowed(w, at, p):
			return false
		at = p
	return true


# --- The map and the timings ------------------------------------------------

# Clumps 3 to 9 tiles a side until about 15% of the map is covered, half of them
# rocks (blocked tiles) and half buildings (walls on the edges, one door).
func _make_map(size: int) -> SimWorld:
	var w := SimWorld.new(size, size)
	var claimed := PackedByteArray()
	claimed.resize(size * size)
	var covered := 0
	var wanted := int(size * size * CLUMP_SHARE)
	var building := false
	var tries := 0
	while covered < wanted and tries < 50000:
		tries += 1
		var cw := _rng.randi_range(3, 9)
		var ch := _rng.randi_range(3, 9)
		if size < 14 or size < cw + 4 or size < ch + 4:
			continue
		var x0 := _rng.randi_range(2, size - cw - 2)
		var y0 := _rng.randi_range(2, size - ch - 2)
		if _any_claimed(claimed, size, Rect2i(x0 - 1, y0 - 1, cw + 2, ch + 2)):
			continue
		for y in range(y0 - 1, y0 + ch + 1):
			for x in range(x0 - 1, x0 + cw + 1):
				claimed[y * size + x] = 1
		covered += cw * ch
		if building:
			_wall_building(w, Rect2i(x0, y0, cw, ch))
		else:
			for y in range(y0, y0 + ch):
				for x in range(x0, x0 + cw):
					w.set_blocked(Vector2i(x, y), true)
		building = not building
	return w


func _any_claimed(claimed: PackedByteArray, size: int, r: Rect2i) -> bool:
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			if claimed[y * size + x] == 1:
				return true
	return false


func _wall_building(w: SimWorld, r: Rect2i) -> void:
	var ring: Array = []
	for x in range(r.position.x, r.end.x):
		ring.append([Vector2i(x, r.position.y - 1), Vector2i(x, r.position.y)])
		ring.append([Vector2i(x, r.end.y - 1), Vector2i(x, r.end.y)])
	for y in range(r.position.y, r.end.y):
		ring.append([Vector2i(r.position.x - 1, y), Vector2i(r.position.x, y)])
		ring.append([Vector2i(r.end.x - 1, y), Vector2i(r.end.x, y)])
	var door := _rng.randi_range(0, ring.size() - 1)
	for i in ring.size():
		var e: Array = ring[i]
		w.set_edge_flags(e[0], e[1], i != door, true)
		if i == door:
			w.set_door(e[0], e[1], false)


# Pairs of free tiles in one area, about `dist` tiles apart (within 10%).
func _pairs(w: SimWorld, areas: PackedInt32Array, dist: int, count: int) -> Array:
	var out: Array = []
	var tries := 0
	while out.size() < count and tries < count * 400:
		tries += 1
		var a := Vector2i(_rng.randi_range(0, w.width - 1), _rng.randi_range(0, w.height - 1))
		var d := _rng.randi_range(int(dist * 0.9), int(dist * 1.1))
		var dir := 1 if _rng.randi_range(0, 1) == 0 else -1
		var off := _rng.randi_range(-d, d)
		var b := a + (Vector2i(dir * d, off) if _rng.randi_range(0, 1) == 0 else Vector2i(off, dir * d))
		if not w.in_bounds(b) or w.tile_blocks_walking(a) or w.tile_blocks_walking(b):
			continue
		var area := areas[a.y * w.width + a.x]
		if area != SimPathing.NO_AREA and area == areas[b.y * w.width + b.x]:
			out.append([a, b])
	return out


func _time_searches(b: Backend, w: SimWorld, pairs: Array) -> Dictionary:
	var total := 0.0
	var worst := 0.0
	var bad := 0
	for pair in pairs:
		var started := Time.get_ticks_usec()
		var path := b.find(pair[0], pair[1])
		var ms := (Time.get_ticks_usec() - started) / 1000.0
		total += ms
		worst = maxf(worst, ms)
		if not _valid(w, pair[0], pair[1], path, 1):
			bad += 1
	return {"avg": total / maxf(1.0, pairs.size()), "worst": worst, "bad": bad}


# Average time of backend.edge_changed() over walls put up and taken down again.
func _time_edge_changes(b: Backend, w: SimWorld) -> float:
	var total := 0.0
	var n := 0
	var tries := 0
	while n < EDGE_TRIES and tries < 1000:
		tries += 1
		var p := Vector2i(_rng.randi_range(1, w.width - 3), _rng.randi_range(1, w.height - 2))
		var q := p + Vector2i(1, 0)
		if w.tile_blocks_walking(p) or w.tile_blocks_walking(q) or w.edge_blocks_walking(p, q) \
				or w.has_door(p, q):
			continue
		for wall in [true, false]:
			w.set_edge_flags(p, q, wall, wall)
			var started := Time.get_ticks_usec()
			b.edge_changed(p, q)
			total += (Time.get_ticks_usec() - started) / 1000.0
		n += 1
	return total / maxf(1.0, n * 2)
