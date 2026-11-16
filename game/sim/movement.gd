class_name SimMovement
extends RefCounted
# Walks characters along a path on the grid, 8 directions (D18, D185).
# One tile every walk_step ticks, a diagonal step as long as a straight one.
# A path may cross a tile another character stands on, but a walk must end on a
# free tile (D52); when the target is taken the character stops on the nearest
# free tile instead. The same for every character (D4): an order comes from a
# player's click or from an NPC's brain, and this can't tell which.

const NONE := "none"
const WALKING := "walking"
const ARRIVED := "arrived"
const NO_PATH := "no path"

var sim: Sim
var pathing: SimPathing

var _walk_ticks: int
var _search_radius: int
var _walks: Dictionary = {} # id -> Walk
var _status: Dictionary = {} # id -> String


class Walk:
	var wanted: Vector2i
	var path: Array[Vector2i] = []
	var next: int = 0
	var progress: int = 0
	var end_status: String = ARRIVED # the status once the last tile is reached


func _init(sim_ref: Sim, pathing_ref: SimPathing) -> void:
	sim = sim_ref
	pathing = pathing_ref
	_walk_ticks = sim.settings.ticks("walk_step")
	_search_radius = int(sim.settings.value("arrival_search_radius"))


# How the character's last order stands: walking, arrived, no path, or none.
# A character still walking on to a free tile after its order ended (see
# _end) already shows how the order ended.
func status(id: int) -> String:
	return _status.get(id, NONE)


# Sends a character to a tile. Returns false when the order ends at once as
# "no path": the target is blocked, outside the grid or in another area.
# A new order keeps the step progress of the walk it replaces, so an order
# repeated faster than a step still moves the character.
func order(id: int, target: Vector2i) -> bool:
	var c := sim.world.get_character(id)
	if c == null:
		return false
	var old: Walk = _walks.get(id)
	var progress := old.progress if old != null else 0
	_walks.erase(id)
	var goal: Variant = _resolve(c, target)
	if goal == null:
		_end(c, NO_PATH, progress)
		return false
	if goal == c.pos:
		_end(c, ARRIVED, progress)
		return true
	var path := pathing.find_path(c.pos, goal)
	if path.is_empty():
		_end(c, NO_PATH, progress)
		return false
	_start(c, target, path, progress, ARRIVED)
	_status[id] = WALKING
	return true


func step() -> void:
	var ids: Array = _walks.keys()
	ids.sort()
	for id in ids:
		var c := sim.world.get_character(id)
		if c == null:
			_walks.erase(id)
			_status.erase(id)
			continue
		var walk: Walk = _walks[id]
		walk.progress += 1
		if walk.progress < _walk_ticks:
			continue
		walk.progress = 0
		var tile := walk.path[walk.next]
		var last := walk.next == walk.path.size() - 1
		if last and not _free_for(id, tile):
			_replan(c, walk)
			continue
		_open_door_between(c.pos, tile)
		sim.world.move_character(id, tile)
		walk.next += 1
		if last:
			_walks.erase(id)
			_status[id] = walk.end_status


# A step straight across a closed door opens it and it stays open (D191). A
# door never blocks a walk, so no area changes; only diagonals around it do.
func _open_door_between(from: Vector2i, to: Vector2i) -> void:
	var w := sim.world
	if w.has_door(from, to) and not w.door_is_open(from, to):
		w.set_door(from, to, true)
		pathing.edge_changed(from, to)


func _start(c: SimCharacter, wanted: Vector2i, path: Array[Vector2i], progress: int, end_status: String) -> void:
	var walk := Walk.new()
	walk.wanted = wanted
	walk.path = path
	walk.progress = progress
	walk.end_status = end_status
	_walks[c.id] = walk


# An order ends with `how`. A walk that ends for any reason settles on a free
# tile (D52): standing where another is held, the character walks on to the
# nearest free tile by walking, keeping `how` as its status.
func _end(c: SimCharacter, how: String, progress: int) -> void:
	_walks.erase(c.id)
	_status[c.id] = how
	if _free_for(c.id, c.pos):
		return
	var goal: Variant = _nearest_free(c.id, c.pos, -1)
	if goal == null:
		return
	var path := pathing.find_path(c.pos, goal)
	if not path.is_empty():
		_start(c, goal, path, progress, how)


# The tile to end on: the target when free for this character, otherwise the
# nearest free tile by walking from the target, within the search radius.
# Null when the target can't be reached or no tile is free (no search has run).
func _resolve(c: SimCharacter, target: Vector2i) -> Variant:
	if not pathing.can_reach(c.pos, target):
		return null
	if _free_for(c.id, target):
		return target
	return _nearest_free(c.id, target, _search_radius)


# The free tile fewest allowed steps from `from`, never across a wall: a search
# outward over the same steps a walk takes (D203, D204), up to `radius` steps
# (no limit below 0). Ties go to the nearest in a straight line, then the
# lowest row, then the lowest column, so the same world gives the same tile.
func _nearest_free(id: int, from: Vector2i, radius: int) -> Variant:
	var w := sim.world
	var seen := {from: true}
	var ring: Array[Vector2i] = [from]
	var depth := 0
	while not ring.is_empty() and (radius < 0 or depth < radius):
		depth += 1
		var next_ring: Array[Vector2i] = []
		var best: Variant = null
		for p in ring:
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var q := p + Vector2i(dx, dy)
					if seen.has(q) or not SimPathing.step_allowed(w, p, q):
						continue
					seen[q] = true
					next_ring.append(q)
					if _free_for(id, q) and (best == null or _closer(q, best, from)):
						best = q
		if best != null:
			return best
		ring = next_ring
	return null


static func _closer(a: Vector2i, b: Vector2i, to: Vector2i) -> bool:
	var da := (a - to).length_squared()
	var db := (b - to).length_squared()
	if da != db:
		return da < db
	if a.y != b.y:
		return a.y < b.y
	return a.x < b.x


# The target was taken while walking: start again from here toward the nearest
# free tile.
func _replan(c: SimCharacter, walk: Walk) -> void:
	var goal: Variant = _resolve(c, walk.wanted)
	if goal == null:
		_end(c, NO_PATH, walk.progress)
		return
	walk.path = pathing.find_path(c.pos, goal)
	walk.next = 0
	if walk.path.is_empty():
		_end(c, walk.end_status if goal == c.pos else NO_PATH, walk.progress)


func _free_for(id: int, p: Vector2i) -> bool:
	var w := sim.world
	if not w.in_bounds(p) or w.tile_blocks_walking(p):
		return false
	var other := w.character_at(p)
	return other == SimWorld.NO_CHARACTER or other == id
