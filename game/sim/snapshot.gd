class_name SimSnapshot
extends RefCounted
# The world as two plain dictionaries and back (D182, D180). The land is what
# is written once; the living state is what changes. Neither holds an object.
# A walk in progress is not saved: the character stands on the tile it had
# reached. No file is written here.

const CHARACTER_FIELDS := ["id", "pos", "look", "stats", "talents", "brain"]
const LIVING_FIELDS := ["seed", "tick", "rng_state", "next_character_id", "brain_tick",
		"brain_order", "characters", "open_doors"]


static func land(sim: Sim) -> Dictionary:
	return sim.world.export_land()


static func living(sim: Sim) -> Dictionary:
	var world := sim.world
	var characters: Array = []
	for id in world.character_ids():
		var c := world.get_character(id)
		var brain := ""
		if sim._brain != null:
			brain = sim._brain.kind_of(id)
		characters.append({"id": c.id, "pos": [c.pos.x, c.pos.y],
				"look": c.look.duplicate(true), "stats": c.stats.duplicate(),
					"talents": c.talents.duplicate(true), "brain": brain})
	return {
		"seed": sim.world_seed, "tick": sim.tick, "rng_state": sim.rng.state,
		"next_character_id": world.next_character_id,
		"brain_tick": sim._brain.tick_count() if sim._brain != null else 0,
		"brain_order": sim._brain.attached() if sim._brain != null else [],
		"characters": characters, "open_doors": world.open_doors(),
	}


# Returns {"sim": Sim, "error": ""} or {"sim": null, "error": message}.
static func restore(land_data: Dictionary, living_data: Dictionary, settings: SimSettings) -> Dictionary:
	var world := SimWorld.from_land(land_data)
	if world == null:
		return _fail("land data is not a land")
	for key in living_data:
		if not key in LIVING_FIELDS:
			return _fail("unknown living field: %s" % key)
	for key in LIVING_FIELDS:
		if not living_data.has(key):
			return _fail("missing living field: %s" % key)
	var ints := ["seed", "tick", "rng_state", "next_character_id", "brain_tick"]
	for key in ints:
		if not living_data[key] is int:
			return _fail("living field %s must be a whole number" % key)
	if not living_data["brain_order"] is Array or not living_data["characters"] is Array or not living_data["open_doors"] is Array:
		return _fail("characters and open_doors must be lists")
	for d in living_data["open_doors"]:
		if not (d is Array and d.size() == 3 and d[0] is int and d[1] is int and d[2] is String) \
				or not world.open_door_at(d[0], d[1], d[2]):
			return _fail("open door names no door: %s" % str(d))
	var sim := Sim.new(living_data["seed"], settings, world)
	sim.tick = living_data["tick"]
	sim.rng.state = living_data["rng_state"]
	world.next_character_id = living_data["next_character_id"]
	var brained: Array[int] = []
	for entry in living_data["characters"]:
		if not entry is Dictionary:
			return _fail("a character must be a dictionary")
		for key in entry:
			if not key in CHARACTER_FIELDS:
				return _fail("unknown character field: %s" % key)
		for key in CHARACTER_FIELDS:
			if not entry.has(key):
				return _fail("character is missing field: %s" % key)
		var pos: Variant = entry["pos"]
		if not (entry["id"] is int and pos is Array and pos.size() == 2 and pos[0] is int \
				and pos[1] is int and entry["look"] is Dictionary and entry["stats"] is Dictionary \
					and entry["talents"] is Array and entry["brain"] is String):
			return _fail("character %s has a field of the wrong kind" % str(entry["id"]))
		var tile := Vector2i(pos[0], pos[1])
		if not world.in_bounds(tile):
			return _fail("character %d is on tile %s, outside the land" % [entry["id"], str(tile)])
		if not entry["brain"] in ["", SimNpcBrain.KIND]:
			return _fail("character %d has an unknown brain: %s" % [entry["id"], entry["brain"]])
		var c := SimCharacter.new(entry["id"])
		c.look = entry["look"].duplicate(true)
		c.stats = entry["stats"].duplicate()
		c.talents = entry["talents"].duplicate(true)
		if not world.add_character(c, tile):
			return _fail("character %d cannot stand on tile %s" % [entry["id"], str(tile)])
		if entry["brain"] == SimNpcBrain.KIND:
			brained.append(c.id)
	if not brained.is_empty():
		for id in living_data["brain_order"]:
			if id in brained:
				sim.brain.attach(id)
		sim.brain.restore_tick(living_data["brain_tick"])
	return {"sim": sim, "error": ""}


static func _fail(message: String) -> Dictionary:
	return {"sim": null, "error": message}
