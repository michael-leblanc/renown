extends GutTest
# Tests sim/snapshot.gd (SIM-014).

var settings: SimSettings
var looks: SimLooks


func before_each() -> void:
	settings = SimSettings.load_file("res://data/settings.json")
	looks = SimLooks.load_file("res://data/looks.json")


func _stand_in(seed_value: int = 5) -> SimStandInWorld:
	return SimStandInWorld.build(seed_value, settings, looks)


# True when no value anywhere in the data is an object.
func _plain(v: Variant) -> bool:
	if v is Object:
		return false
	if v is Dictionary:
		for k in v:
			if not _plain(k) or not _plain(v[k]):
				return false
	elif v is Array:
		for e in v:
			if not _plain(e):
				return false
	return true


func _load(sim: Sim) -> Dictionary:
	return SimSnapshot.restore(SimSnapshot.land(sim), SimSnapshot.living(sim), settings)


# Ends every walk where it stands, as a load does.
func _drop_walks(sim: Sim) -> void:
	for id in sim.world.character_ids():
		var c := sim.world.get_character(id)
		sim.movement.order(id, c.pos)


func test_world_turns_into_two_plain_dictionaries() -> void:
	var s := _stand_in()
	s.sim.steps(10)
	var land := SimSnapshot.land(s.sim)
	var living := SimSnapshot.living(s.sim)
	for key in ["width", "height", "ground", "props", "places", "east_walk", "south_walk", "east_door", "south_door"]:
		assert_true(land.has(key), "land has %s" % key)
	for key in ["characters", "open_doors", "next_character_id", "tick", "rng_state"]:
		assert_true(living.has(key), "living has %s" % key)
	assert_true(living["characters"][0].has_all(["id", "pos", "look"]))
	assert_true(_plain(land))
	assert_true(_plain(living))


func test_loaded_world_matches_the_original() -> void:
	var s := _stand_in()
	s.sim.world.set_door(s.door_inside, s.door_outside, true)
	var r := _load(s.sim)
	assert_eq(r["error"], "")
	var a := s.sim.world
	var b: SimWorld = r["sim"].world
	assert_eq(b.width, a.width)
	for y in a.height:
		for x in a.width:
			var p := Vector2i(x, y)
			assert_eq(b.ground_at(p), a.ground_at(p))
			assert_eq(b.prop_at(p), a.prop_at(p))
			assert_eq(b.place_at(p), a.place_at(p))
			assert_eq(b.tile_blocks_walking(p), a.tile_blocks_walking(p))
			assert_eq(b.tile_blocks_sight(p), a.tile_blocks_sight(p))
			assert_eq(b.character_at(p), a.character_at(p))
			for q in [p + Vector2i(1, 0), p + Vector2i(0, 1)]:
				assert_eq(b.has_door(p, q), a.has_door(p, q))
				assert_eq(b.door_is_open(p, q), a.door_is_open(p, q))
				assert_eq(b.edge_blocks_walking(p, q), a.edge_blocks_walking(p, q))
				assert_eq(b.edge_blocks_sight(p, q), a.edge_blocks_sight(p, q))
	assert_true(b.door_is_open(s.door_inside, s.door_outside))
	for id in a.character_ids():
		assert_eq(b.get_character(id).pos, a.get_character(id).pos)
		assert_eq(b.get_character(id).look, a.get_character(id).look)
	assert_eq(b.next_character_id, a.next_character_id)
	assert_eq(r["sim"].state_hash(), s.sim.state_hash())


func test_saved_then_loaded_world_steps_on_the_same() -> void:
	var s := _stand_in()
	s.sim.steps(100)
	_drop_walks(s.sim)
	var loaded: Sim = _load(s.sim)["sim"]
	assert_eq(loaded.state_hash(), s.sim.state_hash())
	s.sim.steps(200)
	loaded.steps(200)
	assert_eq(loaded.state_hash(), s.sim.state_hash())
	assert_ne(loaded.tick, 100)


func test_npc_keeps_its_brain_and_a_character_without_one_has_none() -> void:
	var s := _stand_in()
	var world := s.sim.world
	var plain := SimCharacter.new(world.new_character_id())
	world.add_character(plain, s.waking_spot)
	var loaded: Sim = _load(s.sim)["sim"]
	var npc: int = s.npc_ids[0]
	assert_eq(loaded.brain.kind_of(npc), SimNpcBrain.KIND)
	assert_eq(loaded.brain.attached(), s.sim.brain.attached())
	assert_eq(loaded.brain.kind_of(plain.id), "")
	assert_not_null(loaded.world.get_character(plain.id))


func test_walking_character_stands_on_its_reached_tile_with_no_walk() -> void:
	var s := _stand_in()
	var id: int = s.npc_ids[0]
	var c := s.sim.world.get_character(id)
	var goal := c.pos
	for d in [Vector2i(3, 0), Vector2i(-3, 0), Vector2i(0, 3), Vector2i(0, -3)]:
		if s.sim.movement.order(id, c.pos + d):
			goal = c.pos + d
			break
	assert_ne(goal, c.pos, "a walk was ordered")
	s.sim.steps(settings.ticks("walk_step") * 2)
	assert_eq(s.sim.movement.status(id), SimMovement.WALKING)
	var reached := c.pos
	var loaded: Sim = _load(s.sim)["sim"]
	assert_eq(loaded.world.get_character(id).pos, reached)
	assert_eq(loaded.movement.status(id), SimMovement.NONE)
	assert_null(loaded.movement.stepping_onto(id))


func test_unknown_character_field_fails_the_load() -> void:
	var s := _stand_in()
	var living := SimSnapshot.living(s.sim)
	living["characters"][0]["hunger"] = 3
	var r := SimSnapshot.restore(SimSnapshot.land(s.sim), living, settings)
	assert_null(r["sim"])
	assert_string_contains(r["error"], "hunger")


func test_tile_outside_the_land_fails_the_load() -> void:
	var s := _stand_in()
	var living := SimSnapshot.living(s.sim)
	living["characters"][0]["pos"] = [999, 2]
	var r := SimSnapshot.restore(SimSnapshot.land(s.sim), living, settings)
	assert_null(r["sim"])
	assert_string_contains(r["error"], "outside the land")
