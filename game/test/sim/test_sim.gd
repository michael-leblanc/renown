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


func test_headless_server_with_a_tick_limit_of_50_prints_the_tick_count_and_exits_0() -> void:
	var out: Array = []
	var code := OS.execute(OS.get_executable_path(), [
		"--headless", "--path", ProjectSettings.globalize_path("res://"),
		"-s", "res://server/server_main.gd", "--", "--tick-limit=50",
	], out, true)
	assert_eq(code, 0)
	assert_string_contains(str(out[0]), "ticks: 50")
