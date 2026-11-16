class_name ServerOrders
extends RefCounted
# Carries out a client's walk and door orders on its own character only (D4, D176,
# D187). An order message holds no character id: the server passes the id of the
# character that connection was given, so a client can't move another. The same
# movement and door rules run as for any character. A malformed order, one over
# the per-second limit or one from a connection never welcomed is dropped and
# counted in `dropped`. A refused walk (blocked, unreachable, no such door) is
# not an error and gets no answer: the client sees the result in its views.

var dropped: int = 0

var _sim: Sim
var _per_second: int
var _window_ticks: int
var _window: Dictionary = {} # peer -> [tick the window began, orders in it]


func _init(sim: Sim) -> void:
	_sim = sim
	_per_second = int(sim.settings.value("net_orders_per_second"))
	_window_ticks = maxi(1, sim.settings.tick_rate)


# An order from a peer that has no character.
func drop() -> void:
	dropped += 1


func forget(peer: int) -> void:
	_window.erase(peer)


func handle(peer: int, character_id: int, message: Dictionary) -> void:
	if not _within_limit(peer):
		drop()
		return
	var kind: Variant = message.get("order")
	if typeof(kind) != TYPE_STRING:
		drop()
	elif kind ==NetMessages.ORDER_WALK:
		var to: Variant = _tile(message.get("to"))
		if to == null:
			drop()
			return
		_walk(character_id, to)
	elif kind == NetMessages.ORDER_DOOR:
		var a: Variant = _tile(message.get("a"))
		var b: Variant = _tile(message.get("b"))
		if a == null or b == null:
			drop()
			return
		_sim.doors.use(character_id, a, b)
	else:
		drop()


func _walk(id: int, to: Vector2i) -> void:
	var c := _sim.world.get_character(id)
	if c == null:
		return
	# Blocked or in another area: stay put, no search.
	if _sim.world.tile_blocks_walking(to) or not _sim.pathing.can_reach(c.pos, to):
		return
	_sim.movement.order(id, to)


# At most `net_orders_per_second` orders per peer in a window of one second of ticks.
func _within_limit(peer: int) -> bool:
	var w: Array = _window.get(peer, [_sim.tick, 0])
	if _sim.tick - w[0] >= _window_ticks or _sim.tick < w[0]:
		w = [_sim.tick, 0]
	w[1] += 1
	_window[peer] = w
	return w[1] <= _per_second


# [x, y] of whole numbers inside the map, else null.
func _tile(value: Variant) -> Variant:
	if not value is Array or value.size() != 2:
		return null
	for n in value:
		if typeof(n) not in [TYPE_INT, TYPE_FLOAT] or n != floorf(n):
			return null
	var p := Vector2i(int(value[0]), int(value[1]))
	if not _sim.world.in_bounds(p):
		return null
	return p
