class_name Pathfinder
extends RefCounted
## Shortest walk on the test patch's tiles (PRO-005, test game D201). Throwaway.
##
## 8 directions, every step (straight or diagonal) takes the same time (D185), so
## "shortest" means fewest steps; a tiny extra cost on diagonals only breaks ties
## in favour of straight steps. Blocked = the tile's blocks_walk (a closed door
## never blocks a walk, D191). Corners: a diagonal step needs both tiles beside
## it free (strict, the default) or at least one of them (D185's literal text
## says only "between two blocked tiles" is forbidden); a setting.
## Areas (D187): every free tile gets an area number once; a target in another
## area or a blocked one is refused at once, with no search.

const DIRS: Array[Vector2i] = [
	Vector2i(1, -1), Vector2i(1, 0), Vector2i(1, 1), Vector2i(0, 1),
	Vector2i(-1, 1), Vector2i(-1, 0), Vector2i(-1, -1), Vector2i(0, -1)]

var gen: WorldGen
var strict_corners := true
var diagonal_extra := 0.001
var areas: Dictionary = {}       # Vector2i -> area number (1, 2, ...), absent when blocked
## What the last find_path decided: "ok", "here", "blocked", "unreachable" or "outside".
var last_result := ""
## Tiles the last search expanded; 0 when it was refused without a search.
var last_expanded := 0


func _init(world_gen: WorldGen, strict := true, extra := 0.001) -> void:
	gen = world_gen
	strict_corners = strict
	diagonal_extra = extra
	relabel()


func inside(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < gen.size and c.y < gen.size


func walkable(c: Vector2i) -> bool:
	if not inside(c):
		return false
	return not gen.tile(c).blocks_walk


## Can a character on `from` step by `d` (one of DIRS)?
func can_step(from: Vector2i, d: Vector2i) -> bool:
	if not walkable(from + d):
		return false
	if d.x != 0 and d.y != 0:
		var a := walkable(from + Vector2i(d.x, 0))
		var b := walkable(from + Vector2i(0, d.y))
		return (a and b) if strict_corners else (a or b)
	return true


## Redo the area numbers (call after a tile changes between blocked and free).
func relabel() -> void:
	areas.clear()
	var next := 0
	for y in gen.size:
		for x in gen.size:
			var start := Vector2i(x, y)
			if areas.has(start) or not walkable(start):
				continue
			next += 1
			areas[start] = next
			var queue: Array[Vector2i] = [start]
			var head := 0
			while head < queue.size():
				var c := queue[head]
				head += 1
				for d in DIRS:
					var n := c + d
					if not areas.has(n) and can_step(c, d):
						areas[n] = next
						queue.append(n)


func area_of(c: Vector2i) -> int:
	return areas.get(c, 0)


## The tiles to walk, next one first, `from` not included. Empty when there is
## nothing to walk; read last_result to know why.
func find_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	last_expanded = 0
	if not inside(to):
		last_result = "outside"
		return out
	if from == to:
		last_result = "here"
		return out
	if not walkable(to):
		last_result = "blocked"
		return out
	if area_of(from) == 0 or area_of(from) != area_of(to):
		last_result = "unreachable"
		return out
	var n := gen.size
	var g := PackedFloat32Array()
	g.resize(n * n)
	g.fill(INF)
	var came := PackedInt32Array()
	came.resize(n * n)
	came.fill(-1)
	var open: Array[Vector3] = []   # (f, sequence, index): the sequence makes ties first-in first-out
	var seq := 0
	var start_i := from.y * n + from.x
	var goal_i := to.y * n + to.x
	g[start_i] = 0.0
	_push(open, Vector3(_h(from, to), seq, start_i))
	var found := false
	while not open.is_empty():
		var top := _pop(open)
		var i := int(top.z)
		if top.x > g[i] + _h(Vector2i(i % n, i / n), to) + 0.00001:
			continue   # an older, worse entry
		last_expanded += 1
		if i == goal_i:
			found = true
			break
		var c := Vector2i(i % n, i / n)
		for d in DIRS:
			if not can_step(c, d):
				continue
			var nb := c + d
			var j := nb.y * n + nb.x
			var cost: float = g[i] + (1.0 + diagonal_extra if (d.x != 0 and d.y != 0) else 1.0)
			if cost < g[j]:
				g[j] = cost
				came[j] = i
				seq += 1
				_push(open, Vector3(cost + _h(nb, to), seq, j))
	if not found:
		last_result = "unreachable"   # should not happen once the areas agree
		return out
	var i := goal_i
	while i != start_i:
		out.push_front(Vector2i(i % n, i / n))
		i = came[i]
	last_result = "ok"
	return out


func _h(a: Vector2i, b: Vector2i) -> float:
	return float(maxi(absi(a.x - b.x), absi(a.y - b.y)))


func _less(a: Vector3, b: Vector3) -> bool:
	return a.x < b.x or (a.x == b.x and a.y < b.y)


func _push(h: Array[Vector3], item: Vector3) -> void:
	h.append(item)
	var i := h.size() - 1
	while i > 0:
		var p := (i - 1) / 2
		if _less(h[i], h[p]):
			var t := h[i]
			h[i] = h[p]
			h[p] = t
			i = p
		else:
			break


func _pop(h: Array[Vector3]) -> Vector3:
	var top := h[0]
	var last: Vector3 = h.pop_back()
	if not h.is_empty():
		h[0] = last
		var i := 0
		while true:
			var l := 2 * i + 1
			var r := l + 1
			var m := i
			if l < h.size() and _less(h[l], h[m]):
				m = l
			if r < h.size() and _less(h[r], h[m]):
				m = r
			if m == i:
				break
			var t := h[i]
			h[i] = h[m]
			h[m] = t
			i = m
	return top
