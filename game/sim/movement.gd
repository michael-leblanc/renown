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


func _init(sim_ref: Sim, pathing_ref: SimPathing) -> void:
	sim = sim_ref
	pathing = pathing_ref
	_walk_ticks = sim.settings.ticks("walk_step")
	_search_radius = int(sim.settings.value("arrival_search_radius"))


# How the character's last order stands: walking, arrived, no path, or none.
func status(id: int) -> String:
	return _status.get(id, NONE)


# Sends a character to a tile. Returns false when the order ends at once as
# "no path": the target is blocked, outside the grid or in another area.
func order(id: int, target: Vector2i) -> bool:
	var c := sim.world.get_character(id)
	if c == null:
		return false
	_walks.erase(id)
	var goal: Variant = _resolve(c, target)
	if goal == null:
		_status[id] = NO_PATH
		return false
	if goal == c.pos:
		_status[id] = ARRIVED
		return true
	var walk := Walk.new()
	walk.wanted = target
	walk.path = pathing.find_path(c.pos, goal)
	if walk.path.is_empty():
		_status[id] = NO_PATH
		return false
	_walks[id] = walk
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
		_move_to(c, tile)
		walk.next += 1
		if last:
			_walks.erase(id)
			_status[id] = ARRIVED


# The tile to end on: the target when free for this character, otherwise the
# nearest free tile of the same area within the search radius. Null when the
# target can't be reached or no tile is free (no search has run).
func _resolve(c: SimCharacter, target: Vector2i) -> Variant:
	if not pathing.can_reach(c.pos, target):
		return null
	if _free_for(c.id, target):
		return target
	var area := pathing.area_at(target)
	var best: Variant = null
	var best_d := 0
	for dy in range(-_search_radius, _search_radius + 1):
		for dx in range(-_search_radius, _search_radius + 1):
			var d := dx * dx + dy * dy
			var q := target + Vector2i(dx, dy)
			if (best != null and d >= best_d) or pathing.area_at(q) != area or not _free_for(c.id, q):
				continue
			best = q
			best_d = d
	return best


# The target was taken while walking: start again from here toward the nearest
# free tile.
func _replan(c: SimCharacter, walk: Walk) -> void:
	var goal: Variant = _resolve(c, walk.wanted)
	if goal == null:
		_walks.erase(c.id)
		_status[c.id] = NO_PATH
		return
	walk.path = pathing.find_path(c.pos, goal)
	walk.next = 0
	if walk.path.is_empty():
		_walks.erase(c.id)
		_status[c.id] = ARRIVED if goal == c.pos else NO_PATH


func _free_for(id: int, p: Vector2i) -> bool:
	var w := sim.world
	if not w.in_bounds(p) or w.tile_blocks_walking(p):
		return false
	var other := w.character_at(p)
	return other == SimWorld.NO_CHARACTER or other == id


# A character takes the tile's place only if nobody stands there at rest, so
# one passing through leaves the one at rest on the record.
func _move_to(c: SimCharacter, tile: Vector2i) -> void:
	var at := sim.world._at
	if at.get(c.pos, SimWorld.NO_CHARACTER) == c.id:
		at.erase(c.pos)
	c.pos = tile
	if not at.has(tile):
		at[tile] = c.id
