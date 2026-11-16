extends GutTest
# Tests sim/stand_in_world.gd (SIM-010).

const World := preload("res://sim/world.gd")


func _build(world_seed: int) -> SimStandInWorld:
	var settings := SimSettings.load_file("res://data/settings.json")
	var looks := SimLooks.load_file("res://data/looks.json")
	return SimStandInWorld.build(world_seed, settings, looks)


func _building(s: SimStandInWorld) -> Rect2i:
	return s.building


func test_given_seed_1_when_built_then_64_by_64_grass_with_one_5_by_4_building_with_walls_on_its_edges_one_door_and_20_floor_tiles() -> void:
	var s := _build(1)
	var w := s.sim.world
	assert_eq(w.width, 64)
	assert_eq(w.height, 64)
	for y in 64:
		for x in 64:
			assert_eq(w.ground_at(Vector2i(x, y)), World.GROUND_GRASS)
	var b := s.building
	assert_eq(b.size, Vector2i(5, 4))
	assert_lt(absi(b.get_center().x - 32), 4)
	assert_lt(absi(b.get_center().y - 32), 4)
	var floor_tiles := 0
	var doors := 0
	var walls := 0
	for y in range(b.position.y - 1, b.end.y + 1):
		for x in range(b.position.x - 1, b.end.x + 1):
			var p := Vector2i(x, y)
			if b.has_point(p):
				floor_tiles += 1
				assert_eq(w.place_at(p), s.place_id)
				assert_false(w.tile_blocks_walking(p))
			else:
				assert_eq(w.place_at(p), World.NO_PLACE)
			for d in [Vector2i(1, 0), Vector2i(0, 1)]:
				var q: Vector2i = p + d
				if b.has_point(p) != b.has_point(q):
					# An outer edge: a wall, or the door.
					if w.has_door(p, q):
						doors += 1
						assert_false(w.edge_blocks_walking(p, q))
					else:
						walls += 1
						assert_true(w.edge_blocks_walking(p, q))
						assert_true(w.edge_blocks_sight(p, q))
				elif b.has_point(p) and b.has_point(q):
					assert_false(w.edge_blocks_walking(p, q), "no wall inside")
	assert_eq(floor_tiles, 20)
	assert_eq(doors, 1)
	assert_eq(walls, 2 * 5 + 2 * 4 - 1)


func test_given_seed_1_when_built_then_trees_and_rocks_stand_on_6_to_10_percent_of_the_tiles_outside_and_none_on_the_waking_spot_or_near_the_door() -> void:
	var s := _build(1)
	var w := s.sim.world
	var outside := 0
	var props := 0
	var trees := 0
	var rocks := 0
	for y in 64:
		for x in 64:
			var p := Vector2i(x, y)
			var kind := w.prop_at(p)
			if s.building.has_point(p):
				assert_eq(kind, World.PROP_NONE)
				continue
			outside += 1
			if kind != World.PROP_NONE:
				props += 1
				if kind == World.PROP_TREE:
					trees += 1
				else:
					rocks += 1
				assert_gt(maxi(absi(p.x - s.door_outside.x), absi(p.y - s.door_outside.y)), 2)
	assert_gte(props, int(outside * 0.06))
	assert_lte(props, int(outside * 0.10))
	assert_gt(trees, 0)
	assert_gt(rocks, 0)
	assert_eq(w.prop_at(s.waking_spot), World.PROP_NONE)


func test_given_seeds_0_to_20_when_the_areas_are_read_then_every_free_tile_and_the_floor_are_in_one_area() -> void:
	for world_seed in range(0, 21):
		var s := _build(world_seed)
		var w := s.sim.world
		var pathing := s.sim.pathing
		var area := pathing.area_at(s.waking_spot)
		assert_ne(area, SimPathing.NO_AREA, "seed %d" % world_seed)
		var cut_off := 0
		for y in 64:
			for x in 64:
				var p := Vector2i(x, y)
				if not w.tile_blocks_walking(p) and pathing.area_at(p) != area:
					cut_off += 1
		assert_eq(cut_off, 0, "seed %d: free tiles outside the main area" % world_seed)


func test_given_the_same_seed_twice_then_the_state_hashes_are_equal_and_seed_2_puts_the_trees_elsewhere() -> void:
	var a := _build(1)
	var b := _build(1)
	assert_eq(a.sim.state_hash(), b.sim.state_hash())
	a.sim.steps(100)
	b.sim.steps(100)
	assert_eq(a.sim.state_hash(), b.sim.state_hash())
	var c := _build(2)
	assert_ne(_build(1).sim.state_hash(), c.sim.state_hash())
	var differ := false
	for y in 64:
		for x in 64:
			if a.sim.world.prop_at(Vector2i(x, y)) != c.sim.world.prop_at(Vector2i(x, y)):
				differ = true
	assert_true(differ)


func test_given_the_built_world_then_it_has_one_waking_spot_near_the_door_outside_and_32_npcs_with_a_brain_each_on_its_own_free_tile_with_a_look() -> void:
	var s := _build(1)
	var w := s.sim.world
	assert_false(s.building.has_point(s.waking_spot))
	assert_false(w.tile_blocks_walking(s.waking_spot))
	assert_lte(maxi(absi(s.waking_spot.x - s.door_outside.x), absi(s.waking_spot.y - s.door_outside.y)), 3)
	assert_eq(s.npc_ids.size(), 32)
	var seen := {}
	var races := {}
	for id in s.npc_ids:
		var c := w.get_character(id)
		assert_not_null(c)
		assert_false(seen.has(c.pos), "own tile")
		seen[c.pos] = true
		assert_false(w.tile_blocks_walking(c.pos))
		assert_ne(c.pos, s.waking_spot)
		assert_false(c.look.is_empty())
		races[c.look["race"]] = true
		assert_true(s.sim.brain._npcs.has(id))
	assert_gt(races.size(), 1, "races are rolled")


func test_given_the_built_world_stepped_600_times_then_every_npc_is_on_a_free_tile_none_share_a_tile_at_rest_and_at_least_16_have_moved() -> void:
	var s := _build(1)
	var w := s.sim.world
	var start := {}
	for id in s.npc_ids:
		start[id] = w.get_character(id).pos
	s.sim.steps(600)
	var moved := 0
	for id in s.npc_ids:
		var c := w.get_character(id)
		assert_false(w.tile_blocks_walking(c.pos))
		if c.pos != start[id]:
			moved += 1
		if s.sim.movement.status(id) != SimMovement.WALKING:
			assert_eq(w.character_at(c.pos), id, "holds its tile at rest")
	assert_gte(moved, 16)
