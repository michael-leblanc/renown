extends GutTest
# Tests tools/measure.gd (SIM-007). The tool's logic is static functions, so no
# SceneTree is needed here.

const Measure := preload("res://tools/measure.gd")

const SIZE := 512


func _result(n: int, worst: float) -> Dictionary:
	return {"npcs": n, "avg": worst / 4.0, "worst": worst, "hash": n * 7}


func _all_results(worst_for: Callable) -> Array:
	var out: Array = []
	for n in Measure.DEFAULT_COUNTS:
		out.append(_result(n, worst_for.call(n)))
	return out


func test_given_scripts_measure_run_with_no_arguments_when_it_ends_then_it_has_printed_one_line_for_each_count_with_average_worst_and_hash() -> void:
	assert_eq(Measure.parse_counts([]), [32, 100, 250, 500, 1000, 2000, 4000, 8000])
	var info := {"cpu": "Test CPU", "os": "Test OS", "godot": "4.7.2-stable"}
	var lines := Measure.report_lines(_all_results(func(_n): return 1.5), false, info)
	for i in Measure.DEFAULT_COUNTS.size():
		var n: int = Measure.DEFAULT_COUNTS[i]
		assert_true(lines[i].begins_with("%d NPCs" % n), "line %d: %s" % [i, lines[i]])
		assert_string_contains(lines[i], "average 0.375 ms")
		assert_string_contains(lines[i], "worst 1.500 ms")
		assert_string_contains(lines[i], "hash %d" % (n * 7))


func test_given_a_finished_run_when_the_last_lines_print_then_they_give_the_budget_with_the_cpu_name_the_os_and_the_godot_version() -> void:
	var info := {"cpu": "Test CPU", "os": "Test OS", "godot": "4.7.2-stable"}
	var results := _all_results(func(n): return 5.0 if n <= 1000 else 25.0)
	var lines := Measure.report_lines(results, false, info)
	var tail := lines.slice(lines.size() - 4)
	assert_string_contains(tail[0], "budget: 1000 NPCs")
	assert_string_contains(tail[1], "Test CPU")
	assert_string_contains(tail[2], "Test OS")
	assert_string_contains(tail[3], "4.7.2-stable")
	# All under 20 ms: the budget is "more than 8000".
	var all_fine := Measure.report_lines(_all_results(func(_n): return 5.0), false, info)
	assert_string_contains(all_fine[all_fine.size() - 4], "more than 8000")
	# The budget is the largest count under 20 ms, and exactly 20 is not under.
	assert_eq(Measure.budget(_all_results(func(n): return 20.0 if n >= 500 else 3.0), 20.0), 250)


func test_given_the_measurements_test_map_when_it_is_made_then_it_is_512_by_512_with_about_15_percent_blocked_in_clumps_of_3_to_9_tiles_a_side() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1
	var w: SimWorld = Measure.make_map(SIZE, rng)
	assert_eq(w.width, SIZE)
	assert_eq(w.height, SIZE)
	var blocked := 0
	var seen := {}
	var clumps := 0
	for y in SIZE:
		for x in SIZE:
			var p := Vector2i(x, y)
			if not w.tile_blocks_walking(p):
				continue
			blocked += 1
			if seen.has(p):
				continue
			# Flood this clump; it must fill a rectangle 3 to 9 tiles a side.
			clumps += 1
			var stack := [p]
			seen[p] = true
			var lo := p
			var hi := p
			var count := 0
			while not stack.is_empty():
				var q: Vector2i = stack.pop_back()
				count += 1
				lo = Vector2i(mini(lo.x, q.x), mini(lo.y, q.y))
				hi = Vector2i(maxi(hi.x, q.x), maxi(hi.y, q.y))
				for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var r: Vector2i = q + d
					if w.in_bounds(r) and w.tile_blocks_walking(r) and not seen.has(r):
						seen[r] = true
						stack.append(r)
			var cw := hi.x - lo.x + 1
			var ch := hi.y - lo.y + 1
			if cw < 3 or cw > 9 or ch < 3 or ch > 9 or count != cw * ch:
				fail_test("clump at %s is %d by %d with %d tiles" % [p, cw, ch, count])
				return
	var share := float(blocked) / float(SIZE * SIZE)
	assert_between(share, 0.14, 0.17, "blocked share")
	assert_gt(clumps, 100, "many clumps, not one big one")


func test_given_n_npcs_when_they_are_placed_then_a_quarter_start_in_each_of_two_towns_at_one_npc_per_100_tiles_and_half_are_spread_over_the_map() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 2
	var w: SimWorld = Measure.make_map(SIZE, rng)
	var n := 400
	var placed: Dictionary = Measure.place_npcs(w, n, rng)
	assert_eq(placed.town_a.size(), 100)
	assert_eq(placed.town_b.size(), 100)
	assert_eq(placed.spread.size(), 200)
	var rect_a: Rect2i = placed.rect_a
	var rect_b: Rect2i = placed.rect_b
	assert_eq(rect_a.get_area(), 100 * 100, "one NPC per 100 tiles")
	assert_eq(rect_b.get_area(), 100 * 100, "one NPC per 100 tiles")
	assert_false(rect_a.intersects(rect_b), "two separate towns")
	var taken := {}
	for key in ["town_a", "town_b", "spread"]:
		for p: Vector2i in placed[key]:
			assert_false(w.tile_blocks_walking(p), "free tile %s" % p)
			assert_false(taken.has(p), "one NPC a tile %s" % p)
			taken[p] = true
	for p: Vector2i in placed.town_a:
		assert_true(rect_a.has_point(p))
	for p: Vector2i in placed.town_b:
		assert_true(rect_b.has_point(p))
	var wide := 0
	for p: Vector2i in placed.spread:
		if not rect_a.has_point(p) and not rect_b.has_point(p):
			wide += 1
	assert_gt(wide, 100, "the spread ones are over the map, not in the towns")


func test_given_the_same_seed_when_the_measurement_runs_twice_with_32_npcs_then_the_final_state_hash_is_the_same_both_times() -> void:
	# A 64 by 64 map: the same code path, without building the 512 by 512
	# path graph three times (the map itself is tested above).
	var a: Dictionary = Measure.measure(32, 5, 40, 186, 64)
	var b: Dictionary = Measure.measure(32, 5, 40, 186, 64)
	assert_eq(a.hash, b.hash)
	assert_ne(a.hash, 0)
	assert_eq(a.npcs, 32)
	assert_gt(a.worst, 0.0)
	assert_lte(a.avg, a.worst)
	var c: Dictionary = Measure.measure(32, 5, 40, 187, 64)
	assert_ne(a.hash, c.hash, "another seed, another world")


func test_given_the_measurement_at_32_npcs_with_its_fixed_seed_when_it_runs_on_the_new_step_then_its_state_hash_equals_the_hash_it_gave_before() -> void:
	var r: Dictionary = Measure.measure(32, 10 * 10, 60 * 10, Measure.MEASURE_SEED, Measure.MAP_SIZE)
	assert_eq(r.hash, 1256863383)


func test_given_the_option_to_measure_a_single_count_when_it_is_run_with_32_then_only_that_line_prints() -> void:
	assert_eq(Measure.parse_counts(["--count=32"]), [32])
	assert_eq(Measure.parse_counts(["32"]), [32])
	var info := {"cpu": "Test CPU", "os": "Test OS", "godot": "4.7.2-stable"}
	var lines := Measure.report_lines([_result(32, 1.0)], true, info)
	assert_eq(lines.size(), 1)
	assert_true(lines[0].begins_with("32 NPCs"))
