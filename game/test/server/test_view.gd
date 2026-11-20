extends GutTest
# Tests server/view.gd (NET-001).

var _settings: SimSettings
var _looks: SimLooks


func before_each() -> void:
	_settings = SimSettings.load_file("res://data/settings.json")
	_looks = SimLooks.load_file("res://data/looks.json")


# A bare grass world with no characters.
func _bare() -> Sim:
	return Sim.new(1, _settings, SimWorld.new(64, 64))


func _add(sim: Sim, p: Vector2i, race := "human") -> SimCharacter:
	var c := SimCharacter.new(sim.world.new_character_id())
	sim.world.add_character(c, p)
	_looks.give_look(c, race, "starting")
	return c


func _ids(view: Dictionary) -> Array:
	var ids: Array = []
	for c in view["characters"]:
		ids.append(c["id"])
	return ids


func test_given_a_character_on_the_stand_in_world_when_its_welcome_is_built_then_it_holds_version_id_rates_size_ground_props_and_wall_and_door_edges() -> void:
	var s := SimStandInWorld.build(1, _settings, _looks)
	var view := ServerView.new(s.sim, _settings)
	var w := view.welcome(1)
	assert_eq(w["type"], NetMessages.WELCOME)
	assert_eq(w["version"], NetMessages.PROTOCOL_VERSION)
	assert_eq(w["you"], 1)
	assert_eq(w["tick_rate"], 10)
	assert_almost_eq(float(w["walk_time"]), 0.3, 0.0001)
	assert_eq(w["width"], 64)
	assert_eq(w["height"], 64)
	assert_eq(w["ground"].size(), 64 * 64)
	assert_eq(w["props"].size(), 64 * 64)
	var world := s.sim.world
	for p in [Vector2i(0, 0), Vector2i(10, 20), Vector2i(63, 63), s.door_outside]:
		assert_eq(w["ground"][p.y * 64 + p.x], world.ground_at(p))
		assert_eq(w["props"][p.y * 64 + p.x], world.prop_at(p))
	var trees := 0
	for n in w["props"]:
		if n != SimWorld.PROP_NONE:
			trees += 1
	assert_gt(trees, 0)
	var walls := 0
	var doors := 0
	for e in w["edges"]:
		if e[4] == NetMessages.EDGE_DOOR:
			doors += 1
			assert_eq([e[0], e[1]], [s.door_inside.x, s.door_inside.y])
			assert_eq([e[2], e[3]], [s.door_outside.x, s.door_outside.y])
		else:
			assert_eq(e[4], NetMessages.EDGE_WALL)
			walls += 1
	assert_eq(doors, 1)
	assert_eq(walls, 17)


func test_given_two_characters_5_tiles_apart_on_open_ground_when_the_view_of_one_is_built_then_it_lists_both_with_id_tile_stepping_race_and_parts() -> void:
	var sim := _bare()
	_add(sim, Vector2i(10, 10), "orc")
	_add(sim, Vector2i(15, 10), "goblin")
	sim.movement.order(2, Vector2i(15, 14))
	var v := ServerView.new(sim, _settings).view(1)
	assert_eq(_ids(v), [1, 2])
	var a: Dictionary = v["characters"][0]
	var b: Dictionary = v["characters"][1]
	assert_eq(a["tile"], [10, 10])
	assert_eq(a["stepping"], [])
	assert_eq(a["race"], "orc")
	assert_eq(b["tile"], [15, 10])
	assert_eq(b["stepping"], [15, 11])
	assert_eq(b["race"], "goblin")
	assert_gt(b["parts"].size(), 0)
	var part: Dictionary = b["parts"][0]
	assert_true(SimLooks.SLOTS.has(part["slot"]))
	assert_true(part["part"] is String and part["colour"] is String)


func test_given_a_character_behind_a_wall_edge_or_tile_or_17_tiles_away_when_the_view_is_built_then_it_is_not_in_it() -> void:
	var sim := _bare()
	_add(sim, Vector2i(10, 10))
	_add(sim, Vector2i(14, 10)) # behind a wall edge
	_add(sim, Vector2i(10, 14)) # behind a blocking tile
	_add(sim, Vector2i(27, 10)) # 17 away
	_add(sim, Vector2i(10, 6)) # clear
	sim.world.set_edge_flags(Vector2i(12, 10), Vector2i(13, 10), true, true)
	sim.world.set_blocked(Vector2i(10, 12), true)
	assert_eq(_ids(ServerView.new(sim, _settings).view(1)), [1, 5])


func test_given_a_viewer_when_its_view_is_built_then_the_viewer_itself_is_in_it() -> void:
	var sim := _bare()
	_add(sim, Vector2i(10, 10))
	_add(sim, Vector2i(50, 50))
	assert_eq(_ids(ServerView.new(sim, _settings).view(1)), [1])


func test_given_one_door_in_sight_and_one_out_of_sight_when_the_view_is_built_then_it_says_open_or_closed_for_the_first_and_nothing_about_the_second() -> void:
	var sim := _bare()
	_add(sim, Vector2i(10, 10))
	sim.world.set_door(Vector2i(12, 10), Vector2i(13, 10), true)
	sim.world.set_door(Vector2i(50, 50), Vector2i(50, 51), false)
	var v := ServerView.new(sim, _settings).view(1)
	assert_eq(v["doors"].size(), 1)
	assert_eq(v["doors"][0]["a"], [12, 10])
	assert_eq(v["doors"][0]["b"], [13, 10])
	assert_eq(v["doors"][0]["state"], NetMessages.DOOR_OPEN)
	sim.world.set_door(Vector2i(12, 10), Vector2i(13, 10), false)
	v = ServerView.new(sim, _settings).view(1)
	assert_eq(v["doors"][0]["state"], NetMessages.DOOR_CLOSED)


func test_given_any_welcome_and_view_when_read_then_every_key_is_listed_and_every_value_plain() -> void:
	var s := SimStandInWorld.build(1, _settings, _looks)
	var view := ServerView.new(s.sim, _settings)
	assert_true(NetMessages.is_plain(view.welcome(1)))
	assert_true(NetMessages.is_plain(view.view(1)))


func test_given_a_welcome_and_a_view_when_turned_to_bytes_and_back_then_each_equals_the_original() -> void:
	var s := SimStandInWorld.build(1, _settings, _looks)
	s.sim.movement.order(1, Vector2i(2, 2))
	var view := ServerView.new(s.sim, _settings)
	var w := view.welcome(1)
	var v := view.view(1)
	assert_eq(bytes_to_var(var_to_bytes(w)), w)
	assert_eq(bytes_to_var(var_to_bytes(v)), v)


func test_given_32_npcs_and_2_players_when_both_views_are_built_in_the_same_tick_then_sight_was_rebuilt_once() -> void:
	var s := SimStandInWorld.build(1, _settings, _looks)
	var sim := s.sim
	var spots: Array[Vector2i] = [s.waking_spot, s.waking_spot + Vector2i(1, 0)]
	var ids := []
	for i in 2:
		var p := spots[i]
		if not sim.world.is_free(p):
			p = Vector2i(0, 0)
			while not sim.world.is_free(p):
				p += Vector2i(1, 0)
		ids.append(_add(sim, p).id)
	assert_eq(s.npc_ids.size(), 32)
	var view := ServerView.new(sim, _settings)
	view.view(ids[0])
	view.view(ids[1])
	assert_eq(view.sight_rebuilds, 1)
	sim.step()
	view.view(ids[0])
	assert_eq(view.sight_rebuilds, 2)


func test_given_three_characters_in_sight_when_one_is_removed_between_two_views_in_the_same_tick_then_the_second_view_does_not_crash_and_leaves_it_out() -> void:
	var sim := _bare()
	_add(sim, Vector2i(10, 10))
	_add(sim, Vector2i(12, 10))
	_add(sim, Vector2i(10, 12))
	var view := ServerView.new(sim, _settings)
	assert_eq(_ids(view.view(1)), [1, 2, 3])
	sim.world.remove_character(3)
	assert_eq(_ids(view.view(2)), [1, 2])
