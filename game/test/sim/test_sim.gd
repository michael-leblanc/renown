extends GutTest
# Tests sim/sim.gd and server/clock_loop.gd (SIM-003).

const Sim := preload("res://sim/sim.gd")
const World := preload("res://sim/world.gd")
const Character := preload("res://sim/character.gd")
const ClockLoop := preload("res://server/clock_loop.gd")

const SECOND := 1000000


func _settings() -> SimSettings:
	return SimSettings.load_file("res://data/settings.json")


func _sim(world_seed: int) -> Sim:
	var w := World.new(16, 16)
	w.add_character(Character.new(1), Vector2i(3, 3))
	return Sim.new(world_seed, _settings(), w)


func test_world_at_tick_0_stepped_600_times_by_hand_is_at_tick_600_without_waiting() -> void:
	var sim := _sim(1)
	assert_eq(sim.tick, 0)
	var started := Time.get_ticks_msec()
	for i in 600:
		sim.step()
	assert_eq(sim.tick, 600)
	assert_lt(Time.get_ticks_msec() - started, 5000)


func test_clock_loop_at_10_ticks_a_second_runs_exactly_10_ticks_in_1_second() -> void:
	var sim := _sim(1)
	var loop := ClockLoop.new(sim, 0)
	for i in 10:
		loop.pump((i + 1) * SECOND / 10)
	assert_eq(sim.tick, 10)
	loop.pump(SECOND + 99999)
	assert_eq(sim.tick, 10)


func test_a_tick_longer_than_0_1_seconds_makes_the_late_ticks_run_next_and_none_is_dropped() -> void:
	var sim := _sim(1)
	var loop := ClockLoop.new(sim, 0)
	assert_eq(loop.pump(SECOND / 10), 1)
	# The next tick took 0.35 s: three are now due at once.
	assert_eq(loop.pump(SECOND / 10 + 350000), 3)
	assert_eq(loop.pump(SECOND), 6)
	assert_eq(sim.tick, 10)


func test_a_cap_of_50_with_54_ticks_due_stops_at_tick_50() -> void:
	var sim := _sim(1)
	var loop := ClockLoop.new(sim, 0)
	# A stall across the limit: 5.4 s at 10 ticks a second is 54 ticks due.
	assert_eq(loop.pump(54 * SECOND / sim.settings.tick_rate, 50), 50)
	assert_eq(sim.tick, 50)


func test_a_rate_that_does_not_divide_a_second_does_not_run_ticks_early() -> void:
	var w := World.new(16, 16)
	var settings := SimSettings.from_dict({"tick_rate": 7, "timings": {}, "values": {}})
	var sim := Sim.new(1, settings, w)
	var loop := ClockLoop.new(sim, 0)
	# Tick 7000 is due at exactly 1000 s, not a millisecond before.
	loop.pump(1000 * SECOND - 1000)
	assert_eq(sim.tick, 6999)
	loop.pump(1000 * SECOND)
	assert_eq(sim.tick, 7000)


func test_two_worlds_from_the_same_seed_stepped_600_times_have_equal_state_hashes() -> void:
	var a := _sim(77)
	var b := _sim(77)
	for i in 600:
		a.step()
		b.step()
	assert_eq(a.state_hash(), b.state_hash())
	var c := _sim(78)
	for i in 600:
		c.step()
	assert_ne(a.state_hash(), c.state_hash())


func test_given_a_world_with_no_brain_and_no_walk_when_stepped_600_times_then_it_is_at_tick_600_with_the_same_state_hash_as_before() -> void:
	var sim := _sim(1)
	sim.steps(600)
	assert_eq(sim.tick, 600)
	assert_eq(sim.state_hash(), 450542028)


func test_given_one_character_ordered_to_walk_5_tiles_east_when_stepped_15_times_with_step_alone_then_it_stands_on_that_tile() -> void:
	var sim := _sim(1)
	var walk_ticks := sim.settings.ticks("walk_step")
	sim.movement.order(1, Vector2i(8, 3))
	sim.steps(5 * walk_ticks)
	assert_eq(5 * walk_ticks, 15, "the settings give 3 ticks a tile")
	assert_eq(sim.world.get_character(1).pos, Vector2i(8, 3))


func test_given_100_npcs_attached_to_the_brain_when_stepped_10_times_with_step_alone_then_every_npc_has_thought_exactly_once() -> void:
	var w := World.new(40, 40)
	var sim := Sim.new(1, _settings(), w)
	for i in 100:
		w.add_character(Character.new(i + 1), Vector2i(i % 10, i / 10))
		sim.brain.attach(i + 1)
	assert_eq(sim.settings.ticks("think_interval"), 10, "the settings give 10 ticks a think")
	sim.steps(10)
	for i in 100:
		assert_eq(sim.brain.think_count(i + 1), 1, "npc %d" % (i + 1))


func test_given_one_step_when_it_runs_then_the_brains_think_first_the_walks_advance_next_and_the_tick_goes_up_last() -> void:
	var sim := _sim(1)
	var log: Array = []
	sim.brain.clear_actions()
	sim.brain.add_action("note", func(_id): return 1.0, func(_id): log.append("think %d" % sim.tick))
	sim.brain.attach(1)
	sim.movement.order(1, Vector2i(4, 3))
	var walk_ticks := sim.settings.ticks("walk_step")
	# Tick 0: the brain thinks while the tick still reads 0, the walk has not moved.
	sim.step()
	assert_eq(log, ["think 0"])
	assert_eq(sim.tick, 1)
	# The walk advances after the brain and before the tick goes up: its step
	# lands in the step where its progress reaches walk_ticks.
	for i in walk_ticks - 2:
		sim.step()
	assert_eq(sim.world.get_character(1).pos, Vector2i(3, 3))
	sim.step()
	assert_eq(sim.world.get_character(1).pos, Vector2i(4, 3))
	assert_eq(sim.tick, walk_ticks)


func test_given_a_brain_that_orders_a_walk_while_it_thinks_when_the_world_is_stepped_one_walk_step_then_the_walk_advanced_in_the_step_it_was_ordered_in() -> void:
	var sim := _sim(1)
	sim.brain.clear_actions()
	sim.brain.add_action("go", func(_id): return 1.0, func(id): sim.movement.order(id, Vector2i(4, 3)))
	sim.brain.attach(1)
	# The brain orders the walk in the first step. With the brains first, that
	# same step counts toward the walk and the tile is reached after walk_step
	# ticks; with the walks first it would take one step more.
	sim.steps(sim.settings.ticks("walk_step"))
	assert_eq(sim.world.get_character(1).pos, Vector2i(4, 3))


func _used_sim(extra_action: bool) -> Sim:
	var w := World.new(30, 30)
	var sim := Sim.new(5, _settings(), w)
	for i in 10:
		w.add_character(Character.new(i + 1), Vector2i(i, 2))
		sim.brain.attach(i + 1)
	if extra_action:
		sim.brain.add_action("extra", func(_id): return 0.1, func(_id): pass)
	sim.sight.rebuild(w._characters.values())
	sim.pathing.can_reach(Vector2i(0, 0), Vector2i(5, 5))
	sim.doors.step()
	sim.steps(50)
	return sim


func test_given_a_sim_whose_parts_were_all_used_for_50_ticks_when_the_last_reference_is_dropped_then_a_weakref_to_it_is_empty() -> void:
	var sim := _used_sim(false)
	var ref: WeakRef = weakref(sim)
	sim = null
	assert_null(ref.get_ref())


func test_given_a_brain_with_extra_actions_when_the_sim_is_dropped_then_it_is_freed_too() -> void:
	var sim := _used_sim(true)
	var ref: WeakRef = weakref(sim)
	sim = null
	assert_null(ref.get_ref())


func test_given_a_sim_still_held_when_it_steps_200_ticks_then_the_state_hash_is_the_same_as_before() -> void:
	var sim := _used_sim(false)
	sim.steps(150)
	assert_eq(sim.tick, 200)
	assert_eq(sim.state_hash(), 1176804854)


func test_headless_server_with_a_tick_limit_of_50_prints_the_tick_count_and_exits_0() -> void:
	var out: Array = []
	var code := OS.execute(OS.get_executable_path(), [
		"--headless", "--path", ProjectSettings.globalize_path("res://"),
		"-s", "res://server/server_main.gd", "--", "--seed=1", "--tick-limit=50",
	], out, true)
	assert_eq(code, 0)
	assert_string_contains(str(out[0]), "ticks: 50")
