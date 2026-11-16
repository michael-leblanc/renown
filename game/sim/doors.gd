class_name SimDoors
extends RefCounted
# Using a door (D191, D203): any character can open or close any door, from one
# of the door's two tiles. A character elsewhere is walked to the nearer of the
# two it can reach, and the door changes on arrival. The same for every
# character (D4): the order comes from a click or from a brain.
# Walking across a closed door opens it; that lives in SimMovement.

var world: SimWorld
var movement: SimMovement
var pathing: SimPathing

var _pending: Dictionary = {} # character id -> [a, b, the walk orders it had]


func _init(world_ref: SimWorld, movement_ref: SimMovement, pathing_ref: SimPathing) -> void:
	world = world_ref
	movement = movement_ref
	pathing = pathing_ref


# Orders a character to use the door on the edge a-b. Returns false, changing
# nothing, when there is no such door, no such character, or neither tile can
# be reached.
func use(id: int, a: Vector2i, b: Vector2i) -> bool:
	var c := world.get_character(id)
	if c == null or not world.has_door(a, b):
		return false
	_pending.erase(id)
	if c.pos == a or c.pos == b:
		_toggle(a, b)
		return true
	var best: Variant = null
	var best_len := 0
	for t in [a, b]:
		if not pathing.can_reach(c.pos, t):
			continue
		var n := pathing.find_path(c.pos, t).size()
		if best == null or n < best_len:
			best = t
			best_len = n
	if best == null or not movement.order(id, best):
		return false
	_pending[id] = [a, b, movement.orders(id)]
	return true


# Call once a tick after the walks advance: a character that arrived beside its
# door changes it; one whose walk ended elsewhere, or that was given another
# walk, gives the order up.
func step() -> void:
	var ids: Array = _pending.keys()
	ids.sort()
	for id in ids:
		var c := world.get_character(id)
		var edge: Array = _pending[id]
		if c == null or movement.orders(id) != edge[2]:
			_pending.erase(id)
		elif c.pos == edge[0] or c.pos == edge[1]:
			_pending.erase(id)
			_toggle(edge[0], edge[1])
		elif movement.status(id) != SimMovement.WALKING:
			_pending.erase(id)


func _toggle(a: Vector2i, b: Vector2i) -> void:
	world.set_door(a, b, not world.door_is_open(a, b))
	pathing.edge_changed(a, b)
