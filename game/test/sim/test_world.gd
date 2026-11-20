extends GutTest
# Tests sim/world.gd and sim/character.gd (SIM-002).

const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")


func _world() -> World:
	return World.new(64, 48)


func _count_blocked(w: World) -> int:
	var n := 0
	for y in w.height:
		for x in w.width:
			if w.is_blocked(Vector2i(x, y)):
				n += 1
	return n


func test_one_blocked_tile_in_a_new_64_by_48_world_is_the_only_one() -> void:
	var w := _world()
	assert_eq(w.width, 64)
	assert_eq(w.height, 48)
	assert_true(w.set_blocked(Vector2i(10, 20), true))
	assert_true(w.is_blocked(Vector2i(10, 20)))
	assert_eq(_count_blocked(w), 1)


func test_given_a_tile_when_a_prop_is_set_then_it_holds_the_kind_and_takes_its_flags_from_the_props_data() -> void:
	var w := _world()
	var p := Vector2i(5, 5)
	assert_eq(w.prop_at(p), World.PROP_NONE)
	var table: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/props.json"))
	for kind in [World.PROP_TREE, World.PROP_ROCK]:
		var entry: Dictionary = table[World.PROP_NAMES[kind]]
		assert_true(w.set_prop(p, kind))
		assert_eq(w.prop_at(p), kind)
		assert_eq(w.tile_blocks_walking(p), entry["blocks_walking"])
		assert_eq(w.tile_blocks_sight(p), entry["blocks_sight"])
		assert_true(w.tile_blocks_walking(p), "a stand-in table blocks walking")
	assert_true(w.set_prop(p, World.PROP_NONE))
	assert_eq(w.prop_at(p), World.PROP_NONE)
	assert_false(w.tile_blocks_walking(p))
	assert_false(w.tile_blocks_sight(p))
	assert_false(w.set_prop(Vector2i(-1, 0), World.PROP_TREE))


func test_tile_walk_and_sight_flags_are_separate() -> void:
	var w := _world()
	var a := Vector2i(3, 3)
	var b := Vector2i(5, 5)
	w.set_tile_flags(a, true, false)
	w.set_tile_flags(b, false, true)
	assert_true(w.tile_blocks_walking(a))
	assert_false(w.tile_blocks_sight(a))
	assert_false(w.tile_blocks_walking(b))
	assert_true(w.tile_blocks_sight(b))


func test_wall_on_an_edge_reads_from_both_tiles_and_changes_nothing_else() -> void:
	var w := _world()
	var a := Vector2i(4, 4)
	var east := Vector2i(5, 4)
	var south := Vector2i(4, 5)
	assert_true(w.set_edge_flags(a, east, true, false))
	assert_true(w.edge_blocks_walking(a, east))
	assert_true(w.edge_blocks_walking(east, a))
	assert_false(w.is_blocked(a))
	assert_false(w.is_blocked(east))
	assert_false(w.edge_blocks_walking(a, south))
	assert_false(w.edge_blocks_walking(south, a))
	assert_false(w.edge_blocks_walking(Vector2i(4, 3), a))
	assert_false(w.edge_blocks_walking(east, Vector2i(5, 5)))
	var count := 0
	for y in w.height:
		for x in w.width:
			var p := Vector2i(x, y)
			if w.in_bounds(p + Vector2i(1, 0)) and w.edge_blocks_walking(p, p + Vector2i(1, 0)):
				count += 1
			if w.in_bounds(p + Vector2i(0, 1)) and w.edge_blocks_walking(p, p + Vector2i(0, 1)):
				count += 1
	assert_eq(count, 1)


func test_edge_walk_and_sight_flags_are_separate() -> void:
	var w := _world()
	w.set_edge_flags(Vector2i(1, 1), Vector2i(2, 1), true, false)
	w.set_edge_flags(Vector2i(1, 1), Vector2i(1, 2), false, true)
	assert_true(w.edge_blocks_walking(Vector2i(1, 1), Vector2i(2, 1)))
	assert_false(w.edge_blocks_sight(Vector2i(1, 1), Vector2i(2, 1)))
	assert_false(w.edge_blocks_walking(Vector2i(1, 1), Vector2i(1, 2)))
	assert_true(w.edge_blocks_sight(Vector2i(1, 1), Vector2i(1, 2)))


func test_closed_door_blocks_sight_not_walking_and_open_door_neither() -> void:
	var w := _world()
	var a := Vector2i(7, 7)
	var b := Vector2i(8, 7)
	assert_true(w.set_door(a, b, false))
	assert_true(w.has_door(a, b))
	assert_true(w.has_door(b, a))
	assert_true(w.edge_blocks_sight(a, b))
	assert_false(w.edge_blocks_walking(a, b))
	assert_true(w.set_door(a, b, true))
	assert_false(w.edge_blocks_sight(b, a))
	assert_false(w.edge_blocks_walking(b, a))


func test_building_5_by_4_with_outer_walls_has_20_free_tiles_with_its_place() -> void:
	var w := _world()
	var rect := Rect2i(10, 10, 5, 4)
	w.set_place_rect(rect, 7)
	for x in range(10, 15):
		w.set_edge_flags(Vector2i(x, 9), Vector2i(x, 10), true, true)
		w.set_edge_flags(Vector2i(x, 13), Vector2i(x, 14), true, true)
	for y in range(10, 14):
		w.set_edge_flags(Vector2i(9, y), Vector2i(10, y), true, true)
		w.set_edge_flags(Vector2i(14, y), Vector2i(15, y), true, true)
	var n := 0
	for y in range(10, 14):
		for x in range(10, 15):
			var p := Vector2i(x, y)
			assert_false(w.is_blocked(p))
			assert_eq(w.place_at(p), 7)
			n += 1
	assert_eq(n, 20)
	assert_eq(w.place_at(Vector2i(9, 10)), World.NO_PLACE)


func test_edges_on_the_border_or_outside_the_grid_are_refused() -> void:
	var w := _world()
	assert_false(w.set_edge_flags(Vector2i(0, 0), Vector2i(-1, 0), true, true))
	assert_false(w.set_edge_flags(Vector2i(0, 0), Vector2i(0, -1), true, true))
	assert_false(w.set_edge_flags(Vector2i(63, 5), Vector2i(64, 5), true, true))
	assert_false(w.set_edge_flags(Vector2i(5, 47), Vector2i(5, 48), true, true))
	assert_false(w.set_edge_flags(Vector2i(70, 70), Vector2i(71, 70), true, true))
	assert_false(w.set_door(Vector2i(0, 0), Vector2i(-1, 0), false))
	assert_true(w.edge_blocks_walking(Vector2i(0, 0), Vector2i(-1, 0)))
	assert_true(w.edge_blocks_walking(Vector2i(63, 5), Vector2i(64, 5)))


func test_new_tile_has_ground_and_no_place_and_setting_a_place_changes_nothing_else() -> void:
	var w := _world()
	var p := Vector2i(2, 2)
	assert_eq(w.ground_at(p), World.GROUND_GRASS)
	assert_eq(w.place_at(p), World.NO_PLACE)
	w.set_place(p, 3)
	assert_eq(w.place_at(p), 3)
	assert_eq(w.ground_at(p), World.GROUND_GRASS)
	assert_false(w.is_blocked(p))
	assert_false(w.tile_blocks_sight(p))
	assert_eq(w.place_at(Vector2i(3, 2)), World.NO_PLACE)


func test_given_a_new_world_when_it_is_asked_for_an_id_three_times_then_it_gives_1_2_and_3_and_a_character_with_an_id_it_did_not_give_is_refused() -> void:
	var w := _world()
	assert_eq(w.new_character_id(), 1)
	assert_eq(w.new_character_id(), 2)
	assert_eq(w.new_character_id(), 3)
	assert_false(w.add_character(Character.new(4), Vector2i(1, 1)), "not given yet")
	assert_false(w.add_character(Character.new(42), Vector2i(1, 1)))
	assert_false(w.add_character(Character.new(0), Vector2i(1, 1)))
	assert_true(w.add_character(Character.new(3), Vector2i(1, 1)))


func test_given_a_world_whose_characters_were_removed_when_it_is_asked_for_an_id_then_it_never_gives_one_it_gave_before() -> void:
	var w := _world()
	var a := w.new_character_id()
	var b := w.new_character_id()
	w.add_character(Character.new(a), Vector2i(1, 1))
	w.add_character(Character.new(b), Vector2i(2, 1))
	w.remove_character(a)
	w.remove_character(b)
	assert_eq(w.new_character_id(), 3)


func test_given_the_id_counter_when_the_world_state_is_read_then_it_is_a_plain_number_on_the_world_that_can_be_written_and_read_back() -> void:
	var w := _world()
	w.new_character_id()
	w.new_character_id()
	assert_typeof(w.next_character_id, TYPE_INT)
	assert_eq(w.next_character_id, 3)
	var back := _world()
	back.next_character_id = w.next_character_id
	assert_eq(back.new_character_id(), 3)


func test_character_added_on_a_free_tile_is_found_there() -> void:
	var w := _world()
	var c := Character.new(w.new_character_id())
	assert_true(w.add_character(c, Vector2i(5, 6)))
	assert_eq(w.character_at(Vector2i(5, 6)), c.id)
	assert_eq(c.pos, Vector2i(5, 6))
	assert_false(w.is_free(Vector2i(5, 6)))


func test_removed_character_leaves_its_tile_free() -> void:
	var w := _world()
	var id := w.new_character_id()
	w.add_character(Character.new(id), Vector2i(5, 6))
	assert_true(w.remove_character(id))
	assert_eq(w.character_at(Vector2i(5, 6)), World.NO_CHARACTER)
	assert_true(w.is_free(Vector2i(5, 6)))


func test_character_cannot_be_added_on_a_blocked_tile_or_outside() -> void:
	var w := _world()
	w.set_blocked(Vector2i(1, 1), true)
	assert_false(w.add_character(Character.new(w.new_character_id()), Vector2i(1, 1)))
	assert_false(w.add_character(Character.new(w.new_character_id()), Vector2i(-1, 0)))
	assert_false(w.add_character(Character.new(w.new_character_id()), Vector2i(64, 0)))
	assert_false(w.add_character(Character.new(w.new_character_id()), Vector2i(0, 48)))


func test_second_character_cannot_rest_on_a_taken_tile() -> void:
	var w := _world()
	assert_true(w.add_character(Character.new(w.new_character_id()), Vector2i(9, 9)))
	assert_false(w.add_character(Character.new(w.new_character_id()), Vector2i(9, 9)))
	assert_eq(w.character_at(Vector2i(9, 9)), 1)


func test_a_character_moving_onto_a_held_tile_leaves_the_holder_on_the_record() -> void:
	var w := _world()
	w.add_character(Character.new(w.new_character_id()), Vector2i(4, 4))
	w.add_character(Character.new(w.new_character_id()), Vector2i(5, 4))
	assert_true(w.move_character(1, Vector2i(5, 4)))
	assert_eq(w.get_character(1).pos, Vector2i(5, 4))
	assert_eq(w.character_at(Vector2i(5, 4)), 2)
	assert_true(w.is_free(Vector2i(4, 4)))
	assert_true(w.move_character(1, Vector2i(6, 4)))
	assert_eq(w.character_at(Vector2i(5, 4)), 2)
	assert_eq(w.character_at(Vector2i(6, 4)), 1)


func test_when_the_holder_leaves_a_shared_tile_the_one_still_there_holds_it() -> void:
	var w := _world()
	w.add_character(Character.new(w.new_character_id()), Vector2i(5, 4))
	w.add_character(Character.new(w.new_character_id()), Vector2i(4, 4))
	w.move_character(2, Vector2i(5, 4))
	w.move_character(1, Vector2i(6, 4))
	assert_eq(w.character_at(Vector2i(5, 4)), 2)
	w.remove_character(2)
	assert_true(w.is_free(Vector2i(5, 4)))


func test_removing_a_character_on_a_held_tile_erases_only_its_own_record() -> void:
	var w := _world()
	w.add_character(Character.new(w.new_character_id()), Vector2i(5, 4))
	w.add_character(Character.new(w.new_character_id()), Vector2i(4, 4))
	w.move_character(2, Vector2i(5, 4))
	assert_true(w.remove_character(2))
	assert_eq(w.character_at(Vector2i(5, 4)), 1)


func test_a_character_cannot_move_onto_a_blocked_tile_or_outside() -> void:
	var w := _world()
	w.set_blocked(Vector2i(6, 4), true)
	w.add_character(Character.new(w.new_character_id()), Vector2i(5, 4))
	assert_false(w.move_character(1, Vector2i(6, 4)))
	assert_false(w.move_character(1, Vector2i(-1, 4)))
	assert_false(w.move_character(9, Vector2i(5, 5)), "no such character")
	assert_eq(w.get_character(1).pos, Vector2i(5, 4))
	assert_eq(w.character_at(Vector2i(5, 4)), 1)


func test_no_script_under_sim_extends_node_or_uses_the_scene_tree() -> void:
	var dir := DirAccess.open("res://sim")
	assert_not_null(dir, "res://sim exists")
	var re := RegEx.create_from_string("(?m)^\\s*extends\\s+(Node|Node2D|Node3D|Control|CanvasItem|SceneTree)\\b|get_tree\\(|SceneTree|PhysicsServer|RigidBody|CharacterBody")
	var seen := 0
	for f in dir.get_files():
		if not f.ends_with(".gd"):
			continue
		seen += 1
		var text := FileAccess.get_file_as_string("res://sim/" + f)
		assert_null(re.search(text), "%s uses a node or the scene tree" % f)
	assert_gt(seen, 0)
