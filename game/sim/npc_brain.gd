class_name SimNpcBrain
extends RefCounted
# A stand-in brain for NPCs (D181). Each attached NPC thinks once per think
# interval, in turns: NPC number i (in the order attached) thinks on the ticks
# where the brain's tick count is i modulo the interval, so every tick carries
# about the same load. A thought scores a short list of actions and does the
# best one; between two thoughts the NPC keeps doing it, because the walk
# lives in SimMovement and goes on every tick. A character with no brain
# attached is never ordered by this (D4): a brain is just something attached.
#
# The brain reads only what the NPC sees (D28, D179), never true stats.

var thought_last_step: int = 0 # NPCs that thought in the last step, for tests

# A Sim that owns this holds it weakly from here, so the pair can be freed; one
# built on its own holds the Sim strongly.
var sim: Sim:
	get:
		return _sim_hold if _sim_hold != null else _sim_ref.get_ref()
var movement: SimMovement
var sight: SimSight

var _sim_hold: Sim
var _sim_ref: WeakRef
var _interval: int
var _wander_radius: int
var _wander_tries: int
var _wander_score: float
var _stand_score: float
var _tick: int = 0
var _npcs: Array[int] = [] # ids in the order attached
var _thoughts: Dictionary = {} # id -> int
var _seen: Dictionary = {} # id -> Array of ids in sight at its last thought
var _actions: Array = [] # of {name, score: Callable(id) -> float, do: Callable(id)}


func _init(sim_ref: Sim, movement_ref: SimMovement, sight_ref: SimSight, owned_by_sim: bool = false) -> void:
	_sim_ref = weakref(sim_ref)
	if not owned_by_sim:
		_sim_hold = sim_ref
	movement = movement_ref
	sight = sight_ref
	var s := sim_ref.settings
	_interval = s.ticks("think_interval")
	_wander_radius = int(s.value("npc_wander_radius"))
	_wander_tries = int(s.value("npc_wander_tries"))
	_wander_score = float(s.value("npc_wander_score"))
	_stand_score = float(s.value("npc_stand_score"))
	add_action("wander", _score_wander, _do_wander)
	add_action("stand", _score_stand, _do_nothing)


func attach(id: int) -> void:
	if not _npcs.has(id):
		_npcs.append(id)


func detach(id: int) -> void:
	_npcs.erase(id)
	_seen.erase(id)
	_thoughts.erase(id)


# Actions are tried in the order added; the first of equal scores wins.
func add_action(action_name: String, score: Callable, do: Callable) -> void:
	_actions.append({"name": action_name, "score": score, "do": do})


func clear_actions() -> void:
	_actions.clear()


func think_count(id: int) -> int:
	return _thoughts.get(id, 0)


# Who the NPC had in sight when it last thought, in id order.
func in_sight(id: int) -> Array:
	return _seen.get(id, [])


# One tick: the NPCs whose turn it is think.
func step() -> void:
	var slot := _tick % _interval
	_tick += 1
	thought_last_step = 0
	var turn: Array[int] = []
	for i in range(slot, _npcs.size(), _interval):
		if sim.world.get_character(_npcs[i]) != null:
			turn.append(_npcs[i])
	if turn.is_empty():
		return
	sight.rebuild(sim.world._characters.values())
	for id in turn:
		_think(id)
		thought_last_step += 1


func _think(id: int) -> void:
	_seen[id] = sight.in_sight(id)
	_thoughts[id] = think_count(id) + 1
	var best: Variant = null
	var best_score := -INF
	for a in _actions:
		var score: float = a["score"].call(id)
		if score > best_score:
			best_score = score
			best = a
	if best != null:
		best["do"].call(id)


func _score_stand(_id: int) -> float:
	return _stand_score


func _do_nothing(_id: int) -> void:
	pass


# Offered only when not already walking, so a walk in progress is kept.
func _score_wander(id: int) -> float:
	if movement.status(id) == SimMovement.WALKING:
		return -INF
	return _wander_score


func _do_wander(id: int) -> void:
	var c := sim.world.get_character(id)
	for i in _wander_tries:
		var p := c.pos + Vector2i(
			sim.rng.randi_range(-_wander_radius, _wander_radius),
			sim.rng.randi_range(-_wander_radius, _wander_radius))
		if p != c.pos and sim.world.is_free(p) and movement.order(id, p):
			return


# The kind of brain an NPC has, for a save (D182): "stand_in", or "" for none.
const KIND := "stand_in"


func kind_of(id: int) -> String:
	return KIND if _npcs.has(id) else ""


# NPC ids in the order attached, and the brain's tick count: what a save keeps
# so the thinking turns carry on as they were.
func attached() -> Array[int]:
	return _npcs.duplicate()


func tick_count() -> int:
	return _tick


func restore_tick(tick_count_value: int) -> void:
	_tick = tick_count_value
