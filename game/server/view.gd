class_name ServerView
extends RefCounted
# Builds what one character is sent (D176, D215): the welcome once, with the
# whole stand-in land, then a view every tick with the characters and doors it
# has in sight. Nothing else about a character leaves the server: no brain, no
# walk target, no order. Sight is rebuilt once per tick, however many views are
# built in it (D179).

var sim: Sim
var sight_rebuilds: int = 0 # times sight was rebuilt, for tests

var _tick_rate: int
var _walk_time: float
var _sight_tick: int = -1
var _edges: Array = [] # [ax, ay, bx, by, kind], walls and doors
var _doors: Array = [] # [a, b] as Vector2i, for every door


func _init(sim_ref: Sim, settings: SimSettings) -> void:
	sim = sim_ref
	_tick_rate = settings.tick_rate
	_walk_time = float(settings.ticks("walk_step")) / settings.tick_rate
	rescan_edges()


# Looks for walls and doors again; call when one is added or removed.
func rescan_edges() -> void:
	var w := sim.world
	_edges.clear()
	_doors.clear()
	for y in w.height:
		for x in w.width:
			var p := Vector2i(x, y)
			for q: Vector2i in [p + Vector2i(1, 0), p + Vector2i(0, 1)]:
				if not w.in_bounds(q):
					continue
				if w.has_door(p, q):
					_edges.append([p.x, p.y, q.x, q.y, NetMessages.EDGE_DOOR])
					_doors.append([p, q])
				elif w.edge_blocks_walking(p, q) or w.edge_blocks_sight(p, q):
					_edges.append([p.x, p.y, q.x, q.y, NetMessages.EDGE_WALL])


# Sight is filed again the next time a view is built.
func invalidate() -> void:
	_sight_tick = -1


func welcome(id: int) -> Dictionary:
	var w := sim.world
	var ground: Array = []
	var props: Array = []
	for y in w.height:
		for x in w.width:
			ground.append(w.ground_at(Vector2i(x, y)))
			props.append(w.prop_at(Vector2i(x, y)))
	return NetMessages.welcome(id, _tick_rate, _walk_time, w.width, w.height, ground, props, _edges.duplicate(true))


# The viewer, and every character and door it has in sight.
func view(id: int) -> Dictionary:
	var w := sim.world
	var me := w.get_character(id)
	var characters: Array = []
	var doors: Array = []
	if me == null:
		return NetMessages.view(sim.tick, characters, doors)
	_refresh_sight()
	var ids: Array = sim.sight.in_sight(id)
	ids.append(id)
	ids.sort()
	for other_id: int in ids:
		characters.append(_seen(w.get_character(other_id)))
	for d in _doors:
		if sim.sight.sees(me.pos, d[0]) or sim.sight.sees(me.pos, d[1]):
			var state := NetMessages.DOOR_OPEN if w.door_is_open(d[0], d[1]) else NetMessages.DOOR_CLOSED
			doors.append(NetMessages.seen_door(_tile(d[0]), _tile(d[1]), state))
	return NetMessages.view(sim.tick, characters, doors)


func _refresh_sight() -> void:
	if _sight_tick == sim.tick:
		return
	sim.sight.rebuild(sim.world._characters.values())
	sight_rebuilds += 1
	_sight_tick = sim.tick


func _seen(c: SimCharacter) -> Dictionary:
	var stepping: Array = []
	var onto: Variant = sim.movement.stepping_onto(c.id)
	if onto != null:
		stepping = _tile(onto)
	var parts: Array = []
	var slots: Dictionary = c.look.get("slots", {})
	for slot in SimLooks.SLOTS:
		var worn: Variant = slots.get(slot)
		if worn is Dictionary:
			parts.append({"slot": slot, "part": worn["part"], "colour": worn["colour"]})
	return NetMessages.seen_character(c.id, _tile(c.pos), stepping, c.look.get("race", ""), parts)


static func _tile(p: Vector2i) -> Array:
	return [p.x, p.y]
