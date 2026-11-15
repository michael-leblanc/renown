extends GutTest
# Tests sim/settings.gd: timings are written in seconds and become ticks.

const Settings := preload("res://sim/settings.gd")


func _data(tick_rate: int, seconds: float) -> Dictionary:
	return {
		"tick_rate": tick_rate,
		"timings": {"wait": seconds},
		"values": {"sight_distance": 16},
	}


func test_tick_rate_10_and_2_seconds_is_20_ticks() -> void:
	var s := Settings.from_dict(_data(10, 2.0))
	assert_eq(s.ticks("wait"), 20)


func test_tick_rate_20_and_2_seconds_is_40_ticks() -> void:
	var s := Settings.from_dict(_data(20, 2.0))
	assert_eq(s.ticks("wait"), 40)


func test_fractional_ticks_round_to_nearest_and_never_below_1() -> void:
	assert_eq(Settings.from_dict(_data(10, 0.34)).ticks("wait"), 3, "0.34 s is 3.4 ticks")
	assert_eq(Settings.from_dict(_data(10, 0.36)).ticks("wait"), 4, "0.36 s is 3.6 ticks")
	assert_eq(Settings.from_dict(_data(10, 0.01)).ticks("wait"), 1, "never below 1")
	assert_eq(Settings.from_dict(_data(10, 0.0)).ticks("wait"), 1, "zero is still 1")


func test_missing_setting_fails_with_its_name() -> void:
	var s := Settings.from_dict(_data(10, 2.0))
	s.ticks("no_such_timing")
	assert_push_error("no_such_timing")
	s.value("no_such_value")
	assert_push_error("no_such_value")


func test_plain_values_are_read_as_written() -> void:
	var s := Settings.from_dict(_data(10, 2.0))
	assert_eq(s.value("sight_distance"), 16)


func test_shipped_data_loads_with_a_tick_rate_of_10() -> void:
	var s := Settings.load_file("res://data/settings.json")
	assert_not_null(s)
	assert_eq(s.tick_rate, 10)
	assert_eq(s.ticks("walk_step"), 3, "D185: one tile every 3 ticks")
