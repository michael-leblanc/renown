extends GutTest
# Tests sim/movement.gd, sim/pathing.gd and tools/pathing_compare.gd (SIM-004).

const Sim := preload("res://sim/sim.gd")
const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")
const Movement := preload("res://sim/movement.gd")
const Pathing := preload("res://sim/pathing.gd")


func _settings() -> SimSettings:
	return SimSettings.load_file("res://data/settings.json")


# A movement over a fresh world, with a character 1 at `start`.
func _rig(world: World, start: Vector2i) -> Movement:
	world.add_character(Character.new(1), start)
	var sim := Sim.new(1, _settings(), world)
	return Movement.new(sim, Pathing.new(world))


func _run(m: Movement, ticks: int) -> void:
	for i in ticks:
		m.step()


# Runs until the order ends, recording every tile the character stood on.
func _walk_trace(m: Movement, id: int, limit: int) -> Array:
	var seen: Array = [m.sim.world.get_character(id).pos]
	for i in limit:
		m.step()
		seen.append(m.sim.world.get_character(id).pos)
		if m.status(id) != Movement.WALKING:
			break
	return seen


func _crosses_blocked(world: World, seen: Array) -> bool:
	for i in seen.size():
		if world.tile_blocks_walking(seen[i]):
			return true
		if i > 0 and seen[i] != seen[i - 1] and world.edge_blocks_walking(seen[i - 1], seen[i]) \
				and absi(seen[i].x - seen[i - 1].x) + absi(seen[i].y - seen[i - 1].y) == 1:
			return true
	return false


func test_a_character_sent_5_tiles_east_over_open_ground_stands_there_after_15_ticks() -> void:
	var w := World.new(16, 16)
	var m := _rig(w, Vector2i(2, 5))
	m.order(1, Vector2i(7, 5))
	_run(m, 15)
	assert_eq(w.get_character(1).pos, Vector2i(7, 5))
	assert_eq(m.status(1), Movement.ARRIVED)


func test_a_wall_between_a_character_and_its_target_is_gone_around_and_no_blocked_tile_is_stood_on() -> void:
	var w := World.new(16, 16)
	for y in range(0, 12):
		w.set_blocked(Vector2i(8, y), true)
	var m := _rig(w, Vector2i(4, 5))
	m.order(1, Vector2i(12, 5))
	var seen := _walk_trace(m, 1, 200)
	assert_eq(w.get_character(1).pos, Vector2i(12, 5))
	assert_false(_crosses_blocked(w, seen))


func test_a_line_of_blocking_edges_between_a_character_and_its_target_is_gone_around_and_never_crossed() -> void:
	var w := World.new(16, 16)
	for y in range(0, 12):
		w.set_edge_flags(Vector2i(8, y), Vector2i(9, y), true, true)
	var m := _rig(w, Vector2i(4, 5))
	m.order(1, Vector2i(12, 5))
	var seen := _walk_trace(m, 1, 200)
	assert_eq(w.get_character(1).pos, Vector2i(12, 5))
	assert_false(_crosses_blocked(w, seen))
	assert_gt(seen.size(), 9, "went around, so more steps than the straight line")


func test_a_5_by_4_building_with_one_door_edge_is_entered_through_the_door_to_a_tile_against_the_far_wall() -> void:
	var w := World.new(20, 20)
	# Floor x 5..9, y 5..8. Walls on its whole perimeter; the door is on the south side at x 7.
	for x in range(5, 10):
		w.set_edge_flags(Vector2i(x, 4), Vector2i(x, 5), true, true)
		if x != 7:
			w.set_edge_flags(Vector2i(x, 8), Vector2i(x, 9), true, true)
	for y in range(5, 9):
		w.set_edge_flags(Vector2i(4, y), Vector2i(5, y), true, true)
		w.set_edge_flags(Vector2i(9, y), Vector2i(10, y), true, true)
	w.set_edge_flags(Vector2i(7, 8), Vector2i(7, 9), false, true)
	w.set_door(Vector2i(7, 8), Vector2i(7, 9), false)
	var m := _rig(w, Vector2i(7, 14))
	m.order(1, Vector2i(7, 5))
	var seen := _walk_trace(m, 1, 300)
	assert_eq(w.get_character(1).pos, Vector2i(7, 5))
	assert_true(seen.has(Vector2i(7, 9)) and seen.has(Vector2i(7, 8)), "through the door")
	assert_false(_crosses_blocked(w, seen))


func test_a_diagonal_step_with_one_side_tile_blocked_is_not_used() -> void:
	var w := World.new(8, 8)
	w.set_blocked(Vector2i(4, 3), true)
	var p := Pathing.new(w)
	var path := p.find_path(Vector2i(3, 3), Vector2i(4, 4))
	assert_gt(path.size(), 0)
	assert_ne(path[0], Vector2i(4, 4), "first step must not cut the blocked corner")
	assert_eq(path.size(), 2)
	assert_false(Pathing.step_allowed(w, Vector2i(3, 3), Vector2i(4, 4)))


func test_a_diagonal_step_across_a_corner_with_a_blocking_edge_or_a_door_is_not_used() -> void:
	# Each of the four edges meeting at the corner between (3,3) (4,3) (3,4) (4,4).
	var edges := [
		[Vector2i(3, 3), Vector2i(4, 3)],
		[Vector2i(3, 4), Vector2i(4, 4)],
		[Vector2i(3, 3), Vector2i(3, 4)],
		[Vector2i(4, 3), Vector2i(4, 4)],
	]
	for e in edges:
		var w := World.new(8, 8)
		w.set_edge_flags(e[0], e[1], true, true)
		assert_false(Pathing.step_allowed(w, Vector2i(3, 3), Vector2i(4, 4)), "wall %s" % [e])
		assert_false(Pathing.step_allowed(w, Vector2i(4, 4), Vector2i(3, 3)), "wall back %s" % [e])
		assert_false(Pathing.step_allowed(w, Vector2i(4, 3), Vector2i(3, 4)), "wall other diagonal %s" % [e])
		var p := Pathing.new(w)
		assert_gt(p.find_path(Vector2i(3, 3), Vector2i(4, 4)).size(), 1, "path %s" % [e])
		var d := World.new(8, 8)
		d.set_door(e[0], e[1], true)
		assert_false(Pathing.step_allowed(d, Vector2i(3, 3), Vector2i(4, 4)), "door %s" % [e])
	var open := World.new(8, 8)
	assert_true(Pathing.step_allowed(open, Vector2i(3, 3), Vector2i(4, 4)))


func test_pathing_compare_prints_both_searches_with_timings_and_a_pick() -> void:
	var out: Array = []
	var code := OS.execute(OS.get_executable_path(), [
		"--headless", "--path", ProjectSettings.globalize_path("res://"),
		"-s", "res://tools/pathing_compare.gd", "--", "--size=96", "--searches=3",
	], out, true)
	var text := str(out[0])
	assert_eq(code, 0, text)
	assert_string_contains(text, "AStar2D")
	assert_string_contains(text, "AStarGrid2D")
	assert_string_contains(text, "100 tiles")
	assert_string_contains(text, "400 tiles")
	assert_string_contains(text, "build")
	assert_string_contains(text, "one edge")
	assert_string_contains(text, "pick:")


func test_a_character_walks_through_the_tile_of_another_at_rest_without_stopping_on_it() -> void:
	var w := World.new(16, 16)
	var m := _corridor_with_one_at_rest(w)
	m.order(1, Vector2i(9, 5))
	var passed := false
	for i in 60:
		m.step()
		if w.get_character(1).pos == Vector2i(5, 5):
			passed = true
			assert_eq(m.status(1), Movement.WALKING, "not stopped on it")
		if m.status(1) != Movement.WALKING:
			break
	assert_true(passed)
	assert_eq(w.get_character(1).pos, Vector2i(9, 5))
	assert_eq(w.get_character(2).pos, Vector2i(5, 5))
	assert_eq(w.character_at(Vector2i(5, 5)), 2)


func test_a_target_where_another_stands_at_rest_is_arrived_at_on_the_nearest_free_tile() -> void:
	var w := World.new(16, 16)
	var m := _rig(w, Vector2i(2, 5))
	w.add_character(Character.new(2), Vector2i(7, 5))
	m.order(1, Vector2i(7, 5))
	_run(m, 100)
	assert_eq(m.status(1), Movement.ARRIVED)
	var pos := w.get_character(1).pos
	assert_ne(pos, Vector2i(7, 5))
	assert_eq(maxi(absi(pos.x - 7), absi(pos.y - 5)), 1, "next to the target")
	assert_eq(w.character_at(pos), 1)
	assert_eq(w.character_at(Vector2i(7, 5)), 2)


func test_a_new_map_gives_every_free_tile_its_area_number_and_tiles_split_by_walling_edges_differ() -> void:
	var w := World.new(12, 12)
	w.set_blocked(Vector2i(0, 0), true)
	# A pocket x 6..8, y 6..8 walled on all four sides by edges.
	for i in range(6, 9):
		w.set_edge_flags(Vector2i(i, 5), Vector2i(i, 6), true, true)
		w.set_edge_flags(Vector2i(i, 8), Vector2i(i, 9), true, true)
		w.set_edge_flags(Vector2i(5, i), Vector2i(6, i), true, true)
		w.set_edge_flags(Vector2i(8, i), Vector2i(9, i), true, true)
	var p := Pathing.new(w)
	assert_eq(p.area_at(Vector2i(0, 0)), -1, "blocked tile has no area")
	assert_true(p.area_at(Vector2i(1, 1)) >= 0)
	assert_eq(p.area_at(Vector2i(1, 1)), p.area_at(Vector2i(11, 11)))
	assert_eq(p.area_at(Vector2i(6, 6)), p.area_at(Vector2i(8, 8)))
	assert_ne(p.area_at(Vector2i(6, 6)), p.area_at(Vector2i(5, 6)))
	assert_ne(p.area_at(Vector2i(7, 7)), p.area_at(Vector2i(1, 1)))


func test_a_target_inside_a_pocket_walled_off_by_edges_stays_put_ends_no_path_and_runs_no_search() -> void:
	var w := World.new(12, 12)
	for i in range(6, 9):
		w.set_edge_flags(Vector2i(i, 5), Vector2i(i, 6), true, true)
		w.set_edge_flags(Vector2i(i, 8), Vector2i(i, 9), true, true)
		w.set_edge_flags(Vector2i(5, i), Vector2i(6, i), true, true)
		w.set_edge_flags(Vector2i(8, i), Vector2i(9, i), true, true)
	var m := _rig(w, Vector2i(1, 1))
	var before := m.pathing.searches
	m.order(1, Vector2i(7, 7))
	assert_eq(m.status(1), Movement.NO_PATH)
	_run(m, 20)
	assert_eq(w.get_character(1).pos, Vector2i(1, 1))
	assert_eq(m.pathing.searches, before)


func test_a_blocked_target_tile_ends_no_path_and_runs_no_search() -> void:
	var w := World.new(12, 12)
	w.set_blocked(Vector2i(7, 7), true)
	var m := _rig(w, Vector2i(1, 1))
	var before := m.pathing.searches
	m.order(1, Vector2i(7, 7))
	assert_eq(m.status(1), Movement.NO_PATH)
	assert_eq(w.get_character(1).pos, Vector2i(1, 1))
	assert_eq(m.pathing.searches, before)


# --- One character at rest per tile (D52), whatever ends a walk -------------

# A one-wide corridor along row 5, so a walker has to cross the tile of
# character 2, at rest at (5,5). Character 1 starts at (2,5).
func _corridor_with_one_at_rest(w: World) -> Movement:
	for x in range(0, 16):
		w.set_blocked(Vector2i(x, 4), true)
		w.set_blocked(Vector2i(x, 6), true)
	var m := _rig(w, Vector2i(2, 5))
	w.add_character(Character.new(2), Vector2i(5, 5))
	return m


func _step_until_at(m: Movement, id: int, tile: Vector2i, limit: int) -> void:
	for i in limit:
		if m.sim.world.get_character(id).pos == tile:
			return
		m.step()


func test_a_walker_whose_order_ends_no_path_on_the_tile_of_one_at_rest_settles_on_a_free_tile() -> void:
	var w := World.new(16, 16)
	var m := _corridor_with_one_at_rest(w)
	m.order(1, Vector2i(9, 5))
	_step_until_at(m, 1, Vector2i(5, 5), 60)
	assert_eq(w.get_character(1).pos, Vector2i(5, 5), "set-up: crossing the tile of 2")
	assert_false(m.order(1, Vector2i(12, 10)), "outside the corridor")
	assert_eq(m.status(1), Movement.NO_PATH)
	_run(m, 20)
	var pos := w.get_character(1).pos
	assert_ne(pos, Vector2i(5, 5), "doesn't stay on the tile of 2")
	assert_eq(w.character_at(pos), 1)
	assert_eq(w.character_at(Vector2i(5, 5)), 2)
	assert_eq(m.status(1), Movement.NO_PATH)


func test_a_walker_left_alone_on_a_tile_holds_it_when_ordered_to_stay() -> void:
	# 1 rests at (5,5) and 2 walks east through it. 2 enters on tick 9 and 1,
	# ordered south after tick 7, leaves on tick 10; then 2 is told to stay.
	var w := World.new(16, 16)
	for x in range(0, 16):
		w.set_blocked(Vector2i(x, 4), true)
		if x != 5:
			w.set_blocked(Vector2i(x, 6), true)
	var m := _rig(w, Vector2i(5, 5))
	w.add_character(Character.new(2), Vector2i(2, 5))
	m.order(2, Vector2i(9, 5))
	_run(m, 7)
	m.order(1, Vector2i(5, 6))
	_run(m, 2)
	assert_eq(w.get_character(2).pos, Vector2i(5, 5), "set-up: 2 entered")
	assert_eq(w.get_character(1).pos, Vector2i(5, 5), "set-up: 1 still there")
	_run(m, 1)
	assert_eq(w.get_character(1).pos, Vector2i(5, 6), "set-up: 1 left")
	m.order(2, Vector2i(5, 5))
	assert_eq(m.status(2), Movement.ARRIVED)
	assert_eq(w.character_at(Vector2i(5, 5)), 2)
	assert_false(w.add_character(Character.new(3), Vector2i(5, 5)), "a third can't stop there")


func test_removing_a_walker_crossing_the_tile_of_one_at_rest_keeps_that_ones_record() -> void:
	var w := World.new(16, 16)
	var m := _corridor_with_one_at_rest(w)
	m.order(1, Vector2i(9, 5))
	_step_until_at(m, 1, Vector2i(5, 5), 60)
	assert_eq(w.get_character(1).pos, Vector2i(5, 5), "set-up: crossing the tile of 2")
	assert_true(w.remove_character(1))
	assert_eq(w.character_at(Vector2i(5, 5)), 2)
	assert_false(w.is_free(Vector2i(5, 5)))


func test_the_nearest_free_tile_to_a_taken_target_is_the_nearest_by_walking_never_across_a_wall() -> void:
	var w := World.new(20, 20)
	# Floor x 5..9, y 5..8, walled all round; the door is on the south side at x 7.
	for x in range(5, 10):
		w.set_edge_flags(Vector2i(x, 4), Vector2i(x, 5), true, true)
		if x != 7:
			w.set_edge_flags(Vector2i(x, 8), Vector2i(x, 9), true, true)
	for y in range(5, 9):
		w.set_edge_flags(Vector2i(4, y), Vector2i(5, y), true, true)
		w.set_edge_flags(Vector2i(9, y), Vector2i(10, y), true, true)
	w.set_door(Vector2i(7, 8), Vector2i(7, 9), false)
	var m := _rig(w, Vector2i(7, 7))
	w.add_character(Character.new(2), Vector2i(7, 5))
	m.order(1, Vector2i(7, 5))
	_run(m, 100)
	assert_eq(m.status(1), Movement.ARRIVED)
	var pos := w.get_character(1).pos
	assert_true(Rect2i(5, 5, 5, 4).has_point(pos), "inside the building, not at %s" % pos)
	assert_eq(maxi(absi(pos.x - 7), absi(pos.y - 5)), 1, "next to the target")


func test_a_walk_across_a_closed_door_edge_leaves_the_door_open() -> void:
	var w := World.new(16, 16)
	w.set_door(Vector2i(5, 5), Vector2i(6, 5), false)
	var m := _rig(w, Vector2i(4, 5))
	m.order(1, Vector2i(8, 5))
	_run(m, 4)
	assert_false(w.door_is_open(Vector2i(5, 5), Vector2i(6, 5)), "not before the step across")
	_run(m, 12)
	assert_eq(w.get_character(1).pos, Vector2i(8, 5))
	assert_true(w.door_is_open(Vector2i(5, 5), Vector2i(6, 5)))


func test_an_order_repeated_every_2_ticks_keeps_the_step_progress_and_moves() -> void:
	var w := World.new(16, 16)
	var m := _rig(w, Vector2i(2, 5))
	for i in 15:
		m.order(1, Vector2i(15, 5))
		_run(m, 2)
	assert_eq(w.get_character(1).pos, Vector2i(12, 5), "one tile every 3 ticks over 30 ticks")


# --- Areas after an edge changes (D187) -------------------------------------

func test_opening_or_closing_a_door_relabels_nothing_and_a_wall_relabels_once() -> void:
	var w := World.new(12, 12)
	# A pocket x 6..8, y 6..8 walled all round but for one open edge at (7,8)-(7,9).
	for i in range(6, 9):
		w.set_edge_flags(Vector2i(i, 5), Vector2i(i, 6), true, true)
		if i != 7:
			w.set_edge_flags(Vector2i(i, 8), Vector2i(i, 9), true, true)
		w.set_edge_flags(Vector2i(5, i), Vector2i(6, i), true, true)
		w.set_edge_flags(Vector2i(8, i), Vector2i(9, i), true, true)
	var p := Pathing.new(w)
	var before: int = p.relabels
	w.set_door(Vector2i(7, 8), Vector2i(7, 9), false)
	p.edge_changed(Vector2i(7, 8), Vector2i(7, 9))
	w.set_door(Vector2i(7, 8), Vector2i(7, 9), true)
	p.edge_changed(Vector2i(7, 8), Vector2i(7, 9))
	assert_eq(p.relabels, before, "a door changes no straight link")
	assert_eq(p.area_at(Vector2i(7, 7)), p.area_at(Vector2i(1, 1)))
	w.set_edge_flags(Vector2i(7, 8), Vector2i(7, 9), true, true)
	p.edge_changed(Vector2i(7, 8), Vector2i(7, 9))
	assert_eq(p.relabels, before + 1)
	assert_ne(p.area_at(Vector2i(7, 7)), p.area_at(Vector2i(1, 1)), "the wall closes the pocket")
